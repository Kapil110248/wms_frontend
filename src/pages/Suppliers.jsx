import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Space, Card, Form, Drawer, Modal, message, Popconfirm, Tag } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ContactsOutlined,
    MailOutlined,
    PhoneOutlined,
    ReloadOutlined,
    BankOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;

export default function Suppliers() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchSuppliers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/suppliers', { method: 'GET' }, token);
            setSuppliers(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err?.message || 'Failed to load suppliers');
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchCompanies = useCallback(async () => {
        if (!token || !isSuperAdmin) return;
        try {
            const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
            setCompanies(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setCompanies([]);
        }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        if (token) {
            fetchSuppliers();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchSuppliers, isSuperAdmin, fetchCompanies]);

    const filteredSuppliers = suppliers.filter((s) => {
        if (!searchText.trim()) return true;
        const q = searchText.toLowerCase().trim();
        return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q)) ||
            (s.code && s.code.toLowerCase().includes(q)) ||
            (s.phone && s.phone.toLowerCase().includes(q)) ||
            (s.address && s.address.toLowerCase().includes(q))
        );
    });

    const activeCount = suppliers.length; // or filter by status if you add one later

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                code: values.code,
                name: values.name,
                email: values.email || null,
                phone: values.phone || null,
                address: values.address || null,
            };
            if (isSuperAdmin && !editMode) payload.companyId = values.companyId;
            if (editMode && selectedSupplier) {
                await apiRequest(
                    `/api/suppliers/${selectedSupplier.id}`,
                    { method: 'PUT', body: JSON.stringify(payload) },
                    token
                );
                message.success('Supplier updated!');
            } else {
                await apiRequest('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Supplier created!');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedSupplier(null);
            setEditMode(false);
            fetchSuppliers();
        } catch (error) {
            message.error(error?.message || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/suppliers/${id}`, { method: 'DELETE' }, token);
            message.success('Supplier deleted');
            setViewDrawerOpen(false);
            setSelectedSupplier(null);
            fetchSuppliers();
        } catch (err) {
            // Check if backend returned a 400 error with a specific message
            if (err.status === 400 || err.message.toLowerCase().includes('foreign key constraint')) {
                Modal.info({
                    title: 'Supplier in Use',
                    content: (
                        <div className="pt-2">
                            <p className="font-medium text-gray-800">
                                {err.message || 'This supplier is currently used in products or purchase orders.'}
                            </p>
                            <p className="text-gray-500 text-xs mt-3">
                                You cannot delete this supplier because it has active data associated with it in the system.
                            </p>
                        </div>
                    ),
                    okText: 'Understood',
                    okButtonProps: { className: 'bg-blue-600 border-blue-600' },
                    centered: true,
                    className: 'rounded-2xl',
                });
            } else {
                message.error(err?.message || 'Failed to delete');
            }
        }
    };

    const handleEdit = (record) => {
        setSelectedSupplier(record);
        form.setFieldsValue({
            code: record.code,
            name: record.name,
            email: record.email,
            phone: record.phone,
            address: record.address,
            companyId: record.companyId,
        });
        setEditMode(true);
        setModalOpen(true);
    };

    const openView = (record) => {
        setSelectedSupplier(record);
        setViewDrawerOpen(true);
    };

    const openAdd = () => {
        setEditMode(false);
        setSelectedSupplier(null);
        form.resetFields();
        setModalOpen(true);
    };

    const columns = [
        {
            title: 'Supplier Code',
            dataIndex: 'code',
            key: 'code',
            width: 130,
            render: (text) => <span className="font-medium text-gray-800">{text || '—'}</span>,
        },
        {
            title: 'Supplier Name',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (text) => (
                <span className="flex items-center gap-2 text-gray-800">
                    <BankOutlined className="text-blue-500" />
                    {text || '—'}
                </span>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 200,
            render: (email) => (
                <span className="flex items-center gap-1.5 text-gray-600">
                    <MailOutlined className="text-gray-400" />
                    {email || '—'}
                </span>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            width: 140,
            render: (phone) => (
                <span className="flex items-center gap-1.5 text-gray-600">
                    <PhoneOutlined className="text-gray-400" />
                    {phone || '—'}
                </span>
            ),
        },
        {
            title: 'Products',
            key: 'productsCount',
            width: 120,
            render: (_, record) => (
                <Tag color="processing" className="rounded-lg">
                    {record.Products?.length || 0} Items
                </Tag>
            ),
        },
        {
            title: 'Total Stock',
            key: 'totalStock',
            width: 120,
            render: (_, record) => {
                const total = record.Products?.reduce((acc, p) => {
                    const productTotal = p.ProductStocks?.reduce((pAcc, s) => pAcc + parseFloat(s.quantity || 0), 0) || 0;
                    return acc + productTotal;
                }, 0) || 0;
                return <span className="font-bold text-gray-800">{total} Units</span>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space size="small" wrap>
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        className="text-blue-600 p-0"
                        onClick={() => openView(record)}
                    >
                        View
                    </Button>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        className="text-blue-600 p-0"
                        onClick={() => handleEdit(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this supplier?"
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
            <div className={`p-2 md:p-6 space-y-6 animate-in fade-in duration-500 pb-12`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold">
                            <span className="text-blue-600">Supplier</span>{' '}
                            <span className="text-purple-600">Management</span>
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-0.5">
                            Manage your supplier database and relationships
                        </p>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="bg-blue-600 border-blue-600 rounded-lg w-full sm:w-auto"
                        onClick={openAdd}
                    >
                        Add Supplier
                    </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100" bodyStyle={{ padding: '12px md:padding: 24px' }}>
                        <div className="text-gray-500 text-[10px] md:text-sm font-normal uppercase tracking-wider">Total</div>
                        <div className="text-lg md:text-2xl font-bold text-blue-600">{suppliers.length}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100" bodyStyle={{ padding: '12px md:padding: 24px' }}>
                        <div className="text-gray-500 text-[10px] md:text-sm font-normal uppercase tracking-wider">Active</div>
                        <div className="text-lg md:text-2xl font-bold text-green-600">{activeCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden" bodyStyle={{ padding: '12px' }}>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                        <Search
                            placeholder="Search..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full sm:max-w-sm rounded-lg"
                            prefix={<SearchOutlined className="text-blue-500" />}
                            allowClear
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchSuppliers}
                            loading={loading}
                            className="rounded-lg w-full sm:w-auto"
                        >
                            Refresh
                        </Button>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filteredSuppliers}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            showSizeChanger: true,
                            showTotal: (t) => `Total ${t} suppliers`,
                            pageSize: 10,
                        }}
                        scroll={{ x: 'max-content' }}
                        className="[&_.ant-table-thead_th]:font-normal"
                    />
                </Card>

                {/* Add / Edit Modal */}
                <Modal
                    title={editMode ? 'Edit Supplier' : 'Add Supplier'}
                    open={modalOpen}
                    onCancel={() => {
                        setModalOpen(false);
                        setSelectedSupplier(null);
                        setEditMode(false);
                    }}
                    footer={null}
                    width={520}
                    className="rounded-xl"
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        {isSuperAdmin && !editMode && (
                            <Form.Item
                                label="Company"
                                name="companyId"
                                rules={[{ required: true, message: 'Select company' }]}
                            >
                                <Select
                                    placeholder="Select company"
                                    className="rounded-lg"
                                    showSearch
                                    optionFilterProp="label"
                                    options={companies.map((c) => ({ value: c.id, label: c.name }))}
                                />
                            </Form.Item>
                        )}
                        <Form.Item
                            label="Supplier Code"
                            name="code"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Input placeholder="e.g. SUP001" disabled={editMode} className="rounded-lg" />
                        </Form.Item>
                        <Form.Item
                            label="Supplier Name"
                            name="name"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Input placeholder="Supplier or company name" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Email" name="email">
                            <Input type="email" placeholder="email@example.com" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Phone" name="phone">
                            <Input placeholder="Phone number" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Address" name="address">
                            <Input.TextArea rows={3} placeholder="Full address" className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                onClick={() => {
                                    setModalOpen(false);
                                    setSelectedSupplier(null);
                                    setEditMode(false);
                                }}
                                className="rounded-lg"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={saving}
                                className="bg-blue-600 border-blue-600 rounded-lg"
                            >
                                {editMode ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </Form>
                </Modal>

                {/* View Drawer */}
                <Drawer
                    title={`Supplier: ${selectedSupplier?.name || '—'}`}
                    width={typeof window !== 'undefined' && window.innerWidth < 500 ? '100%' : 480}
                    open={viewDrawerOpen}
                    onClose={() => {
                        setViewDrawerOpen(false);
                        setSelectedSupplier(null);
                    }}
                    className="rounded-l-3xl"
                    destroyOnClose
                >
                    {selectedSupplier && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">
                                        Supplier Code
                                    </div>
                                    <div className="font-medium text-gray-800">{selectedSupplier.code || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <BankOutlined /> Supplier Name
                                    </div>
                                    <div className="font-medium text-gray-800">{selectedSupplier.name || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <MailOutlined /> Email
                                    </div>
                                    <div className="text-gray-800">{selectedSupplier.email || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <PhoneOutlined /> Phone
                                    </div>
                                    <div className="text-gray-800">{selectedSupplier.phone || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <EnvironmentOutlined /> Address
                                    </div>
                                    <div className="text-gray-800 whitespace-pre-wrap">
                                        {selectedSupplier.address || '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-gray-200">
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    className="bg-blue-600 border-blue-600 rounded-lg"
                                    onClick={() => {
                                        setViewDrawerOpen(false);
                                        handleEdit(selectedSupplier);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Popconfirm
                                    title="Delete this supplier?"
                                    okText="Yes"
                                    cancelText="No"
                                    onConfirm={() => handleDelete(selectedSupplier.id)}
                                >
                                    <Button danger icon={<DeleteOutlined />} className="rounded-lg">
                                        Delete
                                    </Button>
                                </Popconfirm>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
