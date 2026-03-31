import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
    Select,
    Tag,
    Card,
    Space,
    Modal,
    Form,
    message,
    Popconfirm,
    InputNumber,
    Drawer,
    Input,
} from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
];

export default function ReplenishmentTasks() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [form] = Form.useForm();

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiRequest('/api/replenishment/tasks', { method: 'GET' }, token);
            setTasks(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            message.error(err?.message || 'Failed to load tasks');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(res?.data) ? res.data : []);
        } catch {
            setProducts([]);
        }
    }, [token]);

    const fetchLocations = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/locations', { method: 'GET' }, token);
            setLocations(Array.isArray(res?.data) ? res.data : []);
        } catch {
            setLocations([]);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchTasks();
            fetchProducts();
            fetchLocations();
        }
    }, [token, fetchTasks, fetchProducts, fetchLocations]);

    const filteredTasks = tasks.filter((t) => {
        if (statusFilter && (t.status || '') !== statusFilter) return false;
        return true;
    });

    const pendingCount = tasks.filter((t) => (t.status || '').toUpperCase() === 'PENDING').length;
    const inProgressCount = tasks.filter((t) => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
    const completedCount = tasks.filter((t) => (t.status || '').toUpperCase() === 'COMPLETED').length;

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            const payload = {
                productId: values.productId,
                fromLocationId: values.fromLocationId,
                toLocationId: values.toLocationId,
                quantityNeeded: values.quantityNeeded,
                priority: values.priority || 'MEDIUM',
                notes: values.notes || undefined,
            };
            if (selectedTask) {
                await apiRequest(`/api/replenishment/tasks/${selectedTask.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Task updated');
            } else {
                await apiRequest('/api/replenishment/tasks', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Task created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedTask(null);
            await fetchTasks();
        } catch (err) {
            message.error(err?.message || 'Failed to save task');
        }
    };

    const handleComplete = async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/replenishment/tasks/${id}/complete`, { method: 'POST' }, token);
            message.success('Task completed');
            setViewDrawerOpen(false);
            setSelectedTask(null);
            await fetchTasks();
        } catch (err) {
            message.error(err?.message || 'Failed to complete');
        }
    };

    const handleDelete = async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/replenishment/tasks/${id}`, { method: 'DELETE' }, token);
            message.success('Task deleted');
            setViewDrawerOpen(false);
            setSelectedTask(null);
            await fetchTasks();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const openEdit = (record) => {
        setSelectedTask(record);
        form.setFieldsValue({
            productId: record.productId,
            fromLocationId: record.fromLocationId,
            toLocationId: record.toLocationId,
            quantityNeeded: record.quantityNeeded,
            priority: record.priority || 'MEDIUM',
            notes: record.notes,
        });
        setModalOpen(true);
    };

    const openAdd = () => {
        setSelectedTask(null);
        form.resetFields();
        form.setFieldsValue({ priority: 'MEDIUM' });
        setModalOpen(true);
    };

    const openView = (record) => {
        setSelectedTask(record);
        setViewDrawerOpen(true);
    };

    const statusColor = (s) => {
        const t = (s || '').toUpperCase();
        if (t === 'PENDING') return 'orange';
        if (t === 'IN_PROGRESS') return 'blue';
        if (t === 'COMPLETED') return 'green';
        return 'default';
    };

    const columns = [
        { title: 'Task #', dataIndex: 'taskNumber', key: 'taskNumber', width: 120, render: (v) => <span className="font-medium text-blue-600">{v}</span> },
        { title: 'Product', key: 'product', width: 180, render: (_, r) => r.Product?.name || r.productName || '—' },
        { title: 'Brand', key: 'brand', width: 100, render: () => '—' },
        { title: 'From', key: 'from', width: 120, render: (_, r) => r.fromLocation?.name || r.fromLocation?.code || '—' },
        { title: 'To', key: 'to', width: 120, render: (_, r) => r.toLocation?.name || r.toLocation?.code || '—' },
        {
            title: 'Quantity',
            key: 'qty',
            width: 100,
            render: (_, r) => `${r.quantityCompleted ?? 0} / ${r.quantityNeeded ?? 0}`,
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (v) => (v ? <Tag color="blue">{v}</Tag> : '—'),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (v) => <Tag color={statusColor(v)}>{(v || 'PENDING').replace('_', ' ')}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0" onClick={() => openView(record)}>View</Button>
                    {(record.status || '').toUpperCase() !== 'COMPLETED' && (
                        <Button type="link" size="small" icon={<CheckCircleOutlined />} className="text-blue-600 p-0" onClick={() => handleComplete(record.id)}>Complete</Button>
                    )}
                    <Button type="link" size="small" icon={<EditOutlined />} className="text-blue-600 p-0" onClick={() => openEdit(record)}>Edit</Button>
                    <Popconfirm title="Delete this task?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
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
                        <h1 className="text-2xl font-semibold text-blue-600">Replenishment Tasks</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage stock replenishment from bulk to pick locations</p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading} className="rounded-lg">Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={openAdd}>Add Task</Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 text-sm"><ClockCircleOutlined /> Pending Tasks</div>
                        <div className="text-xl font-medium text-orange-600">{pendingCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 text-sm"><SyncOutlined /> In Progress</div>
                        <div className="text-xl font-medium text-blue-600">{inProgressCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 text-sm"><CheckCircleOutlined /> Completed</div>
                        <div className="text-xl font-medium text-green-600">{completedCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
                        <span className="text-gray-600 text-sm">Filter by status:</span>
                        <Select placeholder="All statuses" allowClear value={statusFilter} onChange={setStatusFilter} className="w-40 rounded-lg" options={STATUS_OPTIONS} />
                    </div>
                    <Table columns={columns} dataSource={filteredTasks} rowKey="id" loading={loading} pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} tasks`, pageSize: 10 }} scroll={{ x: 1100 }} className="[&_.ant-table-thead_th]:font-normal" />
                </Card>

                <Modal title={selectedTask ? 'Edit Replenishment Task' : 'Create Replenishment Task'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedTask(null); }} footer={null} width={520} className="rounded-xl">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        <Form.Item label="Product" name="productId" rules={[{ required: true, message: 'Select a product' }]}>
                            <Select placeholder="Select a product" showSearch optionFilterProp="label" className="rounded-lg" options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku || p.id})` }))} />
                        </Form.Item>
                        <Form.Item label="From Location (Bulk/Storage)" name="fromLocationId" rules={[{ required: true, message: 'Select source location' }]}>
                            <Select placeholder="Select source location" showSearch optionFilterProp="label" className="rounded-lg" options={locations.map((l) => ({ value: l.id, label: l.name || l.code || `Location ${l.id}` }))} />
                        </Form.Item>
                        <Form.Item label="To Location (Pick Area)" name="toLocationId" rules={[{ required: true, message: 'Select destination location' }]}>
                            <Select placeholder="Select destination location" showSearch optionFilterProp="label" className="rounded-lg" options={locations.map((l) => ({ value: l.id, label: l.name || l.code || `Location ${l.id}` }))} />
                        </Form.Item>
                        <Form.Item label="Quantity Needed" name="quantityNeeded" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={1} className="w-full rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Priority" name="priority">
                            <Select placeholder="Priority" className="rounded-lg" options={PRIORITY_OPTIONS} />
                        </Form.Item>
                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={3} placeholder="Optional notes" className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setModalOpen(false); setSelectedTask(null); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">{selectedTask ? 'Update' : 'Create'}</Button>
                        </div>
                    </Form>
                </Modal>

                <Drawer title={`Task: ${selectedTask?.taskNumber}`} width={440} open={viewDrawerOpen} onClose={() => { setViewDrawerOpen(false); setSelectedTask(null); }} className="rounded-l-3xl" destroyOnClose>
                    {selectedTask && (
                        <div className="space-y-4">
                            <div><span className="text-gray-500 text-sm">Product</span><div className="font-medium">{selectedTask.Product?.name || '—'}</div></div>
                            <div><span className="text-gray-500 text-sm">From</span><div className="font-medium">{selectedTask.fromLocation?.name || selectedTask.fromLocation?.code || '—'}</div></div>
                            <div><span className="text-gray-500 text-sm">To</span><div className="font-medium">{selectedTask.toLocation?.name || selectedTask.toLocation?.code || '—'}</div></div>
                            <div><span className="text-gray-500 text-sm">Quantity</span><div className="font-medium">{selectedTask.quantityCompleted ?? 0} / {selectedTask.quantityNeeded ?? 0}</div></div>
                            <div><span className="text-gray-500 text-sm">Priority</span><div><Tag color="blue">{selectedTask.priority || '—'}</Tag></div></div>
                            <div><span className="text-gray-500 text-sm">Status</span><div><Tag color={statusColor(selectedTask.status)}>{(selectedTask.status || 'PENDING').replace('_', ' ')}</Tag></div></div>
                            {selectedTask.notes && <div><span className="text-gray-500 text-sm">Notes</span><div className="text-sm">{selectedTask.notes}</div></div>}
                            <div className="flex gap-2 pt-4 border-t">
                                {(selectedTask.status || '').toUpperCase() !== 'COMPLETED' && <Button type="primary" icon={<CheckCircleOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => handleComplete(selectedTask.id)}>Complete</Button>}
                                <Button icon={<EditOutlined />} className="rounded-lg" onClick={() => { setViewDrawerOpen(false); openEdit(selectedTask); }}>Edit</Button>
                                <Popconfirm title="Delete this task?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(selectedTask.id)}><Button danger icon={<DeleteOutlined />} className="rounded-lg">Delete</Button></Popconfirm>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
