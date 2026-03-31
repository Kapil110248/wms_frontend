import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Drawer, Modal, InputNumber, message, Switch } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined, EnvironmentOutlined, PhoneOutlined, InboxOutlined, ReloadOutlined, DatabaseOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

const WAREHOUSE_TYPE_LABELS = { MAIN: 'Main', PREP: 'Prep', STANDARD: 'Standard', COLD: 'Cold Storage', FROZEN: 'Frozen', HAZMAT: 'Hazmat', BONDED: 'Bonded' };

export default function Warehouses() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [saving, setSaving] = useState(false);
    const [productionOrders, setProductionOrders] = useState([]);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load warehouses');
            setWarehouses([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchCompanies = useCallback(async () => {
        if (!token || !isSuperAdmin) return;
        try {
            const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
            setCompanies(Array.isArray(data?.data) ? data.data : []);
        } catch { setCompanies([]); }
    }, [token, isSuperAdmin]);

    const fetchProductionOrders = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/production', { method: 'GET' }, token);
            setProductionOrders(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error('Failed to load production orders', err);
        }
    }, [token]);

    useEffect(() => {
        fetchWarehouses();
        fetchProductionOrders();
        if (isSuperAdmin) fetchCompanies();
    }, [fetchWarehouses, fetchProductionOrders, isSuperAdmin, fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { code: values.code, name: values.name, warehouseType: values.warehouseType, status: values.status, phone: values.phone, address: values.address, capacity: values.capacity, isProduction: values.isProduction };
            if (isSuperAdmin && !editMode) payload.companyId = values.companyId;
            if (editMode && selectedWarehouse) {
                await apiRequest(`/api/warehouses/${selectedWarehouse.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Warehouse updated');
            } else {
                await apiRequest('/api/warehouses', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Warehouse created');
            }
            setModalOpen(false);
            form.resetFields();
            fetchWarehouses();
        } catch (err) {
            message.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/warehouses/${id}`, { method: 'DELETE' }, token);
            message.success('Warehouse deleted');
            fetchWarehouses();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const mainCount = warehouses.filter(w => (w.warehouseType || '').toUpperCase() === 'MAIN').length;
    const prepCount = warehouses.filter(w => (w.warehouseType || '').toUpperCase() === 'PREP').length;

    const columns = [
        { title: 'Category Code', dataIndex: 'code', key: 'code', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Category Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Type', dataIndex: 'warehouseType', key: 'warehouseType', width: 100, render: (v) => v ? <Tag color={(v || '').toUpperCase() === 'MAIN' ? 'blue' : (v || '').toUpperCase() === 'PREP' ? 'orange' : 'default'}>{v}</Tag> : '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s || '—'}</Tag> },
        { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true, render: (v) => v ? <span className="flex items-center gap-1.5"><EnvironmentOutlined className="text-gray-400 shrink-0" />{v}</span> : '—' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140, render: (v) => v ? <span className="flex items-center gap-1.5"><PhoneOutlined className="text-gray-400 shrink-0" />{v}</span> : '—' },
        { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 100, render: (v) => v != null ? <span className="flex items-center gap-1.5"><InboxOutlined className="text-gray-400 shrink-0" />{Number(v).toLocaleString()}</span> : '—' },
        { 
            title: 'Production', 
            key: 'production_status', 
            width: 120, 
            align: 'center', 
            render: (_, r) => {
                const activeCount = productionOrders.filter(o => {
                    const whId = o.warehouseId || o.warehouse_id;
                    const targetWhId = o.targetWarehouseId || o.target_warehouse_id;
                    const orderStatus = (o.status || '').toUpperCase();
                    
                    const matchesWarehouse = (whId == r.id || targetWhId == r.id);
                    const isActive = ['DRAFT', 'VALIDATED', 'IN_PRODUCTION', 'IN PROGRESS'].includes(orderStatus);
                    
                    return matchesWarehouse && isActive;
                }).length;
                
                if (activeCount > 0) return <Tag color="gold" icon={<ThunderboltOutlined />} className="animate-pulse"> {activeCount} Active</Tag>;
                return r.isProduction ? <Tag color="blue">Available</Tag> : <Tag color="default">NO</Tag>;
            } 
        },
        {
            title: 'Actions', key: 'act', width: 140,
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => navigate(`/warehouses/${r.id}`)}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedWarehouse(r); form.setFieldsValue({ code: r.code, name: r.name, warehouseType: r.warehouseType, status: r.status, phone: r.phone, address: r.address, capacity: r.capacity, isProduction: r.isProduction }); setEditMode(true); setViewMode(false); setModalOpen(true); }} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-12 p-2 md:p-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-blue-600">Warehouse & Production</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Manage your facilities and production areas</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg w-full md:w-auto h-10 md:h-9" onClick={() => { setEditMode(false); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Facility
                    </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px' }}>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><DatabaseOutlined style={{ fontSize: 18 }} /></div>
                            <div><div className="text-[10px] text-gray-400 font-black uppercase">Total</div><div className="text-lg md:text-2xl font-black text-blue-600">{warehouses.length}</div></div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px' }}>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><CheckCircleOutlined style={{ fontSize: 18 }} /></div>
                            <div><div className="text-[10px] text-gray-400 font-black uppercase">Active</div><div className="text-lg md:text-2xl font-black text-green-600">{warehouses.filter(x => x.status === 'ACTIVE').length}</div></div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px' }}>
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><HomeOutlined style={{ fontSize: 18 }} /></div>
                            <div><div className="text-[10px] text-gray-400 font-black uppercase">Main</div><div className="text-lg md:text-2xl font-black text-purple-600">{mainCount}</div></div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px' }}>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><InboxOutlined style={{ fontSize: 18 }} /></div>
                            <div><div className="text-[10px] text-gray-400 font-black uppercase">Prep center</div><div className="text-lg md:text-2xl font-black text-orange-600">{prepCount}</div></div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <div className="p-3 md:p-6">
                        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                            <div className="flex gap-2 w-full md:max-w-md">
                                <Search placeholder="Search..." className="flex-1" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                                <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white md:hidden" onClick={fetchWarehouses} />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white hidden md:flex">Search</Button>
                                <Button icon={<ReloadOutlined />} onClick={fetchWarehouses} className="flex-1 md:flex-none">Refresh</Button>
                            </div>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={warehouses.filter(w => !searchText || (w.name || '').toLowerCase().includes(searchText.toLowerCase()) || (w.code || '').toLowerCase().includes(searchText.toLowerCase()) || (w.address || '').toLowerCase().includes(searchText.toLowerCase()))}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} warehouses`, pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                            className="custom-warehouse-table [&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Facility' : editMode ? 'Edit Facility' : 'Add Facility'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600' }}
                    cancelText={viewMode ? 'Close' : 'Cancel'}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); }}>Close</Button>] : undefined}
                    width={560}
                >
                    {viewMode && selectedWarehouse ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Facility Code</div><div className="text-gray-900">{selectedWarehouse.code ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Facility Name</div><div className="text-gray-900">{selectedWarehouse.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Category Type</div><div className="text-gray-900">{selectedWarehouse.warehouseType ? (WAREHOUSE_TYPE_LABELS[String(selectedWarehouse.warehouseType).toUpperCase()] || selectedWarehouse.warehouseType) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Status</div><div className="text-gray-900">{selectedWarehouse.status === 'ACTIVE' ? 'Active' : selectedWarehouse.status === 'INACTIVE' ? 'Inactive' : (selectedWarehouse.status ?? '—')}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Phone</div><div className="text-gray-900">{selectedWarehouse.phone ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Address</div><div className="text-gray-900 whitespace-pre-wrap">{selectedWarehouse.address ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Capacity (units)</div><div className="text-gray-900">{selectedWarehouse.capacity != null ? selectedWarehouse.capacity : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Production Area</div><div className="text-gray-900">{selectedWarehouse.isProduction ? <Tag color="gold" icon={<ThunderboltOutlined />}>YES</Tag> : 'No'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            {isSuperAdmin && !editMode && (
                                <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                    <Select placeholder="Select company" className="rounded-lg">
                                        {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            )}
                            <Form.Item label="Facility Code" name="code" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. WH-001" className="rounded-lg" disabled={editMode} />
                            </Form.Item>
                            <Form.Item label="Facility Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Warehouse name" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Facility Type" name="warehouseType">
                                <Select placeholder="Select facility type" className="rounded-lg" allowClear>
                                    <Option value="MAIN">Main</Option>
                                    <Option value="PREP">Prep</Option>
                                    <Option value="STANDARD">Standard</Option>
                                    <Option value="COLD">Cold Storage</Option>
                                    <Option value="FROZEN">Frozen</Option>
                                    <Option value="HAZMAT">Hazmat</Option>
                                    <Option value="BONDED">Bonded</Option>
                                </Select>
                     
                            </Form.Item>
                            <Form.Item label="Status" name="status" initialValue="ACTIVE">
                                <Select placeholder="Select status" className="rounded-lg">
                                    <Option value="ACTIVE">Active</Option>
                                    <Option value="INACTIVE">Inactive</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Phone" name="phone">
                                <Input placeholder="Contact number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Address" name="address">
                                <Input.TextArea rows={2} placeholder="Full address" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Capacity (units)" name="capacity">
                                <InputNumber placeholder="Max units" className="w-full rounded-lg" min={0} />
                            </Form.Item>
                            <Form.Item label="Is Production Area?" name="isProduction" valuePropName="checked">
                                <Switch checkedChildren="Yes" unCheckedChildren="No" />
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
