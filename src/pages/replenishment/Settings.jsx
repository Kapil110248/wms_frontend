import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
    Input,
    Select,
    Tag,
    Card,
    Space,
    Modal,
    Form,
    message,
    Popconfirm,
    InputNumber,
    Switch,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined, SettingOutlined, CheckCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
];

export default function ReplenishmentSettings() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [configs, setConfigs] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
    const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);
    const [form] = Form.useForm();
    const [createTaskForm] = Form.useForm();

    const fetchConfigs = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiRequest('/api/replenishment/configs', { method: 'GET' }, token);
            setConfigs(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            message.error(err?.message || 'Failed to load configurations');
            setConfigs([]);
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
            fetchConfigs();
            fetchProducts();
            fetchLocations();
        }
    }, [token, fetchConfigs, fetchProducts, fetchLocations]);

    const totalCount = configs.length;
    const activeCount = configs.filter((c) => (c.status || '').toUpperCase() === 'ACTIVE').length;
    const autoTaskCount = configs.filter((c) => c.autoCreateTasks).length;

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            const payload = {
                productId: values.productId,
                minStockLevel: values.minStockLevel,
                maxStockLevel: values.maxStockLevel,
                reorderPoint: values.reorderPoint,
                reorderQuantity: values.reorderQuantity,
                autoCreateTasks: values.autoCreateTasks !== false,
                status: values.status || 'ACTIVE',
            };
            if (selectedConfig) {
                await apiRequest(`/api/replenishment/configs/${selectedConfig.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Configuration updated');
            } else {
                await apiRequest('/api/replenishment/configs', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Configuration created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedConfig(null);
            await fetchConfigs();
        } catch (err) {
            message.error(err?.message || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/replenishment/configs/${id}`, { method: 'DELETE' }, token);
            message.success('Configuration deleted');
            setSelectedConfig(null);
            await fetchConfigs();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const openEdit = (record) => {
        setSelectedConfig(record);
        form.setFieldsValue({
            productId: record.productId,
            minStockLevel: record.minStockLevel,
            maxStockLevel: record.maxStockLevel,
            reorderPoint: record.reorderPoint,
            reorderQuantity: record.reorderQuantity,
            autoCreateTasks: record.autoCreateTasks !== false,
            status: record.status || 'ACTIVE',
        });
        setModalOpen(true);
    };

    const openAdd = () => {
        setSelectedConfig(null);
        form.resetFields();
        form.setFieldsValue({ autoCreateTasks: true, status: 'ACTIVE' });
        setModalOpen(true);
    };

    const runAutoCheck = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiRequest('/api/replenishment/configs/auto-check', { method: 'GET' }, token);
            const list = Array.isArray(res?.data) ? res.data : [];
            setSuggestions(list);
            setSuggestionsModalOpen(true);
            if (list.length === 0) message.info('No products below reorder point. All good!');
        } catch (err) {
            message.error(err?.message || 'Auto-check failed');
        } finally {
            setLoading(false);
        }
    };

    const runAutoCheckAndCreateTasks = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiRequest('/api/replenishment/configs/auto-check', { method: 'POST' }, token);
            const list = Array.isArray(res?.data) ? res.data : [];
            const created = res?.tasksCreated ?? 0;
            setSuggestions(list);
            setSuggestionsModalOpen(true);
            if (created > 0) message.success(res?.message || `Created ${created} replenishment task(s). Go to Replenishment → Tasks.`);
            else if (list.length === 0) message.info('No products below reorder point. All good!');
            else message.info(res?.message || 'No tasks created (need BULK and PICK locations).');
        } catch (err) {
            message.error(err?.message || err?.data?.message || 'Auto-check & create tasks failed');
        } finally {
            setLoading(false);
        }
    };

    const openCreateTaskFromSuggestion = (suggestion) => {
        setSelectedSuggestion(suggestion);
        createTaskForm.setFieldsValue({
            productId: suggestion.productId,
            quantityNeeded: suggestion.reorderQuantity ?? 1,
            priority: 'MEDIUM',
        });
        setCreateTaskModalOpen(true);
    };

    const handleCreateTaskSubmit = async (values) => {
        if (!token) return;
        setCreateTaskSubmitting(true);
        try {
            await apiRequest('/api/replenishment/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    productId: values.productId,
                    fromLocationId: values.fromLocationId,
                    toLocationId: values.toLocationId,
                    quantityNeeded: values.quantityNeeded,
                    priority: values.priority || 'MEDIUM',
                    notes: values.notes || undefined,
                }),
            }, token);
            message.success('Replenishment task created. Go to Replenishment > Tasks to complete it.');
            setCreateTaskModalOpen(false);
            setSelectedSuggestion(null);
            createTaskForm.resetFields();
        } catch (err) {
            message.error(err?.message || 'Failed to create task');
        } finally {
            setCreateTaskSubmitting(false);
        }
    };

    const columns = [
        { title: 'Product', key: 'product', width: 200, render: (_, r) => r.Product?.name || '—' },
        { title: 'Brand', key: 'brand', width: 100, render: () => '—' },
        { title: 'Min Level', dataIndex: 'minStockLevel', key: 'minStockLevel', width: 100, align: 'right', render: (v) => v ?? 0 },
        { title: 'Max Level', dataIndex: 'maxStockLevel', key: 'maxStockLevel', width: 100, align: 'right', render: (v) => v ?? 0 },
        { title: 'Reorder Point', dataIndex: 'reorderPoint', key: 'reorderPoint', width: 120, align: 'right', render: (v) => v ?? 0 },
        { title: 'Reorder Qty', dataIndex: 'reorderQuantity', key: 'reorderQuantity', width: 110, align: 'right', render: (v) => v ?? 0 },
        {
            title: 'Auto Tasks',
            dataIndex: 'autoCreateTasks',
            key: 'autoCreateTasks',
            width: 110,
            render: (v) => (v ? <Tag color="green">Enabled</Tag> : <Tag>Disabled</Tag>),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 90,
            render: (v) => <Tag color={(v || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'green' : 'default'}>{v || 'Active'}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EditOutlined />} className="text-blue-600 p-0" onClick={() => openEdit(record)}>Edit</Button>
                    <Popconfirm title="Delete this configuration?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const suggestionColumns = [
        { title: 'Product', key: 'productName', width: 200, render: (_, r) => r.productName || '—' },
        { title: 'SKU', key: 'productSku', width: 120, render: (_, r) => r.productSku || '—' },
        { title: 'Current Stock', dataIndex: 'currentStock', key: 'currentStock', width: 110, align: 'right', render: (v) => v ?? 0 },
        { title: 'Reorder Point', dataIndex: 'reorderPoint', key: 'reorderPoint', width: 120, align: 'right', render: (v) => v ?? 0 },
        { title: 'Reorder Qty', dataIndex: 'reorderQuantity', key: 'reorderQuantity', width: 110, align: 'right', render: (v) => v ?? 0 },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Button type="primary" size="small" icon={<PlusCircleOutlined />} className="bg-blue-600 border-blue-600" onClick={() => openCreateTaskFromSuggestion(record)}>
                    Create task
                </Button>
            ),
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-blue-600">Replenishment Settings</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Configure proactive replenishment limits and reorder points</p>
                    </div>
                    <Space wrap>
                        <Button icon={<ThunderboltOutlined />} onClick={runAutoCheck} className="rounded-lg">Run Auto-Check</Button>
                        <Button type="primary" icon={<CheckCircleOutlined />} onClick={runAutoCheckAndCreateTasks} loading={loading} className="rounded-lg bg-green-600 border-green-600">Run Auto-Check & Create Tasks</Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchConfigs} loading={loading} className="rounded-lg">Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={openAdd}>Add Configuration</Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 text-sm"><SettingOutlined /> Total Configured</div>
                        <div className="text-xl font-medium text-blue-600">{totalCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 text-sm"><CheckCircleOutlined /> Active Configs</div>
                        <div className="text-xl font-medium text-green-600">{activeCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Auto-Task Enabled</div>
                        <div className="text-xl font-medium text-blue-600">{autoTaskCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <Table columns={columns} dataSource={configs} rowKey="id" loading={loading} pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} configs`, pageSize: 10 }} scroll={{ x: 1000 }} className="[&_.ant-table-thead_th]:font-normal" />
                </Card>

                <Modal title={selectedConfig ? 'Edit Replenishment Configuration' : 'Create Replenishment Configuration'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedConfig(null); }} footer={null} width={520} className="rounded-xl">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        <Form.Item label="Product" name="productId" rules={[{ required: true, message: 'Select a product' }]}>
                            <Select placeholder="Select a product" showSearch optionFilterProp="label" className="rounded-lg" options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku || p.id})` }))} disabled={!!selectedConfig} />
                        </Form.Item>
                        <Form.Item label="Minimum Stock Level" name="minStockLevel" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={0} className="w-full rounded-lg" placeholder="Minimum stock" />
                        </Form.Item>
                        <Form.Item label="Maximum Stock Level" name="maxStockLevel" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={0} className="w-full rounded-lg" placeholder="Maximum stock" />
                        </Form.Item>
                        <Form.Item label="Reorder Point" name="reorderPoint" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={0} className="w-full rounded-lg" placeholder="Reorder when stock reaches" />
                        </Form.Item>
                        <Form.Item label="Reorder Quantity" name="reorderQuantity" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={0} className="w-full rounded-lg" placeholder="Quantity to reorder" />
                        </Form.Item>
                        <Form.Item label="Auto-Create Tasks" name="autoCreateTasks" valuePropName="checked">
                            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                        </Form.Item>
                        <Form.Item name="status" hidden><Input /></Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setModalOpen(false); setSelectedConfig(null); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">OK</Button>
                        </div>
                    </Form>
                </Modal>

                <Modal title="Products below reorder point – Create replenishment tasks" open={suggestionsModalOpen} onCancel={() => setSuggestionsModalOpen(false)} footer={null} width={720} className="rounded-xl" destroyOnClose>
                    <p className="text-gray-500 text-sm mb-4">These products are below their reorder point. Create a task for each and complete it from Replenishment → Tasks to move stock.</p>
                    <Table columns={suggestionColumns} dataSource={suggestions} rowKey={(_, i) => `${_.productId}-${_.configId}-${i}`} pagination={{ pageSize: 5 }} size="small" />
                </Modal>

                <Modal title="Create replenishment task" open={createTaskModalOpen} onCancel={() => { setCreateTaskModalOpen(false); setSelectedSuggestion(null); createTaskForm.resetFields(); }} footer={null} width={520} className="rounded-xl" destroyOnClose>
                    <Form form={createTaskForm} layout="vertical" onFinish={handleCreateTaskSubmit} className="pt-2">
                        <Form.Item label="Product" name="productId" hidden><Input /></Form.Item>
                        {selectedSuggestion && (
                            <div className="mb-4 p-2 bg-gray-50 rounded-lg text-sm">
                                <span className="text-gray-500">Product: </span><strong>{selectedSuggestion.productName}</strong> (current stock: {selectedSuggestion.currentStock}, reorder: {selectedSuggestion.reorderQuantity})
                            </div>
                        )}
                        <Form.Item label="From location (source)" name="fromLocationId" rules={[{ required: true, message: 'Select source location' }]}>
                            <Select placeholder="Select source location" showSearch optionFilterProp="label" className="rounded-lg" options={locations.map((l) => ({ value: l.id, label: l.name || l.code || `Location ${l.id}` }))} />
                        </Form.Item>
                        <Form.Item label="To location (destination)" name="toLocationId" rules={[{ required: true, message: 'Select destination location' }]}>
                            <Select placeholder="Select destination location" showSearch optionFilterProp="label" className="rounded-lg" options={locations.map((l) => ({ value: l.id, label: l.name || l.code || `Location ${l.id}` }))} />
                        </Form.Item>
                        <Form.Item label="Quantity needed" name="quantityNeeded" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={1} className="w-full rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Priority" name="priority">
                            <Select placeholder="Priority" className="rounded-lg" options={PRIORITY_OPTIONS} />
                        </Form.Item>
                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={2} placeholder="Optional" className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setCreateTaskModalOpen(false); setSelectedSuggestion(null); createTaskForm.resetFields(); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={createTaskSubmitting} className="bg-blue-600 border-blue-600 rounded-lg">Create task</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
