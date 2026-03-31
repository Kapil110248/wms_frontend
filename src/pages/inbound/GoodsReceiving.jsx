import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Drawer, Space, InputNumber, Progress, Popconfirm, Tooltip, Divider, Typography, Alert, Empty } from 'antd';
import {
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
    DeleteOutlined,
    InboxOutlined,
    FileTextOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    TruckOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    UserOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { formatDate, getStatusColor } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

function grStatusColor(s) {
    const t = (s || '').toLowerCase();
    if (t === 'pending') return 'orange';
    if (t === 'in_progress') return 'blue';
    if (t === 'completed') return 'green';
    return 'default';
}



function calculateRemainingDays(expectedDate) {
    if (!expectedDate) return { days: '-', color: 'text-gray-400' };
    const expected = new Date(expectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expected.setHours(0, 0, 0, 0);
    
    const diffTime = expected - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { days: `${Math.abs(diffDays)} days late`, color: 'text-red-500 font-bold' };
    if (diffDays === 0) return { days: 'Today', color: 'text-orange-500 font-bold' };
    if (diffDays === 1) return { days: '1 day left', color: 'text-blue-500' };
    return { days: `${diffDays} days left`, color: 'text-green-600' };
}

export default function GoodsReceiving() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [receipts, setReceipts] = useState([]);
    const [approvedPOs, setApprovedPOs] = useState([]);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [selectedPOForCreate, setSelectedPOForCreate] = useState(null);
    const [form] = Form.useForm();
    const [receiveForm] = Form.useForm();

    const fetchReceipts = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [poRes, grRes] = await Promise.all([
                apiRequest('/api/purchase-orders', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/goods-receiving', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const poList = Array.isArray(poRes.data) ? poRes.data : [];
            const grList = Array.isArray(grRes?.data) ? grRes.data : [];
            const activePoIds = new Set(grList.map(gr => gr.purchaseOrderId).filter(Boolean));
            
            setApprovedPOs(
                poList
                    .filter((po) => (po.status || '').toLowerCase() === 'approved' && !activePoIds.has(po.id))
                    .map((po) => ({
                        ...po,
                        supplier: po.Supplier ? { name: po.Supplier.name } : { name: '-' },
                    }))
            );
            setReceipts(
                grList.map((gr) => {
                    const items = (gr.GoodsReceiptItems || []).map((i) => ({
                        id: i.id,
                        productId: i.productId,
                        productName: i.productName || i.Product?.name,
                        productSku: i.productSku || i.Product?.sku,
                        expectedQty: i.expectedQty,
                        receivedQty: i.receivedQty,
                        qualityStatus: i.qualityStatus,
                    }));
                    const totalDamaged = items
                        .filter((i) => (i.qualityStatus || '').toUpperCase() === 'DAMAGED')
                        .reduce((s, i) => s + (Number(i.receivedQty) || 0), 0);
                    return {
                        id: gr.id,
                        grNumber: gr.grNumber,
                        poNumber: gr.PurchaseOrder?.poNumber || gr.poNumber || '-',
                        supplier: gr.PurchaseOrder?.Supplier?.name || gr.PurchaseOrder?.supplierName || '-',
                        status: (gr.status || 'pending').toLowerCase(),
                        totalExpected: Number(gr.totalExpected) || 0,
                        totalReceived: Number(gr.totalReceived) || 0,
                        totalDamaged,
                        notes: gr.notes,
                        receivedDate: (gr.status || '').toLowerCase() === 'completed' ? gr.updatedAt : null,
                        items,
                    };
                })
            );
        } catch (_) {
            setApprovedPOs([]);
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const handleCreate = async (values) => {
        if (!token) return;
        try {
            await apiRequest('/api/goods-receiving', {
                method: 'POST',
                body: JSON.stringify({ purchaseOrderId: Number(values.purchaseOrderId), notes: values.notes }),
            }, token);
            message.success('GRN created!');
            setCreateModalOpen(false);
            setSelectedPOForCreate(null);
            form.resetFields();
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create receipt');
        }
    };

    const handleDirectReceive = async (po) => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiRequest('/api/goods-receiving', {
                method: 'POST',
                body: JSON.stringify({ 
                    purchaseOrderId: po.id, 
                    notes: `Autogen from PO #${po.poNumber || po.id}` 
                }),
            }, token);
            
            const grnData = res.data || res;
            
            // Normalize for the receiving modal
            const normalizedItems = (grnData.GoodsReceiptItems || []).map((i) => ({
                id: i.id,
                productId: i.productId,
                productName: i.productName || i.Product?.name,
                productSku: i.productSku || i.Product?.sku,
                expectedQty: i.expectedQty,
                receivedQty: i.receivedQty ?? i.expectedQty,
                qualityStatus: i.qualityStatus || 'GOOD',
            }));

            const formattedGRN = {
                id: grnData.id,
                grNumber: grnData.grNumber,
                poNumber: po.poNumber,
                supplier: po.Supplier?.name || po.supplier?.name || '-',
                status: 'pending',
                items: normalizedItems
            };

            message.success(`GRN ${formattedGRN.grNumber} created. Opening stock intake...`);
            handleOpenReceive(formattedGRN);
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Direct receive failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReceive = (record) => {
        setSelectedReceipt(record);
        setReceiveModalOpen(true);
        setTimeout(() => {
            receiveForm.setFieldsValue({
                items: (record.items || []).map((i) => ({
                    productName: i.productName,
                    productSku: i.productSku,
                    expectedQty: i.expectedQty,
                    receivedQty: i.receivedQty ?? i.expectedQty,
                    qualityStatus: i.qualityStatus || 'GOOD',
                })),
            });
        }, 0);
    };

    const handleReceiveItems = async (values) => {
        if (!selectedReceipt?.id || !token) return;
        try {
            const items = (values.items || []).map((item, idx) => {
                const line = selectedReceipt.items?.[idx];
                return {
                    id: line?.id,
                    productId: line?.productId,
                    receivedQty: item?.receivedQty ?? line?.expectedQty,
                    qualityStatus: item?.qualityStatus || 'GOOD',
                };
            });
            const res = await apiRequest(
                `/api/goods-receiving/${selectedReceipt.id}/receive`,
                { method: 'PUT', body: JSON.stringify({ items }) },
                token
            );
            const data = res?.data ?? res;
            if (data?.stockWarning) message.warning(data.stockWarning, 6);
            if (data?.stockUpdated) {
                message.success(
                    <span>Received quantity added to stock. View: <Link to="/inventory">Stock Overview (Inventory)</Link> or <Link to="/products">Products</Link> → Stock column.</span>,
                    6
                );
            } else {
                message.success('Receipt updated.');
            }
            setReceiveModalOpen(false);
            setSelectedReceipt(null);
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Receipt failed');
        }
    };

    const handleDelete = async (id) => {
        if (!token) {
            message.error('Login required');
            return;
        }
        if (id == null || id === undefined) return;
        try {
            await apiRequest(`/api/goods-receiving/${id}`, { method: 'DELETE' }, token);
            message.success('Goods receipt deleted');
            setViewDrawerOpen(false);
            setSelectedReceipt(null);
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Delete failed');
        }
    };

    const filteredReceipts = receipts.filter((r) => {
        if (statusFilter != null && statusFilter !== '') {
            if (r.status !== statusFilter) return false;
        }
        if (searchText.trim()) {
            const q = searchText.toLowerCase().trim();
            const match =
                (r.grNumber || '').toLowerCase().includes(q) ||
                (r.poNumber || '').toLowerCase().includes(q) ||
                (r.supplier || '').toLowerCase().includes(q);
            if (!match) return false;
        }
        return true;
    });

    const pendingCount = receipts.filter((r) => r.status === 'pending').length;
    const inProgressCount = receipts.filter((r) => r.status === 'in_progress').length;
    const completedCount = receipts.filter((r) => r.status === 'completed').length;
    const itemsReceivedTotal = receipts.reduce((s, r) => s + r.totalReceived, 0);

    const columns = [
        {
            title: 'GRN Number',
            dataIndex: 'grNumber',
            key: 'grNumber',
            width: 130,
            sorter: (a, b) => (a.grNumber || '').localeCompare(b.grNumber || ''),
            render: (v) => (
                <span className="font-medium text-blue-600 cursor-pointer hover:underline">{v}</span>
            ),
        },
        { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 120 },
        { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 140 },
        {
            title: 'Products',
            key: 'products',
            width: 200,
            ellipsis: true,
            render: (_, r) => {
                const names = (r.items || []).map((i) => i.productName || i.productSku || `#${i.productId}`).filter(Boolean);
                if (names.length === 0) return '—';
                if (names.length <= 2) return names.join(', ');
                return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
            },
        },
        {
            title: 'Expected (units)',
            dataIndex: 'totalExpected',
            key: 'expected',
            width: 100,
            align: 'center',
            render: (v, r) => (
                <Space size="small">
                    <Tag color="blue" className="m-0">
                        {v ?? 0}
                    </Tag>
                    <Tooltip title="Expected item count for this receipt">
                        <InfoCircleOutlined className="text-gray-400 cursor-help" />
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: 'Received (units)',
            dataIndex: 'totalReceived',
            key: 'received',
            width: 160,
            render: (v, r) => {
                const total = r.totalExpected || 0;
                const pct = total ? Math.round((Number(v) / total) * 100) : 0;
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-600">{v ?? 0} / {total}</span>
                        <Progress
                            percent={pct}
                            size="small"
                            status={pct >= 100 ? 'success' : 'active'}
                            strokeColor={pct >= 100 ? undefined : '#fa8c16'}
                        />
                    </div>
                );
            },
        },
        {
            title: 'Damaged',
            dataIndex: 'totalDamaged',
            key: 'damaged',
            width: 90,
            align: 'center',
            render: (v) => v ?? 0,
        },
        {
            title: 'Received Date',
            dataIndex: 'receivedDate',
            key: 'receivedDate',
            width: 130,
            render: (v) => (v ? formatDate(v) : 'Not received'),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (s) => (
                <Tag color={grStatusColor(s)} className="uppercase font-medium">
                    {s === 'in_progress' ? 'In Progress' : s}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small" wrap onClick={(e) => e.stopPropagation()}>
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        className="text-blue-600 p-0"
                        onClick={() => {
                            setSelectedReceipt(record);
                            setViewDrawerOpen(true);
                        }}
                    >
                        View
                    </Button>
                    {record.status !== 'completed' && (
                        <Button
                            type="link"
                            size="small"
                            icon={<FileTextOutlined />}
                            className="text-blue-600 p-0"
                            onClick={() => handleOpenReceive(record)}
                        >
                            Receive
                        </Button>
                    )}
                    {record.status !== 'completed' && (
                        <Button
                            type="link"
                            size="small"
                            icon={<CloseCircleOutlined />}
                            className="text-orange-600 p-0"
                            onClick={() => handleOpenReceive(record)}
                        >
                            Mark as Damaged
                        </Button>
                    )}
                    <Popconfirm
                        title="Cancel this goods receipt?"
                        okText="Yes"
                        cancelText="No"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button type="link" size="small" danger className="p-0">
                            Cancel
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title="Delete this goods receipt?"
                        okText="Yes"
                        cancelText="No"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-green-600">Goods Receiving</h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Receive and process incoming inventory from purchase orders
                        </p>
                    </div>
                    <Button
                        type="primary"
                        icon={<TruckOutlined />}
                        className="bg-blue-600 border-blue-600 rounded-lg"
                        onClick={() => {
                            fetchReceipts();
                            setCreateModalOpen(true);
                        }}
                    >
                        Receive Goods
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Pending</div>
                        <div className="text-xl font-medium text-orange-600">{pendingCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">In Progress</div>
                        <div className="text-xl font-medium text-blue-600">{inProgressCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Completed</div>
                        <div className="text-xl font-medium text-green-600">{completedCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Items Received</div>
                        <div className="text-xl font-medium text-purple-600">{itemsReceivedTotal}</div>
                    </Card>
                </div>

                <div className="h-4" />

                {/* Approved Orders Section - Ready to Receive */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                <ClockCircleOutlined className="text-lg" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 m-0 leading-none">Ready to Receive</h2>
                                <p className="text-gray-400 text-[11px] mt-1 uppercase tracking-wider font-semibold">Approved Purchase Orders awaiting intake</p>
                            </div>
                        </div>
                        {approvedPOs.length > 0 && (
                            <Tag color="blue" className="rounded-full px-4 border-blue-200 text-blue-600 font-bold py-0.5 shadow-sm">
                                {approvedPOs.length} ACTIVE ORDERS
                            </Tag>
                        )}
                    </div>
                    
                    {approvedPOs.length === 0 ? (
                        <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-gray-100 text-center shadow-sm">
                            <Empty 
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <div className="space-y-1">
                                        <p className="text-gray-500 font-medium">No pending approved orders</p>
                                        <p className="text-gray-400 text-xs">All approved POs have been received or are in progress</p>
                                    </div>
                                } 
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {approvedPOs.map((po) => {
                                const { days, color } = calculateRemainingDays(po.expectedDelivery);
                                return (
                                    <Card 
                                        key={po.id} 
                                        className="rounded-2xl shadow-sm hover:shadow-md transition-all border-gray-200 group relative overflow-hidden bg-white"
                                        bodyStyle={{ padding: '20px' }}
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-8 -mt-8 -z-0 transition-all group-hover:scale-110" />
                                        
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-5">
                                                <div>
                                                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest block mb-1">PO Number</span>
                                                    <span className="font-mono font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors uppercase">{po.poNumber}</span>
                                                </div>
                                                <Button 
                                                    type="primary" 
                                                    size="middle" 
                                                    icon={<TruckOutlined />}
                                                    className="bg-blue-600 hover:bg-blue-700 border-none rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
                                                    loading={loading}
                                                    onClick={() => handleDirectReceive(po)}
                                                >
                                                    Receive PO
                                                </Button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs shrink-0 border border-gray-100">
                                                        <UserOutlined className="text-blue-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Supplier</div>
                                                        <div className="text-sm font-bold text-gray-700 truncate">{po.supplier?.name || po.Supplier?.name || 'Unknown Supplier'}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 transition-all group-hover:bg-white group-hover:border-blue-100">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Due Date</div>
                                                        <div className="text-xs font-bold text-gray-700 flex items-center gap-2">
                                                            <CalendarOutlined className="text-blue-400" />
                                                            {po.expectedDelivery ? formatDate(po.expectedDelivery) : 'Not set'}
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 transition-all group-hover:bg-white group-hover:border-blue-100">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Remaining</div>
                                                        <div className={`text-xs font-bold flex items-center gap-2 ${color}`}>
                                                            <ClockCircleOutlined />
                                                            {days}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Items Count</span>
                                                    <span className="text-sm font-bold text-gray-700">{(po.PurchaseOrderItems || []).length} Products</span>
                                                </div>
                                                <div className="bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                                    <span className="text-green-600 font-bold text-sm">₹{Number(po.totalAmount || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="h-6" />

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
                        <Search
                            placeholder="Search by GRN, PO, or supplier..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="max-w-xs rounded-lg"
                            prefix={<SearchOutlined className="text-blue-500" />}
                            allowClear
                        />
                        <Select
                            placeholder="All Status"
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="w-40 rounded-lg"
                            options={[
                                { value: 'pending', label: 'Pending' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'completed', label: 'Completed' },
                            ]}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchReceipts}
                            loading={loading}
                            className="rounded-lg"
                        >
                            Refresh
                        </Button>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filteredReceipts}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            showSizeChanger: true,
                            showTotal: (t) => `Total ${t} records`,
                            pageSize: 10,
                        }}
                        scroll={{ x: 1100 }}
                        className="[&_.ant-table-thead_th]:font-normal"
                    />
                </Card>

                {/* Create GRN Modal */}
                <Modal
                    title="Receive Goods"
                    open={createModalOpen}
                    onCancel={() => { setCreateModalOpen(false); setSelectedPOForCreate(null); }}
                    footer={null}
                    width={560}
                    className="rounded-xl"
                >
                    <Form form={form} layout="vertical" onFinish={handleCreate} className="pt-2">
                        <Form.Item
                            label="Purchase Order"
                            name="purchaseOrderId"
                            rules={[{ required: true, message: 'Select an approved PO' }]}
                        >
                            <Select
                                placeholder="Select approved PO to receive (PO number, supplier & product names shown)"
                                className="rounded-lg w-full"
                                optionLabelProp="label"
                                onChange={(val) => {
                                    const po = approvedPOs.find((p) => p.id === val);
                                    setSelectedPOForCreate(po || null);
                                }}
                            >
                                {approvedPOs.map((po) => {
                                    const supplierName = po.supplier?.name || po.Supplier?.name || '-';
                                    const names = (po.PurchaseOrderItems || []).map((i) => i.productName || i.Product?.name || i.productSku || i.Product?.sku || `#${i.productId}`).filter(Boolean);
                                    const productLabel = names.length ? names.join(', ') : 'No products';
                                    const shortLabel = `${po.poNumber || po.id} - ${supplierName} · ${(po.PurchaseOrderItems || []).length} items`;
                                    return (
                                        <Option key={po.id} value={po.id} label={shortLabel}>
                                            <div className="py-0.5">
                                                <div className="font-medium text-gray-900">{po.poNumber || po.id} — {supplierName}</div>
                                                <div className="text-xs text-gray-600 mt-0.5">Products: {productLabel}</div>
                                            </div>
                                        </Option>
                                    );
                                })}
                            </Select>
                        </Form.Item>
                        {selectedPOForCreate && (selectedPOForCreate.PurchaseOrderItems || []).length > 0 && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-xs font-medium text-gray-500 uppercase mb-2">Products in this PO (will be received)</div>
                                <ul className="space-y-1.5 text-sm text-gray-800">
                                    {(selectedPOForCreate.PurchaseOrderItems || []).map((item, idx) => (
                                        <li key={item.id || idx} className="flex justify-between">
                                            <span className="font-medium">{item.productName || item.Product?.name || `Product #${item.productId}`}</span>
                                            <span className="text-gray-500">SKU: {item.productSku || item.Product?.sku || '—'} · Qty: {item.quantity ?? 0}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <Form.Item label="Notes (Optional)" name="notes">
                            <Input.TextArea rows={3} placeholder="Add any notes..." className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => setCreateModalOpen(false)} className="rounded-lg">
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">
                                Create GRN
                            </Button>
                        </div>
                    </Form>
                </Modal>

                {/* Receive Items Modal */}
                <Modal
                    key={selectedReceipt?.id || 'receive'}
                    title={`Receive: ${selectedReceipt?.grNumber || ''}`}
                    open={receiveModalOpen}
                    onCancel={() => {
                        setReceiveModalOpen(false);
                        receiveForm.resetFields();
                        setSelectedReceipt(null);
                    }}
                    onOk={() => receiveForm.submit()}
                    okText="Add to Stock"
                    width={720}
                    className="rounded-xl"
                >
                    <div className="mb-4">
                        <Input
                            placeholder="Scan Barcode / SKU and press Enter..."
                            prefix={<SearchOutlined className="text-blue-500" />}
                            className="rounded-lg border-blue-200"
                            autoFocus
                            onPressEnter={(e) => {
                                e.preventDefault();
                                const scanVal = e.target.value.trim().toUpperCase();
                                if (!scanVal) return;
                                
                                const items = receiveForm.getFieldValue('items') || [];
                                let foundIndex = -1;
                                
                                // Enhanced Search: Check SKU, Product Name, or ID
                                items.forEach((item, idx) => {
                                    const pName = (item.productName || '').toUpperCase();
                                    const pSku = (item.productSku || '').toUpperCase();
                                    if (pSku === scanVal || pName === scanVal || pSku.includes(scanVal) || scanVal === String(item.productId)) {
                                        foundIndex = idx;
                                    }
                                });

                                if (foundIndex !== -1) {
                                    const currentQty = items[foundIndex].receivedQty || 0;
                                    const newQty = currentQty + 1;
                                    
                                    // Update Form
                                    const newItems = [...items];
                                    newItems[foundIndex] = { ...newItems[foundIndex], receivedQty: newQty };
                                    receiveForm.setFieldsValue({ items: newItems });
                                    
                                    message.success(`Scanned: ${items[foundIndex].productSku || 'Product'} (+1)`);
                                    e.target.value = ''; // Clear for next scan
                                } else {
                                    message.error('Product not found in this receipt');
                                    // Optional: Play error sound here
                                }
                            }}
                        />
                    </div>
                    <Form form={receiveForm} layout="vertical" onFinish={handleReceiveItems} className="pt-2">
                        <Form.List name="items">
                            {(fields) => (
                                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                                    {fields.map(({ key, name, ...restField }) => {
                                       const itemVal = receiveForm.getFieldValue(['items', name]);
                                       const isComplete = (itemVal?.receivedQty || 0) >= (itemVal?.expectedQty || 0);
                                       return (
                                        <div
                                            key={key}
                                            className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${isComplete ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800">
                                                    {itemVal?.productName || selectedReceipt?.items?.[name]?.productName || selectedReceipt?.items?.[name]?.productSku || `Product #${selectedReceipt?.items?.[name]?.productId ?? ''}`}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    SKU: {itemVal?.productSku || selectedReceipt?.items?.[name]?.productSku || '—'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500 font-medium">Expected (units)</div>
                                                    <div className="font-medium">
                                                        {itemVal?.expectedQty}
                                                    </div>
                                                </div>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'receivedQty']}
                                                    className="mb-0"
                                                    label={<span className="text-xs">Received Quantity</span>}
                                                >
                                                    <InputNumber min={0} className="w-20 rounded-lg" />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'qualityStatus']}
                                                    className="mb-0"
                                                    label={<span className="text-xs">Condition</span>}
                                                >
                                                    <Select className="w-28 rounded-lg" size="small">
                                                        <Option value="GOOD">Good</Option>
                                                        <Option value="DAMAGED">Damaged</Option>
                                                    </Select>
                                                </Form.Item>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </Form.List>
                    </Form>
                </Modal>

                {/* View Drawer */}
                <Drawer
                    title={`GRN: ${selectedReceipt?.grNumber}`}
                    width={560}
                    open={viewDrawerOpen}
                    onClose={() => setViewDrawerOpen(false)}
                    className="rounded-l-3xl"
                    destroyOnClose
                >
                    {selectedReceipt && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <Tag color={grStatusColor(selectedReceipt.status)} className="uppercase">
                                    {selectedReceipt.status === 'in_progress' ? 'In Progress' : selectedReceipt.status}
                                </Tag>
                                <span className="text-gray-500 text-sm">
                                    {selectedReceipt.receivedDate
                                        ? formatDate(selectedReceipt.receivedDate)
                                        : 'Not received'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">PO Number</div>
                                    <div className="font-medium text-gray-800">{selectedReceipt.poNumber}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Supplier</div>
                                    <div className="font-medium text-gray-800">{selectedReceipt.supplier}</div>
                                </div>
                            </div>
                            <Divider className="my-2" />
                            <Title level={5} className="!mb-3">
                                Line Items
                            </Title>
                            <Table
                                dataSource={selectedReceipt.items || []}
                                size="small"
                                pagination={false}
                                rowKey="id"
                                columns={[
                                    { title: 'Product', dataIndex: 'productName', key: 'productName', render: (v, r) => v || r.productSku || `#${r.productId}` },
                                    { title: 'SKU', dataIndex: 'productSku', key: 'productSku', width: 100 },
                                    {
                                        title: 'Expected (units)',
                                        dataIndex: 'expectedQty',
                                        key: 'expectedQty',
                                        width: 100,
                                        align: 'center',
                                    },
                                    {
                                        title: 'Received (units)',
                                        dataIndex: 'receivedQty',
                                        key: 'receivedQty',
                                        width: 110,
                                        align: 'center',
                                    },
                                    {
                                        title: 'Condition',
                                        dataIndex: 'qualityStatus',
                                        key: 'qualityStatus',
                                        width: 90,
                                        render: (v) => (
                                            <Tag color={v === 'DAMAGED' ? 'red' : 'green'}>{v || '—'}</Tag>
                                        ),
                                    },
                                ]}
                            />
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="text-gray-600 font-medium">Total received</span>
                                <span className="font-semibold">
                                    {selectedReceipt.totalReceived} / {selectedReceipt.totalExpected}
                                </span>
                            </div>
                            {selectedReceipt.notes && (
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Notes</div>
                                    <div className="text-sm text-gray-700">{selectedReceipt.notes}</div>
                                </div>
                            )}
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
