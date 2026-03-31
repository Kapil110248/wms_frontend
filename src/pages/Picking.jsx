import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Statistic, Row, Col, Modal, Form, Input, Select, InputNumber, Drawer, Tabs, Progress, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
const { Search } = Input;
const { Option } = Select;

export default function Picking() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [pickLists, setPickLists] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('NOT_STARTED');
    const [form] = Form.useForm();

    const fetchSalesOrders = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            const list = Array.isArray(data?.data) ? data.data : [];
            setSalesOrders(list.filter(o => ['CONFIRMED'].includes((o.status || '').toUpperCase())));
        } catch (_) {
            setSalesOrders([]);
        }
    }, [token]);

    const fetchPickLists = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/picking', { method: 'GET' }, token);
            setPickLists(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load pick lists');
            setPickLists([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPickLists();
    }, [fetchPickLists]);

    useEffect(() => {
        if (modalOpen && token) fetchSalesOrders();
    }, [modalOpen, token, fetchSalesOrders]);

    const filteredPickLists = pickLists.filter(pl => {
        if (!activeTab) return true;
        const s = (pl.status || 'NOT_STARTED').toUpperCase();
        if (activeTab === 'NOT_STARTED') {
            if (user?.role === 'picker') return ['NOT_STARTED', 'PENDING', 'ASSIGNED'].includes(s);
            return ['NOT_STARTED', 'PENDING'].includes(s);
        }
        return s === activeTab;
    });

    const handleSubmit = async (values) => {
        const orderId = values.orderId;
        if (!orderId) return;
        const pickList = pickLists.find(pl => (pl.salesOrderId || pl.SalesOrder?.id) === orderId);
        if (pickList) {
            setModalOpen(false);
            form.resetFields();
            navigate(`/picking/${pickList.id}`);
            message.success('Opening pick task');
        } else {
            message.warning('Pick list for this order not found. Refresh the list and try again.');
        }
    };

    const [pickers, setPickers] = useState([]);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedPickList, setSelectedPickList] = useState(null);
    const [assignForm] = Form.useForm();

    const fetchPickers = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/users?role=picker', { method: 'GET' }, token);
            setPickers(Array.isArray(data?.data) ? data.data : []);
        } catch (_) {
            setPickers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchPickers();
    }, [fetchPickers]);

    const handleAssign = async (values) => {
        if (!selectedPickList) return;
        try {
            await apiRequest(`/api/picking/${selectedPickList.id}/assign`, {
                method: 'PUT',
                body: JSON.stringify({ userId: values.userId })
            }, token);
            message.success('Picker Assigned Successfully');
            setAssignModalOpen(false);
            fetchPickLists();
        } catch (err) {
            message.error(err.message || 'Assignment failed');
        }
    };

    const [acceptRejectModalOpen, setAcceptRejectModalOpen] = useState(false);

    const handleAccept = async () => {
        if (!selectedPickList) return;
        try {
            await apiRequest(`/api/picking/${selectedPickList.id}/start`, { method: 'POST' }, token);
            message.success('Order Accepted - Moved to In Progress');
            setAcceptRejectModalOpen(false);
            fetchPickLists();
        } catch (err) {
            message.error(err.message || 'Failed to accept');
        }
    };

    const handleReject = async () => {
        if (!selectedPickList) return;
        try {
            await apiRequest(`/api/picking/${selectedPickList.id}/reject`, { method: 'POST' }, token);
            message.success('Order Rejected - Returned to Pending');
            setAcceptRejectModalOpen(false);
            fetchPickLists();
        } catch (err) {
            message.error(err.message || 'Failed to reject');
        }
    };

    const [completeCancelModalOpen, setCompleteCancelModalOpen] = useState(false);

    const handleComplete = async () => {
        if (!selectedPickList) return;
        try {
            await apiRequest(`/api/picking/${selectedPickList.id}/complete`, { method: 'POST' }, token);
            message.success('Order Completed - Moved to Packing');
            setCompleteCancelModalOpen(false);
            fetchPickLists();
        } catch (err) {
            message.error(err.message || 'Failed to complete');
        }
    };

    const handleCancelInProgress = async () => {
        if (!selectedPickList) return;
        try {
            await apiRequest(`/api/picking/${selectedPickList.id}/reject`, { method: 'POST' }, token);
            message.success('Order Cancelled - Returned to Pending');
            setCompleteCancelModalOpen(false);
            fetchPickLists();
        } catch (err) {
            message.error(err.message || 'Failed to cancel');
        }
    };

    const handleEditClick = (record) => {
        setSelectedPickList(record);
        const status = (record.status || '').toUpperCase();
        if (user?.role === 'picker') {
            if (status === 'ASSIGNED') {
                setAcceptRejectModalOpen(true);
            } else if (status === 'PARTIALLY_PICKED' || status === 'PICKING_IN_PROGRESS') {
                setCompleteCancelModalOpen(true);
            }
        } else {
            assignForm.setFieldsValue({ userId: record.userId });
            setAssignModalOpen(true);
        }
    };

    const shortenOrderNumber = (num) => {
        if (!num) return '—';
        const parts = num.split('-');
        return parts.length === 3 ? `ORD-${parts[2]}` : num;
    };

    const columns = [
        { title: 'Pick List', key: 'pn', render: (_, r) => <Link to={`/picking/${r.id}`} className="font-semibold text-blue-600 hover:underline">PL-{String(r.id).slice(0, 8)}</Link> },
        { title: 'Order', key: 'order', render: (_, r) => shortenOrderNumber(r.SalesOrder?.orderNumber || r.salesOrderId) },
        { title: 'Assigned To', key: 'picker', render: (_, r) => r.User?.name ? <Tag color="blue">{r.User.name}</Tag> : <span className="text-gray-400 text-xs">Unassigned</span> },
        { title: 'Strategy', dataIndex: 'type', key: 'type', render: (t) => <Tag color="default">{t || 'SINGLE'}</Tag> },
        {
            title: 'Fulfillment', key: 'fulfill', render: (_, r) => {
                const items = r.PickListItems || r.pickItems || [];
                const req = items.reduce((s, i) => s + parseFloat(i.quantityRequired || 0), 0) || 1;
                const picked = items.reduce((s, i) => s + parseFloat(i.quantityPicked || 0), 0) || 0;
                return <div className="w-24"><Progress percent={Math.round((picked / req) * 100)} size="small" strokeColor="#6366f1" /></div>;
            }
        },
        { title: 'Urgency', dataIndex: 'priority', key: 'prio', render: (p) => <Tag color={p === 'HIGH' ? 'red' : 'default'}>{p || 'MEDIUM'}</Tag> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'PICKED' ? 'green' : 'blue'}>{s}</Tag> },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/picking/${r.id}`)} />
                    <Button type="text" icon={<EditOutlined className="text-indigo-500" />} onClick={() => handleEditClick(r)} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Pick Lists</h1>
                    <p className="text-gray-500 text-sm mt-1">Coordinate pick-and-pack tasks across the floor</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-slate-600 text-xs font-medium mb-1">Live Queue</div>
                        <div className="text-xl font-bold text-slate-800">{pickLists.filter(x => (x.status || '').toUpperCase() !== 'PICKED').length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-green-600 text-xs font-medium mb-1">Dispatched</div>
                        <div className="text-xl font-bold text-slate-800">{pickLists.filter(x => (x.status || '').toUpperCase() === 'PICKED').length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-blue-600 text-xs font-medium mb-1">Units Picked</div>
                        <div className="text-xl font-bold text-slate-800">{pickLists.reduce((s, p) => s + ((p.PickListItems || p.pickItems || []).reduce((ss, i) => ss + parseFloat(i.quantityPicked || 0), 0) || 0), 0)}</div>
                    </Card>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-3">
                        <Search placeholder="ID, ticket or order ref..." className="max-w-xs" prefix={<SearchOutlined />} allowClear />
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={[
                                { key: 'NOT_STARTED', label: 'Pending' },
                                ...(user?.role !== 'picker' ? [{ key: 'ASSIGNED', label: 'Assigned' }] : []),
                                { key: 'PARTIALLY_PICKED', label: 'In Progress' }
                            ]}
                            className="min-w-0"
                        />
                        <Button icon={<ReloadOutlined />} onClick={fetchPickLists}>Refresh</Button>
                    </div>
                    <Table columns={columns} dataSource={filteredPickLists} rowKey="id" loading={loading} className="px-4" />
                </Card>

                <Modal title="Generate Fulfillment Directive" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700} className="generation-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ type: 'SINGLE', priority: 'MEDIUM' }} className="pt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <Form.Item label="Pick Methodology" name="type" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="SINGLE">Single Order Pick</Option><Option value="BATCH">Batch (Multi-Order)</Option><Option value="WAVE">Wave Release</Option></Select></Form.Item>
                            <Form.Item label="Service Level" name="priority" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="HIGH">Expedited/High</Option><Option value="MEDIUM">Standard/Normal</Option><Option value="LOW">Economy/Low</Option></Select></Form.Item>
                        </div>
                        <Form.Item label="Target Sales Order" name="orderId" rules={[{ required: true, message: 'Select a sales order' }]}>
                            <Select
                                showSearch
                                placeholder="Search confirmed orders..."
                                className="h-11 rounded-xl"
                                optionFilterProp="label"
                                options={salesOrders.map(o => ({ value: o.id, label: `${shortenOrderNumber(o.orderNumber)} ${(o.Customer?.name || o.customer?.name) ? ' – ' + (o.Customer?.name || o.customer?.name) : ''}` }))}
                            />
                        </Form.Item>
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4">
                            <h4 className="text-indigo-800 font-bold mb-1">Heuristic Engine</h4>
                            <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-tight">AI will auto-allocate inventory from nearest bin locations upon generation.</p>
                        </div>
                    </Form>
                </Modal>

                <Modal title="Assign Picker" open={assignModalOpen} onCancel={() => setAssignModalOpen(false)} onOk={() => assignForm.submit()} className="assign-modal">
                    {selectedPickList && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p><strong>Order #:</strong> {shortenOrderNumber(selectedPickList.SalesOrder?.orderNumber)}</p>
                            <p><strong>Customer:</strong> {selectedPickList.SalesOrder?.Customer?.name || selectedPickList.SalesOrder?.customer?.name || 'N/A'}</p>
                            <p><strong>Items:</strong> {(selectedPickList.PickListItems || selectedPickList.pickItems || []).length}</p>
                        </div>
                    )}
                    <Form form={assignForm} layout="vertical" onFinish={handleAssign}>
                        <Form.Item label="Select Picker" name="userId" rules={[{ required: true, message: 'Please select a picker' }]}>
                            <Select placeholder="Select a picker" className="w-full">
                                {pickers.filter(p => p.role === 'picker').map(p => (
                                    <Option key={p.id} value={p.id}>{p.name} ({p.role})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal title="Accept or Reject Assignment" open={acceptRejectModalOpen} onCancel={() => setAcceptRejectModalOpen(false)} footer={null}>
                    {selectedPickList && (
                        <div className="text-center space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{shortenOrderNumber(selectedPickList.SalesOrder?.orderNumber)}</h3>
                                <p className="text-gray-500">Pick List ID: PL-{selectedPickList.id}</p>
                                <p className="text-gray-500">Customer: {selectedPickList.SalesOrder?.Customer?.name || selectedPickList.SalesOrder?.customer?.name || 'N/A'}</p>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button size="large" danger className="w-32 h-12 rounded-xl font-bold" onClick={handleReject}>Reject</Button>
                                <Button size="large" type="primary" className="w-32 h-12 rounded-xl font-bold bg-green-500 hover:bg-green-600 border-none" onClick={handleAccept}>Accept</Button>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal title="Complete or Cancel Task" open={completeCancelModalOpen} onCancel={() => setCompleteCancelModalOpen(false)} footer={null}>
                    {selectedPickList && (
                        <div className="text-center space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{shortenOrderNumber(selectedPickList.SalesOrder?.orderNumber)}</h3>
                                <p className="text-gray-500">Pick List ID: PL-{selectedPickList.id}</p>
                                <p className="text-gray-500">Status: In Progress</p>
                            </div>
                            <p className="text-sm text-gray-500">
                                Mark as <strong>Complete</strong> to send to Packing.<br />
                                Mark as <strong>Cancelled</strong> to return to Pending queue.
                            </p>
                            <div className="flex justify-center gap-4">
                                <Button size="large" danger className="w-32 h-12 rounded-xl font-bold" onClick={handleCancelInProgress}>Cancel Order</Button>
                                <Button size="large" type="primary" className="w-32 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 border-none" onClick={handleComplete}>Complete</Button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
