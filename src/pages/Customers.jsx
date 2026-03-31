import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Drawer, Modal, Tabs, message, Popconfirm } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Option } = Select;

export default function Customers() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchCustomers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/orders/customers', { method: 'GET' }, token);
            setCustomers(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load customers');
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const filteredCustomers = customers.filter((c) => {
        const matchesSearch = !searchText ||
            c.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchText.toLowerCase()) ||
            c.code?.toLowerCase().includes(searchText.toLowerCase());
        return matchesSearch;
    });

    const b2cCustomers = filteredCustomers.filter(c => (c.type || c.customerType) === 'B2C');
    const b2bCustomers = filteredCustomers.filter(c => (c.type || c.customerType) === 'B2B');

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { ...values, type: values.type || values.customerType };
            if (editMode && selectedCustomer) {
                await apiRequest(`/api/orders/customers/${selectedCustomer.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Customer updated!');
            } else {
                await apiRequest('/api/orders/customers', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Customer created!');
            }
            setModalOpen(false);
            form.resetFields();
            fetchCustomers();
        } catch (error) {
            message.error(error.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/orders/customers/${id}`, { method: 'DELETE' }, token);
            message.success('Customer deleted');
            fetchCustomers();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const handleEdit = (record) => {
        setSelectedCustomer(record);
        form.setFieldsValue({
            code: record.code,
            name: record.name,
            type: record.type || record.customerType,
            customerType: record.type || record.customerType,
            email: record.email,
            phone: record.phone,
            address: record.address,
            postcode: record.postcode,
        });
        setEditMode(true);
        setModalOpen(true);
    };

    const columns = [
        {
            title: 'Customer Code',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <Tag className="font-mono bg-slate-50">{text || '-'}</Tag>,
        },
        {
            title: 'Customer Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <span className="flex items-center gap-1.5">
                    <UserOutlined className="text-gray-400" />
                    <span className="font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => { setSelectedCustomer(record); setDrawerOpen(true); }}>
                        {text || '-'}
                    </span>
                </span>
            ),
        },
        {
            title: 'Customer Type',
            dataIndex: 'type',
            key: 'type',
            render: (_, record) => {
                const t = record.type || record.customerType;
                return <Tag color={t === 'B2B' ? 'purple' : 'green'}>{t || '-'}</Tag>;
            },
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email) => <span className="text-gray-600"><MailOutlined className="mr-1 text-gray-400" /> {email || '-'}</span>,
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone) => <span className="text-gray-600"><PhoneOutlined className="mr-1 text-gray-400" /> {phone || '-'}</span>,
        },
        {
            title: 'Address',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
            render: (addr) => <span className="text-gray-600">{addr ? (addr.length > 40 ? addr.slice(0, 40) + '…' : addr) : '-'}</span>,
        },
        {
            title: 'Postcode',
            dataIndex: 'postcode',
            key: 'postcode',
            render: (pc) => <span className="text-gray-600 font-mono">{pc || '-'}</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedCustomer(record); setDrawerOpen(true); }}>View</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
                    <Popconfirm title="Delete this customer?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const renderTable = (dataSource) => (
        <div className="mt-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="Search by name, email, or code..."
                    className="max-w-xs rounded-lg"
                    prefix={<SearchOutlined className="text-gray-400" />}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    allowClear
                />
                <Button type="primary" icon={<SearchOutlined />} className="rounded-lg" onClick={() => {}} />
                <Button icon={<ReloadOutlined />} onClick={fetchCustomers} className="rounded-lg">Refresh</Button>
            </div>
            <Table columns={columns} dataSource={dataSource} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} customers` }} />
        </div>
    );

    const tabItems = [
        { key: 'all', label: <span><MailOutlined className="mr-1" />All Customers ({filteredCustomers.length})</span>, children: renderTable(filteredCustomers) },
        { key: 'b2c', label: <span><UserOutlined className="mr-1" />B2C ({b2cCustomers.length})</span>, children: renderTable(b2cCustomers) },
        { key: 'b2b', label: <span><CheckCircleOutlined className="mr-1" />B2B ({b2bCustomers.length})</span>, children: renderTable(b2bCustomers) },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Customer Management</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage your customer database and relationships</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-11 rounded-xl shadow-md bg-blue-600" onClick={() => { setEditMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Customer
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-blue-600 font-semibold text-xs uppercase mb-1">Total Customers</div>
                        <div className="text-2xl font-bold text-slate-800">{customers.length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-green-600 font-semibold text-xs uppercase mb-1">B2C Customers</div>
                        <div className="text-2xl font-bold text-slate-800">{b2cCustomers.length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-purple-600 font-semibold text-xs uppercase mb-1">B2B Customers</div>
                        <div className="text-2xl font-bold text-slate-800">{b2bCustomers.length}</div>
                    </Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="custom-tabs" />
                </Card>

                <Drawer title="Customer Insight" placement="right" width={500} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    {selectedCustomer && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-6 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedCustomer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h2>
                                        <Tag color={selectedCustomer.type === 'B2B' ? 'purple' : 'green'}>{selectedCustomer.type || selectedCustomer.customerType}</Tag>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Contact Email</span><span className="font-medium">{selectedCustomer.email || '-'}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Phone Number</span><span className="font-medium">{selectedCustomer.phone || '-'}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Unique Code</span><span className="font-mono">{selectedCustomer.code}</span></div>
                                <div className="pt-2"><span className="text-gray-500 block mb-1">Billing Address</span><p className="font-medium text-slate-700">{selectedCustomer.address || '—'}</p></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Postcode</span><span className="font-mono font-medium">{selectedCustomer.postcode || '—'}</span></div>
                            </div>
                        </div>
                    )}
                </Drawer>

                <Modal title={editMode ? 'Edit Customer' : 'Add Customer'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={saving} okText="Save" className="rounded-xl">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                        <Form.Item label="Customer Code" name="code" rules={[{ required: true, message: 'Enter customer code' }]}>
                            <Input placeholder="e.g. CUST-001" disabled={editMode} className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Customer Name" name="name" rules={[{ required: true, message: 'Enter customer name' }]}>
                            <Input placeholder="Full name" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Customer Type" name="type" rules={[{ required: true, message: 'Select customer type' }]}>
                            <Select placeholder="Select customer type" className="rounded-lg" allowClear>
                                <Option value="B2C">B2C</Option>
                                <Option value="B2B">B2B</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Email" name="email">
                            <Input placeholder="email@example.com" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Phone" name="phone">
                            <Input placeholder="Phone number" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Address" name="address">
                            <Input.TextArea rows={3} placeholder="Full address" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Postcode" name="postcode">
                            <Input placeholder="Postcode / ZIP" className="rounded-lg" />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
