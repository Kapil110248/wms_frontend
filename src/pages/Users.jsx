import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, Row, Col, Space, Avatar, message, Popconfirm, Drawer, Tabs } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';

const STAFF_ROLES = [
    { value: 'warehouse_manager', label: 'Warehouse Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
];

const SUPER_ADMIN_ROLES = [
    { value: 'company_admin', label: 'Company Admin' },
    ...STAFF_ROLES,
];

const ALL_ROLES = [...new Set([...SUPER_ADMIN_ROLES.map(r => r.value)])];

export default function Users() {
    const { token, user: currentUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState(undefined);
    const [warehouseFilter, setWarehouseFilter] = useState(undefined);
    const [activeTab, setActiveTab] = useState('all');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [form] = Form.useForm();

    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isCompanyAdmin = currentUser?.role === 'company_admin';

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/users', { method: 'GET' }, token);
            const list = Array.isArray(data?.data) ? data.data : (data?.data ? [].concat(data.data) : []);
            setUsers(list);
        } catch (err) {
            message.error(err?.message || 'Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchDependencies = useCallback(async () => {
        if (!token) return;
        try {
            if (isSuperAdmin) {
                setCompaniesLoading(true);
                const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
                const list = Array.isArray(data?.data) ? data.data : (data?.data ? [].concat(data.data) : []);
                setCompanies(list);
            }
            const whRes = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(whRes?.data) ? whRes.data : whRes?.data || []);

            // FETCH DYNAMIC ROLES
            const rolesRes = await apiRequest('/api/roles', { method: 'GET' }, token);
            setRoles(Array.isArray(rolesRes?.data) ? rolesRes.data : []);
        } catch (err) {
            if (isSuperAdmin) setCompanies([]);
            setWarehouses([]);
        } finally {
            setCompaniesLoading(false);
        }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        if (token) {
            fetchUsers();
            fetchDependencies();
        }
    }, [token, fetchUsers, fetchDependencies]);

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            const payload = { name: values.name, email: (values.email || '').trim().toLowerCase(), status: values.status || 'ACTIVE' };
            if (values.password) payload.password = values.password;
            if (isSuperAdmin) {
                payload.role = values.role || 'company_admin';
                payload.companyId = values.companyId;
                if (!payload.companyId) {
                    message.error('Select a company.');
                    return;
                }
            } else {
                payload.role = values.role;
                payload.warehouseId = values.warehouseId || undefined;
            }
            setSubmitLoading(true);
            if (selectedUser) {
                await apiRequest(`/api/users/${selectedUser.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('User updated successfully');
            } else {
                if (!payload.password || payload.password.length < 6) {
                    message.error('Password must be at least 6 characters.');
                    setSubmitLoading(false);
                    return;
                }
                await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('User added');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            message.error(err?.message || 'Failed to save user');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/users/${id}`, { method: 'DELETE' }, token);
            message.success('User deleted');
            setViewDrawerOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const openAdd = () => {
        setSelectedUser(null);
        form.resetFields();
        form.setFieldsValue({ status: 'ACTIVE', ...(isSuperAdmin ? { role: 'company_admin' } : {}) });
        if (isSuperAdmin) fetchDependencies();
        setModalOpen(true);
    };

    const openEdit = (r) => {
        setSelectedUser(r);
        form.setFieldsValue({
            name: r.name,
            email: r.email,
            role: r.role,
            companyId: r.companyId || r.Company?.id,
            warehouseId: r.warehouseId || r.Warehouse?.id,
            status: r.status || 'ACTIVE',
        });
        setModalOpen(true);
    };

    const openView = (r) => {
        setSelectedUser(r);
        setViewDrawerOpen(true);
    };

    const listUsers = users.filter(u => (u.role || '').toLowerCase() !== 'super_admin');
    const filtered = listUsers.filter(u => {
        if (searchText && !(u.name || '').toLowerCase().includes(searchText.toLowerCase()) && !(u.email || '').toLowerCase().includes(searchText.toLowerCase())) return false;
        if (roleFilter && (u.role || '') !== roleFilter) return false;
        if (warehouseFilter && (u.warehouseId || u.Warehouse?.id) !== warehouseFilter) return false;
        if (activeTab === 'active' && (u.status || '').toUpperCase() !== 'ACTIVE') return false;
        if (activeTab === 'inactive' && (u.status || '').toUpperCase() === 'ACTIVE') return false;
        if (activeTab === 'admins' && !(u.role || '').toLowerCase().includes('admin')) return false;
        return true;
    });

    const totalCount = listUsers.length;
    const activeCount = listUsers.filter(u => (u.status || '').toUpperCase() === 'ACTIVE').length;
    const inactiveCount = listUsers.filter(u => (u.status || '').toUpperCase() !== 'ACTIVE').length;
    const adminsCount = listUsers.filter(u => (u.role || '').toLowerCase().includes('admin')).length;
    const rolesCount = roles.length || ALL_ROLES.length;

    const columns = [
        {
            title: 'User',
            key: 'user',
            width: 220,
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <Avatar icon={<UserOutlined />} className="bg-blue-50 text-blue-500" />
                    <div>
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.email}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Role', dataIndex: 'role', key: 'role', width: 150, render: (role) => <Tag color={role?.toLowerCase?.().includes('admin') ? 'red' : 'blue'}>{role?.replace(/_/g, ' ') || '—'}</Tag> },
        { title: 'Company', key: 'company', width: 140, render: (_, r) => <span className="text-sm text-gray-600">{r.Company?.name || '—'}</span> },
        { title: 'Warehouse', key: 'wh', width: 140, render: (_, r) => <span className="text-sm text-gray-600">{r.Warehouse?.name || '—'}</span> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={(v || 'ACTIVE') === 'ACTIVE' ? 'green' : 'orange'}>{v || 'ACTIVE'}</Tag> },
        {
            title: 'Actions',
            key: 'act',
            width: 180,
            render: (_, r) => (
                <Space size="small" wrap>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="p-0 text-blue-600" onClick={() => openView(r)}>View</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} className="p-0 text-blue-600" onClick={() => openEdit(r)}>Edit</Button>
                    <Popconfirm title="Delete this user?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(r.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabContent = (
        <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-0 py-4 border-b border-gray-100">
                <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} className="w-full sm:w-56 rounded-lg" allowClear />
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select placeholder="Role" allowClear value={roleFilter} onChange={setRoleFilter} className="flex-1 sm:w-40 rounded-lg" options={[...STAFF_ROLES, ...((isSuperAdmin || isCompanyAdmin) ? [{ value: 'company_admin', label: 'Company Admin' }] : [])]} />
                    <Select placeholder="Warehouse" allowClear value={warehouseFilter} onChange={setWarehouseFilter} className="flex-1 sm:w-44 rounded-lg" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading} className="w-full sm:w-auto rounded-lg">Refresh</Button>
            </div>
            <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} pagination={{ showSizeChanger: true, showTotal: t => `Total ${t} users`, pageSize: 10 }} scroll={{ x: 'max-content' }} locale={{ emptyText: 'No data' }} className="[&_.ant-table-thead_th]:font-normal" />
        </>
    );

    return (
        <MainLayout>
            <div className="p-2 md:p-6 space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold text-blue-600">User Management</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Manage user accounts, roles, and permissions</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg w-full sm:w-auto" onClick={openAdd}>Add User</Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100" styles={{ body: { padding: '12px' } }}>
                        <div className="text-gray-500 text-[10px] md:text-sm uppercase font-bold tracking-wider">Users</div>
                        <div className="text-lg md:text-2xl font-bold text-blue-600">{totalCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100" styles={{ body: { padding: '12px' } }}>
                        <div className="text-gray-500 text-[10px] md:text-sm uppercase font-bold tracking-wider">Active</div>
                        <div className="text-lg md:text-2xl font-bold text-green-600">{activeCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100" styles={{ body: { padding: '12px' } }}>
                        <div className="text-gray-500 text-[10px] md:text-sm uppercase font-bold tracking-wider">Roles</div>
                        <div className="text-lg md:text-2xl font-bold text-purple-600">{rolesCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100" styles={{ body: { padding: '12px' } }}>
                        <div className="text-gray-500 text-[10px] md:text-sm uppercase font-bold tracking-wider">WH</div>
                        <div className="text-lg md:text-2xl font-bold text-orange-600">{warehouses.length}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="px-2 md:px-4 pt-2 [&_.ant-tabs-nav]:mb-0"
                        items={[
                            { key: 'all', label: <span className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm"><TeamOutlined /> All ({totalCount})</span>, children: <div className="p-2 md:p-0">{tabContent}</div> },
                            { key: 'active', label: <span className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm"><UserOutlined /> Active ({activeCount})</span>, children: <div className="p-2 md:p-0">{tabContent}</div> },
                            { key: 'inactive', label: <span className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm"><ClockCircleOutlined /> Inactive ({inactiveCount})</span>, children: <div className="p-2 md:p-0">{tabContent}</div> },
                            { key: 'admins', label: <span className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm"><UserOutlined /> Admins ({adminsCount})</span>, children: <div className="p-2 md:p-0">{tabContent}</div> },
                        ]}
                    />
                </Card>

                <Modal title={selectedUser ? 'Edit User' : (isSuperAdmin ? 'Add Company Admin' : 'Add User')} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedUser(null); }} footer={null} width={600} className="rounded-xl" destroyOnHidden>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                        <Row gutter={16}>
                            <Col span={12}><Form.Item label="Name" name="name" rules={[{ required: true }]}><Input placeholder="Full name" className="rounded-lg" /></Form.Item></Col>
                            <Col span={12}><Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}><Input placeholder="user@company.com" className="rounded-lg" /></Form.Item></Col>
                        </Row>
                        {!selectedUser && <Form.Item label="Password" name="password" rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}><Input.Password placeholder="Min 6 characters" className="rounded-lg" /></Form.Item>}
                        {isSuperAdmin ? (
                            <>
                                <Form.Item label="Role" name="role" rules={[{ required: true }]} initialValue="company_admin">
                                    <Select placeholder="Select role" className="rounded-lg" optionFilterProp="label" options={SUPER_ADMIN_ROLES} />
                                </Form.Item>
                                <Form.Item label="Company" name="companyId" rules={[{ required: !selectedUser, message: 'Select company' }]}>
                                    <Select placeholder={companiesLoading ? 'Loading...' : 'Select company'} loading={companiesLoading} className="rounded-lg" allowClear disabled={!!selectedUser} optionFilterProp="label" options={companies.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))} />
                                </Form.Item>
                            </>
                        ) : (
                            <>
                                <Form.Item label="Role" name="role" rules={[{ required: true }]}>
                                    <Select
                                        placeholder="Select role"
                                        className="rounded-lg"
                                        options={roles.map(r => ({ value: r.roleKey, label: r.name }))}
                                    />
                                </Form.Item>
                                <Form.Item label="Warehouse" name="warehouseId">
                                    <Select className="rounded-lg" allowClear placeholder="Optional" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                                </Form.Item>
                            </>
                        )}
                        <Form.Item label="Status" name="status" initialValue="ACTIVE">
                            <Select className="rounded-lg" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setModalOpen(false); setSelectedUser(null); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={submitLoading} className="bg-blue-600 border-blue-600 rounded-lg">Save</Button>
                        </div>
                    </Form>
                </Modal>

                <Drawer title="User details" width={400} open={viewDrawerOpen} onClose={() => { setViewDrawerOpen(false); setSelectedUser(null); }} className="rounded-l-xl" destroyOnHidden>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Avatar icon={<UserOutlined />} size={56} className="bg-blue-50 text-blue-500" />
                                <div>
                                    <div className="font-semibold text-gray-900">{selectedUser.name}</div>
                                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                                </div>
                            </div>
                            <div><span className="text-gray-500 text-sm block">Role</span><Tag color="blue">{selectedUser.role?.replace(/_/g, ' ') || '—'}</Tag></div>
                            <div><span className="text-gray-500 text-sm block">Company</span><div className="font-medium">{selectedUser.Company?.name || '—'}</div></div>
                            <div><span className="text-gray-500 text-sm block">Warehouse</span><div className="font-medium">{selectedUser.Warehouse?.name || '—'}</div></div>
                            <div><span className="text-gray-500 text-sm block">Status</span><Tag color={selectedUser.status === 'ACTIVE' ? 'green' : 'orange'}>{selectedUser.status || 'ACTIVE'}</Tag></div>
                            <div className="flex gap-2 pt-4 border-t">
                                <Button type="primary" icon={<EditOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setViewDrawerOpen(false); openEdit(selectedUser); }}>Edit</Button>
                                <Popconfirm title="Delete this user?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(selectedUser.id)}>
                                    <Button danger icon={<DeleteOutlined />} className="rounded-lg">Delete</Button>
                                </Popconfirm>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
