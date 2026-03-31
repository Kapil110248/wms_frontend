import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Divider, Steps } from 'antd';
import { PlusOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatDate, formatNumber } from '../../utils';

const { Search } = Input;
const { Option } = Select;
const { Step } = Steps;

export default function Returns() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [returns, setReturns] = useState([]);
    const [searchText, setSearchText] = useState('');

    // Create RMA State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [deliveredOrders, setDeliveredOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Manage RMA State
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [selectedRMA, setSelectedRMA] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [inspectForm] = Form.useForm();

    const fetchReturns = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/returns', { method: 'GET' }, token);
            setReturns(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load returns');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchDeliveredOrders = async () => {
        try {
            // Fetch ALL orders and filter for DELIVERED on client side for now (or optimize backend later)
            // Using existing order endpoint
            const res = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            const list = Array.isArray(res.data) ? res.data : [];
            setDeliveredOrders(list.filter(o =>
                o.status === 'DELIVERED' ||
                o.Shipment?.deliveryStatus === 'DELIVERED' ||
                o.Shipment?.deliveryStatus === 'SHIPPED' // Allow Shipped for testing/returns in transit
            ));
        } catch (_) {
            message.error('Failed to load delivered orders');
        }
    };

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    useEffect(() => {
        if (createModalOpen) fetchDeliveredOrders();
    }, [createModalOpen]);

    const handleCreateRMA = async (values) => {
        try {
            if (!selectedOrder?.Shipment) { // Should have shipment if delivered
                // Fallback or error if shipment missing (though Data Model says 1-1)
                // Doing a quick check via selectedOrder
            }
            // We need shipmentId. We assume selectedOrder object has it or we fetched it.
            // Since the orders list might not have nested Shipment, we might need to fetch detailed order or guess.
            // Let's assume order object has Shipment populated or we find it.
            // Actually, querying orders/sales usually includes basic relations.

            const payload = {
                salesOrderId: values.salesOrderId,
                shipmentId: selectedOrder?.Shipment?.id || undefined,
                returnType: values.returnType,
                reason: values.reason,
                notes: values.notes || undefined
            };

            await apiRequest('/api/returns', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('RMA Initiated Successfully');
            setCreateModalOpen(false);
            createForm.resetFields();
            fetchReturns();
        } catch (err) {
            message.error(err.message || 'Failed to create RMA');
        }
    };

    const handleAction = async (action, values = {}) => {
        if (!selectedRMA) return;
        setActionLoading(true);
        try {
            let endpoint = '';
            let body = {};

            switch (action) {
                case 'receive': endpoint = 'receive'; break;
                case 'inspect': endpoint = 'inspect'; body = values; break;
                case 'refund': endpoint = 'refund'; body = values; break;
                case 'close': endpoint = 'close'; break;
            }

            const res = await apiRequest(`/api/returns/${selectedRMA.id}/${endpoint}`, {
                method: 'PUT',
                body: JSON.stringify(body)
            }, token);

            message.success(`Action ${action} completed`);

            // Update local state or re-fetch
            if (manageModalOpen) {
                setSelectedRMA(res.data); // Update modal data
            }
            fetchReturns();

            if (action === 'close') setManageModalOpen(false);
        } catch (err) {
            message.error(err.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const columns = [
        { title: 'RMA #', dataIndex: 'rmaNumber', key: 'rma', render: (t) => <span className="font-semibold text-slate-800">{t}</span> },
        { title: 'Order #', dataIndex: ['SalesOrder', 'orderNumber'], key: 'order' },
        { title: 'Customer', dataIndex: ['Customer', 'name'], key: 'cust' },
        { title: 'Type', dataIndex: 'returnType', key: 'type', render: t => <Tag color="default">{t}</Tag> },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: s => {
                let color = 'default';
                if (s === 'RMA_CREATED') color = 'blue';
                if (s === 'RECEIVED') color = 'orange';
                if (s === 'APPROVED') color = 'green';
                if (s === 'REJECTED') color = 'red';
                if (s === 'CLOSED') color = 'gray';
                return <Tag color={color}>{s}</Tag>;
            }
        },
        { title: 'Date', dataIndex: 'createdAt', key: 'date', render: d => formatDate(d) },
        {
            title: 'Actions',
            key: 'act',
            width: 120,
            render: (_, r) => <Button type="link" size="small" icon={<EyeOutlined />} className="p-0 text-blue-600" onClick={() => { setSelectedRMA(r); setManageModalOpen(true); }}>Manage</Button>
        }
    ];

    // Filter returns by search
    const filteredReturns = searchText.trim()
        ? returns.filter((r) => {
            const rma = (r.rmaNumber || '').toLowerCase();
            const orderNum = (r.SalesOrder?.orderNumber || '').toLowerCase();
            const cust = (r.Customer?.name || '').toLowerCase();
            const status = (r.status || '').toLowerCase();
            const q = searchText.trim().toLowerCase();
            return rma.includes(q) || orderNum.includes(q) || cust.includes(q) || status.includes(q);
        })
        : returns;

    // Stats from filtered list for display, or from full list
    const openCount = returns.filter(r => ['RMA_CREATED', 'AWAITING_RETURN'].includes(r.status)).length;
    const processingCount = returns.filter(r => ['RECEIVED', 'IN_INSPECTION'].includes(r.status)).length;
    const completedCount = returns.filter(r => ['CLOSED', 'REFUNDED'].includes(r.status)).length;
    const liability = returns.filter(r => ['APPROVED', 'REFUNDED'].includes(r.status)).reduce((acc, curr) => acc + Number(curr.recoveryValue || 0), 0);

    // Step index for Manage modal (RMA_CREATED/AWAITING_RETURN=0, RECEIVED/IN_INSPECTION=1, APPROVED/REJECTED=2, REFUNDED=3, CLOSED=4)
    const statusToStepIndex = (status) => {
        const s = (status || '').toUpperCase();
        if (['RMA_CREATED', 'AWAITING_RETURN'].includes(s)) return 0;
        if (['RECEIVED', 'IN_INSPECTION'].includes(s)) return 1;
        if (['APPROVED', 'REJECTED'].includes(s)) return 2;
        if (s === 'REFUNDED') return 3;
        if (s === 'CLOSED') return 4;
        return 0;
    };

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Returns (RMA)</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Reverse logistics and asset recovery</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Search
                            placeholder="Search RMA #, Order #, Cus..."
                            allowClear
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onSearch={() => {}}
                            className="max-w-xs rounded-lg"
                            style={{ width: 240 }}
                        />
                        <Button icon={<ReloadOutlined />} onClick={fetchReturns} loading={loading} className="rounded-lg">Refresh</Button>
                        <Button type="primary" danger icon={<PlusOutlined />} className="rounded-lg bg-red-600 border-red-600" onClick={() => setCreateModalOpen(true)}>
                            Initiate Return
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Open RMAs</div>
                        <div className="text-xl font-medium text-blue-600">{openCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Processing</div>
                        <div className="text-xl font-medium text-orange-600">{processingCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Recovered</div>
                        <div className="text-xl font-medium text-green-600">{completedCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Liability</div>
                        <div className="text-xl font-medium text-slate-800">£{formatNumber(liability)}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <Table
                        dataSource={filteredReturns}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} returns`, pageSize: 10 }}
                        locale={{ emptyText: 'No returns yet. Initiate a return from a delivered order.' }}
                        scroll={{ x: 900 }}
                        className="[&_.ant-table-thead_th]:font-normal"
                    />
                </Card>

                {/* Create RMA Modal */}
                <Modal title="Initiate Return (RMA)" open={createModalOpen} onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); setSelectedOrder(null); }} footer={null} width={520} className="rounded-xl" destroyOnClose>
                    <Form form={createForm} layout="vertical" onFinish={handleCreateRMA} className="pt-2">
                        <Form.Item label="Select Delivered Order" name="salesOrderId" rules={[{ required: true, message: 'Select an order' }]}>
                            <Select
                                showSearch
                                placeholder={deliveredOrders.length === 0 ? 'No shipped/delivered orders found' : 'Search Order #...'}
                                optionFilterProp="label"
                                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                onChange={(val) => setSelectedOrder(deliveredOrders.find(o => o.id === val))}
                                notFoundContent={deliveredOrders.length === 0 ? 'No shipped or delivered orders. Ship orders first from Shipments.' : null}
                                className="rounded-lg"
                                options={deliveredOrders.map(o => ({ value: o.id, label: `${o.orderNumber} — ${o.Customer?.name || 'Customer'} ${o.Shipment?.deliveryStatus ? `(${o.Shipment.deliveryStatus})` : ''}` }))}
                            />
                        </Form.Item>
                        <Form.Item label="Return Strategy" name="returnType" rules={[{ required: true, message: 'Select return strategy' }]}>
                            <Select placeholder="Select return strategy" className="rounded-lg" options={[
                                { value: 'REFUND', label: 'Return & Refund' },
                                { value: 'REPLACE', label: 'Return & Replace' },
                                { value: 'INSPECTION', label: 'Inspection Only' },
                            ]} />
                        </Form.Item>
                        <Form.Item label="Reason for Return" name="reason" rules={[{ required: true, message: 'Select reason' }]}>
                            <Select placeholder="Select reason" className="rounded-lg" options={[
                                { value: 'DAMAGED', label: 'Damaged in Transit' },
                                { value: 'DEFECTIVE', label: 'Product Defective' },
                                { value: 'WRONG_ITEM', label: 'Wrong Item Sent' },
                                { value: 'NO_LONGER_NEEDED', label: 'No Longer Needed' },
                            ]} />
                        </Form.Item>
                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={3} placeholder="Optional notes" className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setCreateModalOpen(false); createForm.resetFields(); setSelectedOrder(null); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" danger htmlType="submit" className="rounded-lg bg-red-600 border-red-600">Generate RMA</Button>
                        </div>
                    </Form>
                </Modal>

                {/* Manage RMA Modal */}
                <Modal
                    title={<span className="font-semibold text-lg">Manage RMA: {selectedRMA?.rmaNumber}</span>}
                    open={manageModalOpen}
                    onCancel={() => setManageModalOpen(false)}
                    width={900}
                    footer={null}
                >
                    {selectedRMA && (
                        <div className="space-y-6">
                            <Steps current={statusToStepIndex(selectedRMA.status)} size="small" className="mb-8">
                                <Step title="Initiated" />
                                <Step title="Received" />
                                <Step title="Inspected" />
                                <Step title="Approved / Refunded" />
                                <Step title="Closed" />
                            </Steps>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-bold uppercase text-xs text-gray-500 mb-2">Details</h4>
                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                        <p><strong>Reason:</strong> {selectedRMA.reason}</p>
                                        <p><strong>Type:</strong> {selectedRMA.returnType}</p>
                                        <p><strong>Notes:</strong> {selectedRMA.notes || 'None'}</p>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <p><strong>Customer:</strong> {selectedRMA.Customer?.name}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase text-xs text-gray-500 mb-2">Actions</h4>
                                    <div className="space-y-3">
                                        {['RMA_CREATED', 'AWAITING_RETURN'].includes(selectedRMA.status) && (
                                            <Button type="primary" block onClick={() => handleAction('receive')}>
                                                Mark as Received
                                            </Button>
                                        )}

                                        {['RECEIVED', 'IN_INSPECTION'].includes(selectedRMA.status) && (
                                            <div className="border border-gray-200 p-4 rounded-xl">
                                                <h5 className="font-bold mb-2">Inspection Decision</h5>
                                                <Form form={inspectForm} layout="vertical" onFinish={(vals) => handleAction('inspect', vals)}>
                                                    <Form.Item name="outcome" label="Outcome" rules={[{ required: true }]}>
                                                        <Select>
                                                            <Option value="APPROVED">Approve Return</Option>
                                                            <Option value="REJECTED">Reject Return</Option>
                                                        </Select>
                                                    </Form.Item>
                                                    <Form.Item name="recoveryValue" label="Recovery Value (£)">
                                                        <Input type="number" />
                                                    </Form.Item>
                                                    <Form.Item name="notes" label="Inspection Notes">
                                                        <Input.TextArea rows={2} />
                                                    </Form.Item>
                                                    <Button type="primary" htmlType="submit" block loading={actionLoading}>Submit Decision</Button>
                                                </Form>
                                            </div>
                                        )}

                                        {selectedRMA.status === 'APPROVED' && selectedRMA.returnType === 'REFUND' && (
                                            <Button type="primary" danger block onClick={() => handleAction('refund', { amount: Number(selectedRMA.recoveryValue || 0) })}>
                                                Process Refund (£{formatNumber(Number(selectedRMA.recoveryValue || 0))})
                                            </Button>
                                        )}

                                        {['REFUNDED', 'REJECTED'].includes(selectedRMA.status) && (
                                            <Button size="large" block onClick={() => handleAction('close')}>
                                                Close RMA
                                            </Button>
                                        )}

                                        {selectedRMA.status === 'CLOSED' && <div className="text-center font-bold text-gray-400">RMA Closed</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
