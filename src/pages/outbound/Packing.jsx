import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Tabs, Space, Tooltip, Progress } from 'antd';
import { SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, RocketOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Search } = Input;

export default function Packing() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [packingTasks, setPackingTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('NOT_STARTED');
    const [searchText, setSearchText] = useState('');

    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();
    const [packers, setPackers] = useState([]);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchPacking = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/packing', { method: 'GET' }, token);
            setPackingTasks(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load packing tasks');
            setPackingTasks([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPacking();
    }, [fetchPacking]);

    const fetchPackers = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/users?role=packer', { method: 'GET' }, token);
            setPackers(Array.isArray(data?.data) ? data.data : []);
        } catch (_) {
            setPackers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchPackers();
    }, [fetchPackers]);

    const filteredTasks = packingTasks.filter(task => {
        const matchesSearch = !searchText ||
            (task.SalesOrder?.orderNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (task.SalesOrder?.Customer?.name || '').toLowerCase().includes(searchText.toLowerCase());

        if (!matchesSearch) return false;

        const s = (task.status || 'NOT_STARTED').toUpperCase();
        if (activeTab === 'NOT_STARTED') {
            const { user } = useAuthStore.getState();
            if (user?.role === 'packer') {
                // For packers, Pending tab shows tasks assigned to them (status: ASSIGNED)
                return ['ASSIGNED'].includes(s);
            }
            return ['NOT_STARTED', 'PENDING'].includes(s);
        }
        if (activeTab === 'ASSIGNED') return s === 'ASSIGNED';
        if (activeTab === 'PACKING') return ['PACKING', 'IN_PROGRESS'].includes(s);

        return s === activeTab;
    });

    const handleAssign = async (values) => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/assign`, {
                method: 'POST',
                body: JSON.stringify({ userId: values.userId })
            }, token);
            message.success('Packer Assigned Successfully');
            setAssignModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Assignment failed');
        }
    };

    const [acceptRejectModalOpen, setAcceptRejectModalOpen] = useState(false);

    const handleAccept = async () => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/start`, { method: 'POST' }, token);
            message.success('Task Accepted - Moved to In Progress');
            setAcceptRejectModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Failed to accept');
        }
    };

    const handleReject = async () => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/reject`, { method: 'POST' }, token);
            message.success('Task Rejected - Returned to Pending');
            setAcceptRejectModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Failed to reject');
        }
    };

    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);

    const handleDispatch = async () => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/complete`, { method: 'POST' }, token);
            message.success('Dispatch Successful - Shipment Created');
            setDispatchModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Dispatch failed');
        }
    };

    const handleEditClick = (task) => {
        setSelectedTask(task);
        const { user } = useAuthStore.getState();
        if (user?.role === 'packer') {
            const status = (task.status || '').toUpperCase();
            if (['PACKING', 'IN_PROGRESS'].includes(status)) {
                setDispatchModalOpen(true);
            } else {
                setAcceptRejectModalOpen(true);
            }
        } else {
            if (task.assignedTo) {
                assignForm.setFieldsValue({ userId: task.assignedTo });
            } else {
                assignForm.resetFields();
            }
            setAssignModalOpen(true);
        }
    };

    const [viewModalOpen, setViewModalOpen] = useState(false);

    const handleViewClick = (task) => {
        setSelectedTask(task);
        setViewModalOpen(true);
    };

    const columns = [
        { title: 'Task ID', dataIndex: 'id', key: 'ps', render: (v, r) => <Link to={`/packing/${r.id}`} className="font-semibold text-blue-600 hover:underline">{String(v).slice(0, 8)}</Link> },
        { title: 'Sales Order', key: 'order', render: (_, r) => <span className="font-medium text-slate-700">{r.SalesOrder?.orderNumber || '—'}</span> },
        { title: 'Customer', key: 'customer', render: (_, r) => r.SalesOrder?.Customer?.name || '—' },
        {
            title: 'Status', dataIndex: 'status', key: 'status', render: (s) => (
                <Tag color={(s || '').toUpperCase() === 'PACKED' ? 'green' : (s || '').toUpperCase() === 'PACKING' ? 'blue' : 'default'}>
                    {s || 'NOT_STARTED'}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'act',
            render: (_, r) => (
                <Space size="small">
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewClick(r)} title="View" />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => handleEditClick(r)} title="Edit" />
                    <Button type="text" danger icon={<DeleteOutlined />} title="Delete" />
                </Space>
            )
        }
    ];

    const shortenOrderNumber = (num) => {
        if (!num) return '—';
        const parts = String(num).split('-');
        return parts.length === 3 ? `ORD-${parts[2]}` : num;
    };

    const { user } = useAuthStore.getState();
    const isPacker = user?.role === 'packer';

    const renderCards = () => {
        if (isPacker) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-slate-600 text-xs font-medium mb-1">Pending</div>
                        <div className="text-xl font-bold text-slate-800">{packingTasks.filter(t => ['NOT_STARTED', 'PENDING', 'ASSIGNED'].includes((t.status || '').toUpperCase())).length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-blue-600 text-xs font-medium mb-1">In Progress</div>
                        <div className="text-xl font-bold text-slate-800">{packingTasks.filter(t => ['PACKING', 'IN_PROGRESS'].includes((t.status || '').toUpperCase())).length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-green-600 text-xs font-medium mb-1">Completed</div>
                        <div className="text-xl font-bold text-slate-800">{packingTasks.filter(t => (t.status || '').toUpperCase() === 'PACKED').length}</div>
                    </Card>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pending', count: packingTasks.filter(t => ['NOT_STARTED', 'PENDING'].includes((t.status || '').toUpperCase())).length },
                    { label: 'Assigned', count: packingTasks.filter(t => (t.status || '').toUpperCase() === 'ASSIGNED').length },
                    { label: 'In Progress', count: packingTasks.filter(t => ['PACKING', 'IN_PROGRESS'].includes((t.status || '').toUpperCase())).length },
                    { label: 'Completed', count: packingTasks.filter(t => (t.status || '').toUpperCase() === 'PACKED').length }
                ].map((stat, i) => (
                    <Card key={i} className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-slate-600 text-xs font-medium mb-1">{stat.label}</div>
                        <div className="text-xl font-bold text-slate-800">{stat.count}</div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Packing</h1>
                    <p className="text-gray-500 text-sm mt-1">Final stage verification and containerization</p>
                </div>

                {renderCards()}

                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-3">
                        <Search placeholder="Search by order or customer..." className="max-w-md" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} allowClear />
                        <div className="flex-1 flex justify-end gap-2 min-w-0">
                            <Tabs
                                activeKey={activeTab}
                                onChange={setActiveTab}
                                items={[
                                    { key: 'NOT_STARTED', label: 'Pending' },
                                    ...(isPacker ? [] : [{ key: 'ASSIGNED', label: 'Assigned' }]),
                                    { key: 'PACKING', label: 'In Progress' }
                                ]}
                                className="min-w-0"
                            />
                        </div>
                        <Button icon={<ReloadOutlined />} onClick={fetchPacking}>Refresh</Button>
                    </div>
                    <Table columns={columns} dataSource={filteredTasks} rowKey="id" loading={loading} className="px-4" />
                </Card>

                <Modal title="Accept or Reject Assignment" open={acceptRejectModalOpen} onCancel={() => setAcceptRejectModalOpen(false)} footer={null}>
                    {selectedTask && (
                        <div className="text-center space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{shortenOrderNumber(selectedTask.SalesOrder?.orderNumber)}</h3>
                                <p className="text-gray-500">Task ID: {selectedTask.id}</p>
                                <p className="text-gray-500">Customer: {selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button size="large" danger className="w-32 h-12 rounded-xl font-bold" onClick={handleReject}>Reject</Button>
                                <Button size="large" type="primary" className="w-32 h-12 rounded-xl font-bold bg-green-500 hover:bg-green-600 border-none" onClick={handleAccept}>Accept</Button>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal title="Confirm Dispatch" open={dispatchModalOpen} onCancel={() => setDispatchModalOpen(false)} footer={null}>
                    {selectedTask && (
                        <div className="text-center space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{shortenOrderNumber(selectedTask.SalesOrder?.orderNumber)}</h3>
                                <p className="text-gray-500">Customer: {selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                                <p className="text-sm text-blue-500 font-bold mt-2">Ready to create shipment?</p>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button size="large" onClick={() => setDispatchModalOpen(false)} className="w-32 h-12 rounded-xl border-slate-200">Cancel</Button>
                                <Button size="large" type="primary" className="w-32 h-12 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 border-none" onClick={handleDispatch} icon={<RocketOutlined />}>Dispatch</Button>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal title="Assign Picker" open={assignModalOpen} onCancel={() => setAssignModalOpen(false)} onOk={() => assignForm.submit()} className="assign-modal">
                    {selectedTask && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p><strong>Order #:</strong> {shortenOrderNumber(selectedTask.SalesOrder?.orderNumber)}</p>
                            <p><strong>Customer:</strong> {selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                            <p><strong>Items:</strong> {selectedTask.PickList?.PickListItems?.length || 0}</p>
                        </div>
                    )}
                    <Form form={assignForm} layout="vertical" onFinish={handleAssign}>
                        <Form.Item label="Select Packer" name="userId" rules={[{ required: true, message: 'Please select a packer' }]}>
                            <Select placeholder="Select a packer" className="w-full">
                                {packers.filter(p => p.role === 'packer').map(p => (
                                    <Select.Option key={p.id} value={p.id}>{p.name} ({p.role})</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal title="Task Details" open={viewModalOpen} onCancel={() => setViewModalOpen(false)} footer={<Button onClick={() => setViewModalOpen(false)}>Close</Button>}>
                    {selectedTask && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Task ID</p>
                                    <p className="font-mono font-bold text-lg">{String(selectedTask.id).slice(0, 8)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Status</p>
                                    <Tag color={selectedTask.status === 'PACKED' ? 'green' : 'blue'}>{selectedTask.status}</Tag>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Sales Order</p>
                                    <p className="font-bold">{shortenOrderNumber(selectedTask.SalesOrder?.orderNumber)}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase font-bold">Customer</p>
                                    <p>{selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Assigned Packer</p>
                                    <p>{selectedTask.User?.name || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Total Items</p>
                                    <p>{selectedTask.PickList?.PickListItems?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}

