import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Tabs, Card, Input, InputNumber, Space, Modal, Form, Select, DatePicker, Drawer, Alert, Popconfirm, message, Tooltip } from 'antd';
import {
    PlusOutlined, InboxOutlined, CheckCircleOutlined, WarningOutlined, StopOutlined,
    SearchOutlined, ExportOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, HomeOutlined, EnvironmentOutlined, ClockCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatNumber } from '../utils';

dayjs.extend(relativeTime);

const { Search } = Input;
const { Option } = Select;

function normalizeStock(item) {
    return {
        ...item,
        product: item.Product || item.product,
        warehouse: item.Warehouse || item.warehouse,
        location: item.Location || item.location,
        isVirtual: !!item.isVirtual,
        virtualQuantity: item.virtualQuantity != null ? parseFloat(item.virtualQuantity) : null,
    };
}

export default function Inventory() {
    const { token } = useAuthStore();
    const [inventory, setInventory] = useState([]);
    const [adjustmentMap, setAdjustmentMap] = useState({}); // { productId: { totalIn, totalOut } }
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const selectedWarehouseId = Form.useWatch('warehouseId', form);

    const fetchInventory = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const [stockData, adjData] = await Promise.all([
                apiRequest('/api/inventory/stock', { method: 'GET' }, token),
                apiRequest('/api/inventory/adjustments?limit=5000', { method: 'GET' }, token),
            ]);
            const list = Array.isArray(stockData.data) ? stockData.data : [];
            setInventory(list.map(normalizeStock));

            // Build per-product adjustment totals
            const adjs = Array.isArray(adjData.data) ? adjData.data : [];
            const map = {};
            adjs.forEach(a => {
                const pid = a.productId;
                const wid = a.warehouseId;
                if (!pid || !wid) return;
                const key = `${pid}-${wid}`;
                if (!map[key]) map[key] = { totalIn: 0, totalOut: 0 };
                const qty = parseFloat(a.quantity || 0);
                if (a.type === 'INCREASE') map[key].totalIn = Math.round((map[key].totalIn + qty) * 1e12) / 1e12;
                else if (a.type === 'DECREASE') map[key].totalOut = Math.round((map[key].totalOut + qty) * 1e12) / 1e12;
            });
            setAdjustmentMap(map);
        } catch (err) {
            setError(err.message || 'Failed to load stock');
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchDependencies = useCallback(async () => {
        if (!token) return;
        try {
            const [prodRes, whRes, locRes] = await Promise.all([
                apiRequest('/api/inventory/products', { method: 'GET' }, token),
                apiRequest('/api/warehouses', { method: 'GET' }, token),
                apiRequest('/api/locations', { method: 'GET' }, token),
            ]);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
            setLocations(Array.isArray(locRes.data) ? locRes.data : []);
        } catch (_) {
            setProducts([]);
            setWarehouses([]);
            setLocations([]);
        }
    }, [token]);

    useEffect(() => {
        fetchInventory();
        fetchDependencies();
    }, [fetchInventory, fetchDependencies]);

    const locationsByWarehouse = selectedWarehouseId
        ? locations.filter(l => (l.Zone && l.Zone.warehouseId === selectedWarehouseId) || l.warehouseId === selectedWarehouseId)
        : locations;

    const matchesSearch = (item) => !searchText ||
        item.product?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.lotNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (item.batchNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
        String(item.quantity || '').includes(searchText);

    const filteredInventory = inventory.filter((item) => {
        if (!matchesSearch(item)) return false;
        const qty = parseFloat(item.quantity || 0);
        const available = qty - parseFloat(item.reserved || 0);
        if (activeTab === 'in_stock') return available > 0;
        if (activeTab === 'low_stock') return available > 0 && available <= 50;
        if (activeTab === 'out_of_stock') return available <= 0;
        if (activeTab === 'expiring') return item.bestBeforeDate && new Date(item.bestBeforeDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return true;
    });

    const totalUnits = inventory.reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
    const totalAvailable = inventory.reduce((s, i) => s + Math.max(0, parseFloat(i.quantity || 0) - parseFloat(i.reserved || 0)), 0);
    const totalReserved = inventory.reduce((s, i) => s + parseFloat(i.reserved || 0), 0);
    const allItemsCount = inventory.filter(matchesSearch).length;

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            setError(null);
            const payload = {
                productId: values.productId,
                warehouseId: values.warehouseId,
                locationId: values.locationId || null,
                quantity: values.quantity ?? 0,
                reserved: values.reserved ?? 0,
                status: values.status || 'ACTIVE',
                lotNumber: values.lotNumber || null,
                batchNumber: values.batchNumber || null,
                serialNumber: values.serialNumber || null,
                bestBeforeDate: values.bestBeforeDate ? dayjs(values.bestBeforeDate).format('YYYY-MM-DD') : null,
            };
            if (selectedInventory) {
                await apiRequest(`/api/inventory/stock/${selectedInventory.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                setModalOpen(false);
                setSelectedInventory(null);
                fetchInventory();
            } else {
                await apiRequest('/api/inventory/stock', { method: 'POST', body: JSON.stringify(payload) }, token);
                setModalOpen(false);
                form.resetFields();
                fetchInventory();
            }
        } catch (err) {
            setError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleProductChange = (productId) => {
        if (!productId) return;
        const product = products.find(p => p.id === productId);
        if (product && product.ProductStocks && product.ProductStocks.length > 0) {
            // Find the first warehouse that has this product
            const warehouseId = product.ProductStocks[0].warehouseId;
            if (warehouseId) {
                form.setFieldsValue({ warehouseId });
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/inventory/stock/${id}`, { method: 'DELETE' }, token);
            message.success('Record deleted');
            fetchInventory();
        } catch (err) {
            message.error(err?.message || 'Delete failed');
        }
    };

    const setFormValues = (record) => {
        form.setFieldsValue({
            productId: record.productId ?? record.Product?.id ?? record.product?.id,
            warehouseId: record.warehouseId ?? record.Warehouse?.id ?? record.warehouse?.id,
            locationId: record.locationId ?? record.Location?.id ?? record.location?.id,
            quantity: record.quantity,
            reserved: record.reserved ?? 0,
            status: record.status || 'ACTIVE',
            lotNumber: record.lotNumber,
            batchNumber: record.batchNumber,
            serialNumber: record.serialNumber,
            bestBeforeDate: record.bestBeforeDate ? dayjs(record.bestBeforeDate) : undefined,
        });
    };

    const inventoryColumns = [
        { title: 'Product SKU', dataIndex: ['product', 'sku'], key: 'sku', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Product Name', dataIndex: ['product', 'name'], key: 'name', width: 200, render: (v, r) => <span className="flex items-center gap-2"><InboxOutlined className="text-gray-400" />{v || '—'}{r.isVirtual && <Tag color="purple" bordered={false} className="text-[9px] px-1 ml-1 font-bold">BUNDLE</Tag>}</span> },
        { title: 'Warehouse', dataIndex: ['warehouse', 'name'], key: 'warehouse', width: 150, render: (v, r) => r.isVirtual ? <Tag color="blue" bordered={false} className="text-[10px]">VIRTUAL</Tag> : (r.warehouse ? <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{r.warehouse.name}</span> : '—') },
        { title: 'Location', key: 'location', width: 120, render: (_, r) => r.isVirtual ? '—' : (r.location ? <span className="flex items-center gap-2"><EnvironmentOutlined className="text-gray-400" />{r.location.name || r.location.code || '—'}</span> : '—') },
        {
            title: <Tooltip title="Total quantity added (Initial Stock + Manual Additions + Returns)"><span className="cursor-help">Stock IN <InfoCircleOutlined className="text-gray-400 text-xs" /></span></Tooltip>,
            key: 'stockIn', width: 120, align: 'right',
            render: (_, r) => {
                const key = `${r.productId}-${r.warehouseId}`;
                const adj = adjustmentMap[key] || { totalIn: 0, totalOut: 0 };
                return <><span className="font-bold text-emerald-600">{formatNumber(adj.totalIn)}</span> <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">{r.product?.unitOfMeasure || 'EACH'}</span></>;
            }
        },
        {
            title: <Tooltip title="Total quantity removed (Sales + Manual Decreases + Waste)"><span className="cursor-help">Stock OUT <InfoCircleOutlined className="text-gray-400 text-xs" /></span></Tooltip>,
            key: 'stockOut', width: 120, align: 'right',
            render: (_, r) => {
                const key = `${r.productId}-${r.warehouseId}`;
                const adj = adjustmentMap[key] || { totalIn: 0, totalOut: 0 };
                return <><span className="font-bold text-rose-500">{formatNumber(adj.totalOut)}</span> <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">{r.product?.unitOfMeasure || 'EACH'}</span></>;
            }
        },
        {
            render: (_, r) => (
                <div className="flex flex-col items-end">
                    <span className="font-bold text-blue-600">
                        {formatNumber(Math.max(0, (r.quantity || 0) - (r.reserved || 0)))}
                    </span>
                    {r.virtualQuantity != null && (
                        <span className="text-[10px] text-blue-500 font-bold">
                            Virt: {formatNumber(r.virtualQuantity)}
                        </span>
                    )}
                    <span className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">
                        {r.product?.unitOfMeasure || 'EACH'}
                    </span>
                </div>
            )
        },
        {
            title: 'Stock Status',
            key: 'stockStatus',
            width: 120,
            render: (_, record) => {
                const available = Math.max(0, (record.quantity || 0) - (record.reserved || 0));
                let color = 'green';
                let text = 'In Stock';
                if (available <= 0) {
                    color = 'red';
                    text = 'Out of Stock';
                } else if (available <= 50) {
                    color = 'orange';
                    text = 'Low Stock';
                }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        { 
            title: 'Last Movement', 
            dataIndex: 'updatedAt', 
            key: 'updatedAt', 
            width: 140, 
            render: (v) => v ? (
                <Tooltip title={dayjs(v).format('DD MMM YYYY, HH:mm')}>
                    <span className="text-xs text-gray-500 cursor-help flex items-center gap-1">
                        <ClockCircleOutlined /> {dayjs(v).fromNow()}
                    </span>
                </Tooltip>
            ) : '—' 
        },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v || 'ACTIVE'}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            width: 140,
            render: (_, record) => (
                <Space>
                    <Tooltip title="View Details">
                        <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedInventory(record); setViewMode(true); setModalOpen(true); setFormValues(record); }} />
                    </Tooltip>
                    {!record.isVirtual && (
                        <>
                            <Tooltip title="Edit Stock">
                                <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedInventory(record); setViewMode(false); setFormValues(record); setModalOpen(true); }} />
                            </Tooltip>
                            <Tooltip title="Delete Record">
                                <Popconfirm title="Delete this record?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                            </Tooltip>
                        </>
                    )}
                </Space>
            )
        }
    ];

    const getRowClassName = (record) => {
        const qty = record.quantity || 0;
        const available = qty - (record.reserved || 0);
        
        if (available <= 0) return 'bg-red-50 hover:bg-red-100 transition-colors';
        if (available <= 50) return 'bg-yellow-50 hover:bg-yellow-100 transition-colors'; // Low stock threshold (configurable later)
        return 'hover:bg-gray-50 transition-colors';
    };

    return (
        <MainLayout>
            <div className={`p-2 md:p-6 space-y-6 animate-in fade-in duration-500 pb-12`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-medium text-blue-600">Inventory Management</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-0.5">
                            <Tooltip title="Total units ever added across all warehouses">Added: <strong>{formatNumber(totalUnits + Object.values(adjustmentMap).reduce((s, a) => s + (a.totalOut || 0), 0))}</strong></Tooltip>
                            {' | '}
                            <Tooltip title="Total units currently physical - Reserved">Avail: <strong>{formatNumber(totalAvailable)}</strong></Tooltip>
                            {' | '}
                            <Tooltip title="Items held for pending orders">Resv: <strong>{formatNumber(totalReserved)}</strong></Tooltip>
                        </p>
                    </div>
                    <Space wrap className="w-full md:w-auto">
                        <Button icon={<ReloadOutlined />} onClick={fetchInventory} className="flex-1 md:flex-none">Refresh</Button>
                        <Button icon={<ExportOutlined />} className="flex-1 md:flex-none" onClick={async () => {
                            if (!inventory.length) return message.warning('No data to export');
                            const format = await new Promise(resolve => {
                                Modal.confirm({
                                    title: 'Export Inventory',
                                    content: 'Select export format:',
                                    okText: 'PDF',
                                    cancelText: 'CSV',
                                    onOk: () => resolve('PDF'),
                                    onCancel: () => resolve('CSV')
                                });
                            });

                            if (format === 'CSV') {
                                const headers = ['Product Name', 'SKU', 'Warehouse', 'Location', 'Quantity', 'Reserved', 'Available', 'Status', 'Last Updated'];
                                const csvContent = [
                                    headers.join(','),
                                    ...filteredInventory.map(item => [
                                        `"${item.product?.name || ''}"`,
                                        `"${item.product?.sku || ''}"`,
                                        `"${item.warehouse?.name || ''}"`,
                                        `"${item.location?.name || item.location?.code || ''}"`,
                                        item.quantity || 0,
                                        item.reserved || 0,
                                        Math.max(0, (item.quantity || 0) - (item.reserved || 0)),
                                        item.status || 'ACTIVE',
                                        item.updatedAt ? new Date(item.updatedAt).toISOString() : ''
                                    ].join(','))
                                ].join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
                                link.click();
                            } else {
                                // PDF Export via backend (creates a temporary report)
                                try {
                                    message.loading({ content: 'Generating PDF...', key: 'pdf' });
                                    const res = await apiRequest('/api/reports', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            reportType: 'INVENTORY',
                                            reportName: `Inventory Export ${new Date().toLocaleDateString()}`,
                                            format: 'PDF'
                                        })
                                    }, token);
                                    
                                    if (res?.data?.id) {
                                        const downloadRes = await fetch(`/api/reports/${res.data.id}/download`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        const blob = await downloadRes.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.pdf`;
                                        a.click();
                                        message.success({ content: 'PDF Downloaded', key: 'pdf' });
                                    }
                                } catch (err) {
                                    message.error({ content: 'Failed to generate PDF', key: 'pdf' });
                                }
                            }
                        }}>Export</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg w-full md:w-auto" onClick={() => { setSelectedInventory(null); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                            Add Inventory
                        </Button>
                    </Space>
                </div>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="[&_.ant-tabs-tab]:font-normal"
                    items={[
                        { key: 'all', label: <>All Items ({allItemsCount})</>, icon: <InboxOutlined /> },
                        { key: 'in_stock', label: <>In Stock ({inventory.filter(i => ((i.quantity || 0) - (i.reserved || 0)) > 0).length})</>, icon: <CheckCircleOutlined /> },
                        { key: 'low_stock', label: <>Low Stock ({inventory.filter(i => { const a = (i.quantity || 0) - (i.reserved || 0); return a > 0 && a <= 50; }).length})</>, icon: <WarningOutlined /> },
                        { key: 'out_of_stock', label: <>Out of Stock ({inventory.filter(i => ((i.quantity || 0) - (i.reserved || 0)) <= 0).length})</>, icon: <StopOutlined /> },
                        { key: 'expiring', label: <>Expiring Soon ({inventory.filter(i => i.bestBeforeDate && new Date(i.bestBeforeDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length})</>, icon: <WarningOutlined /> },
                    ]}
                />

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <div className="p-3 md:p-6">
                        <div className="mb-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                            <Search placeholder="Search name, SKU, lot..." className="w-full md:max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 bg-green-50 px-2 py-1 rounded border border-green-100">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Good
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Low
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Out
                                </div>
                            </div>
                        </div>
                        <Table
                            dataSource={filteredInventory}
                            columns={inventoryColumns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} items`, pageSize: 50 }}
                            scroll={{ x: 'max-content', y: 800 }}
                            className="[&_.ant-table-thead_th]:font-normal"
                            rowClassName={getRowClassName}
                        />
                    </div>
                </Card>

                <Drawer title="Inventory Details" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={typeof window !== 'undefined' && window.innerWidth < 500 ? '100%' : 480}>
                    {selectedInventory && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-gray-900">{selectedInventory.product?.name}</h2>
                            <Tag color="blue">{selectedInventory.product?.sku}</Tag>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xl font-medium">{formatNumber(selectedInventory.quantity)} <span className="text-xs text-gray-400 uppercase">{selectedInventory.product?.unitOfMeasure || 'EACH'}</span></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Available</div>
                                    <div className="text-xl font-medium">{formatNumber(Math.max(0, (selectedInventory.quantity || 0) - (selectedInventory.reserved || 0)))} <span className="text-xs text-gray-400 uppercase">{selectedInventory.product?.unitOfMeasure || 'EACH'}</span></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Location</div>
                                    <div className="text-xl font-medium">{selectedInventory.location?.name || selectedInventory.location?.code || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Last Moved</div>
                                    <div className="text-xl font-medium text-sm pt-1">{selectedInventory.updatedAt ? dayjs(selectedInventory.updatedAt).fromNow() : '—'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>

                <Modal
                    title={viewMode ? 'View Inventory' : selectedInventory ? 'Edit record' : 'Add Inventory'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedInventory(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedInventory(null); }}>Close</Button>] : undefined}
                    width={560}
                >
                    {error && <Alert type="error" message={error} className="mb-4" />}
                    {viewMode && selectedInventory ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Product</div><div className="text-gray-900">{selectedInventory.product?.name} ({selectedInventory.product?.sku})</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse</div><div className="text-gray-900">{selectedInventory.warehouse?.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Location</div><div className="text-gray-900">{(selectedInventory.location?.name || selectedInventory.location?.code) ?? '—'}</div></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Quantity</div><div className="text-gray-900">{formatNumber(selectedInventory.quantity)} <span className="text-[10px] text-gray-400 uppercase">{selectedInventory.product?.unitOfMeasure || 'EACH'}</span></div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Available</div><div className="text-gray-900">{formatNumber(Math.max(0, (selectedInventory.quantity || 0) - (selectedInventory.reserved || 0)))} <span className="text-[10px] text-gray-400 uppercase">{selectedInventory.product?.unitOfMeasure || 'EACH'}</span></div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Reserved</div><div className="text-gray-900">{formatNumber(selectedInventory.reserved)} <span className="text-[10px] text-gray-400 uppercase">{selectedInventory.product?.unitOfMeasure || 'EACH'}</span></div></div>
                            </div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Status</div><div className="text-gray-900">{selectedInventory.status ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Lot Number</div><div className="text-gray-900">{selectedInventory.lotNumber ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Batch Number</div><div className="text-gray-900">{selectedInventory.batchNumber ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Serial Number</div><div className="text-gray-900">{selectedInventory.serialNumber ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Best Before Date</div><div className="text-gray-900">{selectedInventory.bestBeforeDate ? dayjs(selectedInventory.bestBeforeDate).format('DD/MM/YYYY') : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Last Updated</div><div className="text-gray-900">{selectedInventory.updatedAt ? dayjs(selectedInventory.updatedAt).format('DD MMM YYYY HH:mm') : '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            <Form.Item label="Product" name="productId" rules={[{ required: true, message: 'Select product' }]}>
                                <Select placeholder="Select product" className="rounded-lg" disabled={!!selectedInventory} showSearch onChange={handleProductChange} optionFilterProp="label" options={products.map(p => ({ label: `${p.name} (${p.sku})`, value: p.id }))} />
                            </Form.Item>
                            <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select warehouse' }]}>
                                <Select placeholder="Select warehouse" className="rounded-lg" disabled={!!selectedInventory} onChange={() => form.setFieldValue('locationId', undefined)} options={warehouses.map(w => ({ label: w.name, value: w.id }))} />
                            </Form.Item>
                            <Form.Item label="Location" name="locationId">
                                <Select placeholder="Select location (optional)" className="rounded-lg" allowClear disabled={!!selectedInventory} options={locationsByWarehouse.map(l => ({ label: l.name || l.code || l.id, value: l.id }))} />
                            </Form.Item>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item label="Quantity" name="quantity" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber className="w-full rounded-lg" min={0} stringMode formatter={value => value ? `${value}`.replace(/(\.\d+?)0+$/, '$1').replace(/\.$/, '') : value} />
                                </Form.Item>
                                <Form.Item label="Reserved" name="reserved">
                                    <InputNumber className="w-full rounded-lg" min={0} stringMode formatter={value => value ? `${value}`.replace(/(\.\d+?)0+$/, '$1').replace(/\.$/, '') : value} />
                                </Form.Item>
                            </div>
                            <p className="text-xs text-gray-500 -mt-2">Available = Quantity − Reserved (computed)</p>
                            <Form.Item label="Status" name="status" initialValue="ACTIVE">
                                <Select placeholder="Select status" className="rounded-lg">
                                    <Option value="ACTIVE">Active</Option>
                                    <Option value="INACTIVE">Inactive</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Lot Number" name="lotNumber">
                                <Input placeholder="Lot number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Batch Number" name="batchNumber">
                                <Input placeholder="Batch number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Serial Number" name="serialNumber">
                                <Input placeholder="Serial number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Best Before Date" name="bestBeforeDate">
                                <DatePicker className="w-full rounded-lg" format="DD/MM/YYYY" />
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
