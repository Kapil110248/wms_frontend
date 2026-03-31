import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, Space, Tag, message, Select, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, AppstoreOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Search } = Input;
const { Option } = Select;

export default function Categories() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/inventory/categories', { method: 'GET' }, token);
            setCategories(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load categories');
            setCategories([]);
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

    useEffect(() => {
        if (token) {
            fetchCategories();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchCategories, isSuperAdmin, fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { name: values.name, code: values.code?.trim() || values.name?.replace(/\s/g, '_').toUpperCase().slice(0, 50) };
            if (isSuperAdmin && !selectedCategory) payload.companyId = values.companyId;
            if (selectedCategory) {
                await apiRequest(`/api/inventory/categories/${selectedCategory.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Category updated');
            } else {
                await apiRequest('/api/inventory/categories', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Category created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedCategory(null);
            fetchCategories();
        } catch (err) {
            message.error(err.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/inventory/categories/${id}`, { method: 'DELETE' }, token);
            message.success('Category deleted');
            fetchCategories();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const filteredCategories = categories.filter(c => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        return (c.name || '').toLowerCase().includes(s) || (c.code || '').toLowerCase().includes(s);
    });

    const totalProducts = categories.reduce((s, c) => s + (c.productCount || 0), 0);

    const columns = [
        { title: 'Code', dataIndex: 'code', key: 'code', width: 140, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><AppstoreOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Products', dataIndex: 'productCount', key: 'count', width: 120, render: (v) => <Tag color={(v || 0) > 0 ? 'green' : 'default'} className="rounded-full font-normal">{(v || 0)} items</Tag> },
        {
            title: 'Actions',
            key: 'act',
            width: 140,
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedCategory(r); setViewMode(true); setModalOpen(true); form.setFieldsValue({ name: r.name, code: r.code, companyId: r.companyId }); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedCategory(r); setViewMode(false); form.setFieldsValue({ name: r.name, code: r.code, companyId: r.companyId }); setModalOpen(true); }} />
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-12 p-2 md:p-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-blue-600">Categories</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Manage inventory classifications</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg w-full md:w-auto h-10 md:h-9" onClick={() => { setSelectedCategory(null); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Category
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:24px' }}>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><AppstoreOutlined style={{ fontSize: 18 }} /></div>
                            <div>
                                <div className="text-[10px] text-gray-400 font-black uppercase">Categories</div>
                                <div className="text-lg md:text-2xl font-black text-blue-600">{categories.length}</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:24px' }}>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><AppstoreOutlined style={{ fontSize: 18 }} /></div>
                            <div>
                                <div className="text-[10px] text-gray-400 font-black uppercase">Products</div>
                                <div className="text-lg md:text-2xl font-black text-green-600">{totalProducts}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <div className="p-3 md:p-6">
                        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                            <div className="flex gap-2 w-full md:max-w-md">
                                <Search placeholder="Search..." className="flex-1" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                                <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white md:hidden" onClick={fetchCategories} />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white hidden md:flex">Search</Button>
                                <Button icon={<ReloadOutlined />} onClick={fetchCategories} className="flex-1 md:flex-none">Refresh</Button>
                            </div>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredCategories}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} categories`, pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Category' : selectedCategory ? 'Edit Category' : 'Add Category'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedCategory(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedCategory(null); }}>Close</Button>] : undefined}
                    width={520}
                >
                    {viewMode && selectedCategory ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Category Name</div><div className="text-gray-900">{selectedCategory.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Code</div><div className="text-gray-900">{selectedCategory.code ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Products</div><div className="text-gray-900">{selectedCategory.productCount != null ? selectedCategory.productCount : '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            {isSuperAdmin && !selectedCategory && (
                                <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                    <Select placeholder="Select company" className="rounded-lg">
                                        {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            )}
                            <Form.Item label="Category Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. Electronics" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Code" name="code">
                                <Input placeholder="Optional - auto from name if empty" className="rounded-lg" />
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
