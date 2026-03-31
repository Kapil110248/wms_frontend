import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Tag, Card, Modal, Form, message, Space, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ShopOutlined, TeamOutlined, HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const { token, user } = useAuthStore();

    const isSuperAdmin = user?.role === 'super_admin';

    const fetchCompanies = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            if (isSuperAdmin) {
                const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
                setCompanies(Array.isArray(data?.data) ? data.data : []);
            } else {
                const data = await apiRequest('/api/company/profile', { method: 'GET' }, token);
                setCompanies(data.data ? [data.data] : []);
            }
        } catch (err) {
            message.error(err.message || 'Failed to load companies');
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            const payload = { name: values.name, code: values.code, address: values.address, phone: values.phone };
            if (editingCompany) {
                await apiRequest(`/api/superadmin/companies/${editingCompany.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                }, token);
                message.success('Company updated!');
            } else {
                await apiRequest('/api/superadmin/companies', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }, token);
                message.success('Company created!');
            }
            setModalOpen(false);
            form.resetFields();
            fetchCompanies();
        } catch (err) {
            message.error(err.message || 'Failed to save company');
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/superadmin/companies/${id}`, { method: 'DELETE' }, token);
            message.success('Company deleted');
            fetchCompanies();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const columns = [
        {
            title: 'Company Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Link to={`/companies/${record.id}`} className="font-bold text-blue-600 hover:text-blue-800">{text}</Link>
            ),
        },
        { title: 'Code', dataIndex: 'code', key: 'code', render: (val) => <Tag className="font-mono">{val}</Tag> },
        {
            title: 'Warehouses',
            align: 'center',
            render: (_, record) => <Tag color="blue" className="rounded-full px-3">{record.Warehouses?.length ?? record._count?.warehouses ?? 0}</Tag>,
        },
        {
            title: 'Users',
            align: 'center',
            render: (_, record) => <Tag color="purple" className="rounded-full px-3">{record.Users?.length ?? record._count?.users ?? 0}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => { setEditingCompany(record); form.setFieldsValue({ name: record.name, code: record.code, address: record.address, phone: record.phone }); setModalOpen(true); }} />
                    {isSuperAdmin && (
                        <Popconfirm title="Delete company?" onConfirm={() => handleDelete(record.id)}>
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const filtered = companies.filter(c => (c.name || '').toLowerCase().includes(searchText.toLowerCase()) || (c.code || '').toLowerCase().includes(searchText.toLowerCase()));

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Management</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage companies and multi-tenant setup</p>
                    </div>
                    {isSuperAdmin && (
                        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { setEditingCompany(null); form.resetFields(); setModalOpen(true); }} className="rounded-xl shadow-md h-12 px-6 bg-blue-600">
                            Add Company
                        </Button>
                    )}
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card className="hover:shadow-md transition-all rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-xl"><ShopOutlined /></div>
                                <div>
                                    <div className="text-gray-400 text-xs font-bold uppercase">Total Companies</div>
                                    <div className="text-2xl font-bold text-gray-800">{companies.length}</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className="hover:shadow-md transition-all rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-xl"><TeamOutlined /></div>
                                <div>
                                    <div className="text-gray-400 text-xs font-bold uppercase">Multi-Tenant Users</div>
                                    <div className="text-2xl font-bold text-gray-800">{companies.reduce((sum, c) => sum + (c.Users?.length ?? c._count?.users ?? 0), 0)}</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className="hover:shadow-md transition-all rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-xl"><HomeOutlined /></div>
                                <div>
                                    <div className="text-gray-400 text-xs font-bold uppercase">Active Warehouses</div>
                                    <div className="text-2xl font-bold text-gray-800">{companies.reduce((sum, c) => sum + (c.Warehouses?.length ?? c._count?.warehouses ?? 0), 0)}</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card className="shadow-sm rounded-xl border border-gray-100">
                    <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                        <Search placeholder="Search by name or code..." allowClear className="max-w-md rounded-lg" prefix={<SearchOutlined />} onChange={e => setSearchText(e.target.value)} />
                    </div>
                    <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, className: 'rounded-lg' }} />
                </Card>

                {isSuperAdmin && (
                    <Modal title={editingCompany ? 'Edit Company' : 'Add New Company'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600} className="rounded-xl">
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item label="Company Name" name="name" rules={[{ required: true }]}>
                                <Input placeholder="Enter company name" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Company Code" name="code" rules={[{ required: true }]}>
                                <Input placeholder="Unique code e.g. Acme-01" className="rounded-lg" disabled={!!editingCompany} />
                            </Form.Item>
                            <Form.Item label="Address" name="address">
                                <Input.TextArea rows={2} className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Phone" name="phone">
                                <Input className="rounded-lg" />
                            </Form.Item>
                        </Form>
                    </Modal>
                )}
            </div>
        </MainLayout>
    );
}
