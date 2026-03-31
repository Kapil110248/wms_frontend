import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
    Input,
    Select,
    Tag,
    Card,
    Space,
    Avatar,
    Modal,
    Form,
    message,
    Popconfirm,
    InputNumber,
    Drawer,
    Divider,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReloadOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    CrownOutlined,
    StarOutlined,
    BankOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';
import { formatCurrency } from '../utils';

const { Search } = Input;

const CLIENT_TYPES = [
    { value: 'B2B', label: 'B2B' },
    { value: 'B2C', label: 'B2C' },
];

const TIER_OPTIONS = [
    { value: 'Standard', label: 'Standard' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Premium', label: 'Premium' },
];

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
];

// Normalize customer from API (handles camelCase / snake_case / Sequelize)
function normalizeCustomer(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    return {
        ...raw,
        id: raw.id,
        code: raw.code ?? null,
        name: raw.name,
        type: raw.type ?? null,
        contactPerson: raw.contactPerson ?? raw.contact_person ?? null,
        email: raw.email ?? null,
        phone: raw.phone ?? null,
        country: raw.country ?? null,
        state: raw.state ?? null,
        city: raw.city ?? null,
        address: raw.address ?? null,
        segment: raw.segment ?? null,
        tier: raw.tier ?? null,
        creditLimit: raw.creditLimit ?? raw.credit_limit ?? null,
        paymentTerms: raw.paymentTerms ?? raw.payment_terms ?? null,
        status: raw.status ?? 'ACTIVE',
        companyId: raw.companyId ?? raw.company_id ?? null,
    };
}

export default function Clients() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState(undefined);
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [tierFilter, setTierFilter] = useState(undefined);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchClients = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/orders/customers', { method: 'GET' }, token);
            const list = Array.isArray(res?.data) ? res.data : [];
            setClients(list.map(normalizeCustomer));
        } catch (err) {
            message.error(err?.message || 'Failed to load clients');
            setClients([]);
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
            fetchClients();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchClients, isSuperAdmin, fetchCompanies]);

    const filteredClients = clients.filter((c) => {
        if (typeFilter && (c.type || '') !== typeFilter) return false;
        if (statusFilter && (c.status || '').toUpperCase() !== statusFilter) return false;
        if (tierFilter && (c.tier || '') !== tierFilter) return false;
        if (!searchText.trim()) return true;
        const q = searchText.toLowerCase().trim();
        return (
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q))
        );
    });

    const totalCount = clients.length;
    const b2bCount = clients.filter((c) => (c.type || '') === 'B2B').length;
    const b2cCount = clients.filter((c) => (c.type || '') === 'B2C').length;
    const activeCount = clients.filter((c) => (c.status || '').toUpperCase() === 'ACTIVE').length;
    const premiumCount = clients.filter((c) => (c.tier || '') === 'Premium').length;

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                code: values.code || null,
                name: values.name,
                type: values.type || null,
                contactPerson: values.contactPerson || null,
                email: values.email || null,
                phone: values.phone || null,
                country: values.country || null,
                state: values.state || null,
                city: values.city || null,
                address: values.address || null,
                tier: values.tier || null,
                segment: values.segment || null,
                creditLimit: values.creditLimit != null ? Number(values.creditLimit) : null,
                paymentTerms: values.paymentTerms || null,
                status: values.status || 'ACTIVE',
            };
            if (isSuperAdmin && !selectedClient) payload.companyId = values.companyId;
            if (selectedClient) {
                await apiRequest(
                    `/api/orders/customers/${selectedClient.id}`,
                    { method: 'PUT', body: JSON.stringify(payload) },
                    token
                );
                message.success('Client updated');
            } else {
                const res = await apiRequest(
                    '/api/orders/customers',
                    { method: 'POST', body: JSON.stringify(payload) },
                    token
                );
                message.success('Client added');
                // Add new client to list immediately so table updates (normalized so type/segment/tier show)
                if (res?.data && res.data.id) {
                    setClients((prev) => [normalizeCustomer(res.data), ...prev]);
                }
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedClient(null);
            await fetchClients();
        } catch (err) {
            message.error(err?.message || 'Failed to save client');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/orders/customers/${id}`, { method: 'DELETE' }, token);
            message.success('Client deleted');
            setViewDrawerOpen(false);
            setSelectedClient(null);
            await fetchClients();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const openEdit = (record) => {
        setSelectedClient(record);
        form.setFieldsValue({
            code: record.code,
            name: record.name,
            type: record.type,
            contactPerson: record.contactPerson,
            email: record.email,
            phone: record.phone,
            country: record.country,
            state: record.state,
            city: record.city,
            address: record.address,
            tier: record.tier,
            segment: record.segment,
            creditLimit: record.creditLimit != null ? record.creditLimit : undefined,
            paymentTerms: record.paymentTerms,
            status: record.status || 'ACTIVE',
            companyId: record.companyId,
        });
        setModalOpen(true);
    };

    const openAdd = () => {
        setSelectedClient(null);
        form.resetFields();
        form.setFieldsValue({ status: 'ACTIVE' });
        setModalOpen(true);
    };

    const openView = (record) => {
        setSelectedClient(record);
        setViewDrawerOpen(true);
    };

    const locationText = (c) => {
        const parts = [c.city, c.state, c.country].filter(Boolean);
        const loc = parts.join(', ');
        return c.address ? `${c.address}${loc ? ` · ${loc}` : ''}` : loc || '—';
    };

    const columns = [
        {
            title: 'Client',
            key: 'client',
            width: 220,
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <Avatar className="bg-purple-500 shrink-0" icon={<UserOutlined />} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium text-gray-800">
                            {r.name || '—'}
                            {(r.tier || '').toLowerCase() === 'gold' && (
                                <CrownOutlined className="text-yellow-500" />
                            )}
                            {(r.tier || '').toLowerCase() === 'premium' && (
                                <StarOutlined className="text-orange-400" />
                            )}
                        </div>
                        <div className="text-xs text-gray-500">{r.code || '—'}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 90,
            render: (v) =>
                v ? (
                    <Tag color="blue" className="m-0">
                        {v}
                    </Tag>
                ) : (
                    '—'
                ),
        },
        {
            title: 'Contact',
            key: 'contact',
            width: 200,
            render: (_, r) => (
                <div className="text-sm">
                    <div className="font-medium text-gray-800">{r.contactPerson || '—'}</div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <MailOutlined /> {r.email || '—'}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <PhoneOutlined /> {r.phone || '—'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Location',
            key: 'location',
            width: 180,
            ellipsis: true,
            render: (_, r) => (
                <span className="text-gray-600 text-sm" title={locationText(r)}>
                    {locationText(r)}
                </span>
            ),
        },
        {
            title: 'Segment',
            dataIndex: 'segment',
            key: 'segment',
            width: 90,
            render: (v) =>
                v ? (
                    <Tag color="cyan" className="m-0">
                        {v}
                    </Tag>
                ) : (
                    '—'
                ),
        },
        {
            title: 'Tier',
            dataIndex: 'tier',
            key: 'tier',
            width: 100,
            render: (v) => {
                if (!v) return '—';
                const color = v === 'Gold' ? 'gold' : v === 'Premium' ? 'orange' : 'default';
                return (
                    <Tag color={color} className="m-0">
                        {v}
                    </Tag>
                );
            },
        },
        {
            title: 'Credit Limit',
            dataIndex: 'creditLimit',
            key: 'creditLimit',
            width: 110,
            align: 'right',
            render: (v) => (v != null && v !== '' ? formatCurrency(Number(v), 'GBP') : '—'),
        },
        {
            title: 'Terms',
            dataIndex: 'paymentTerms',
            key: 'paymentTerms',
            width: 100,
            render: (v) =>
                v ? (
                    <Tag color="blue" className="m-0">
                        {v}
                    </Tag>
                ) : (
                    '—'
                ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (v) => {
                const s = (v || 'ACTIVE').toUpperCase();
                const color = s === 'ACTIVE' ? 'green' : 'default';
                return (
                    <Tag color={color} className="m-0">
                        {s}
                    </Tag>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            fixed: 'right',
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
                        onClick={() => openEdit(record)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this client?"
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
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-purple-600">3PL Clients</h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Manage third-party logistics clients who store inventory in your warehouse
                        </p>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="bg-blue-600 border-blue-600 rounded-lg"
                        onClick={openAdd}
                    >
                        Add Client
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Total Clients</div>
                        <div className="text-xl font-medium text-purple-600">{totalCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">B2B Clients</div>
                        <div className="text-xl font-medium text-blue-600">{b2bCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">B2C Clients</div>
                        <div className="text-xl font-medium text-green-600">{b2cCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Active</div>
                        <div className="text-xl font-medium text-green-600">{activeCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Premium Clients</div>
                        <div className="text-xl font-medium text-orange-600">{premiumCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
                        <Search
                            placeholder="Search clients, contacts, email..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="max-w-xs rounded-lg"
                            prefix={<SearchOutlined className="text-blue-500" />}
                            allowClear
                        />
                        <Select
                            placeholder="All Status"
                            allowClear
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="w-36 rounded-lg"
                            options={STATUS_OPTIONS}
                        />
                        <Select
                            placeholder="All Types"
                            allowClear
                            value={typeFilter}
                            onChange={setTypeFilter}
                            className="w-36 rounded-lg"
                            options={CLIENT_TYPES}
                        />
                        <Select
                            placeholder="All Tiers"
                            allowClear
                            value={tierFilter}
                            onChange={setTierFilter}
                            className="w-36 rounded-lg"
                            options={TIER_OPTIONS}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchClients}
                            loading={loading}
                            className="rounded-lg"
                        >
                            Refresh
                        </Button>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filteredClients}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            showSizeChanger: true,
                            showTotal: (t) => `Total ${t} clients`,
                            pageSize: 10,
                        }}
                        scroll={{ x: 1400 }}
                        className="[&_.ant-table-thead_th]:font-normal"
                    />
                </Card>

                <Modal
                    title={selectedClient ? 'Edit Client' : 'Add Client'}
                    open={modalOpen}
                    onCancel={() => {
                        setModalOpen(false);
                        setSelectedClient(null);
                    }}
                    footer={null}
                    width={640}
                    className="rounded-xl"
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        {isSuperAdmin && !selectedClient && (
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
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Client Code" name="code">
                                <Input placeholder="e.g. CL001" className="rounded-lg" disabled={!!selectedClient} />
                            </Form.Item>
                            <Form.Item
                                label="Client Name"
                                name="name"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input placeholder="Client or company name" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <Form.Item label="Client Type" name="type">
                            <Select
                                placeholder="Select type"
                                allowClear
                                className="rounded-lg"
                                options={CLIENT_TYPES}
                            />
                        </Form.Item>
                        <Form.Item label="Contact Person" name="contactPerson">
                            <Input placeholder="Contact name" className="rounded-lg" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Email" name="email">
                                <Input type="email" placeholder="email@example.com" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Phone" name="phone">
                                <Input placeholder="Phone number" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item label="Country" name="country">
                                <Input placeholder="Country" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="State" name="state">
                                <Input placeholder="State" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="City" name="city">
                                <Input placeholder="City" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <Form.Item label="Address" name="address">
                            <Input.TextArea rows={2} placeholder="Full address" className="rounded-lg" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Tier" name="tier">
                                <Select
                                    placeholder="Select tier"
                                    allowClear
                                    className="rounded-lg"
                                    options={TIER_OPTIONS}
                                />
                            </Form.Item>
                            <Form.Item label="Segment" name="segment">
                                <Input placeholder="Segment" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Credit Limit (£)" name="creditLimit">
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    className="w-full rounded-lg"
                                    placeholder="0"
                                />
                            </Form.Item>
                            <Form.Item label="Payment Terms" name="paymentTerms">
                                <Input placeholder="e.g. COD, Net 30" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <Form.Item label="Status" name="status">
                            <Select
                                placeholder="Status"
                                className="rounded-lg"
                                options={STATUS_OPTIONS}
                            />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                onClick={() => {
                                    setModalOpen(false);
                                    setSelectedClient(null);
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
                                {selectedClient ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </Form>
                </Modal>

                {/* View Drawer */}
                <Drawer
                    title={`Client: ${selectedClient?.name || '—'}`}
                    width={480}
                    open={viewDrawerOpen}
                    onClose={() => {
                        setViewDrawerOpen(false);
                        setSelectedClient(null);
                    }}
                    className="rounded-l-3xl"
                    destroyOnClose
                >
                    {selectedClient && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                                <Avatar className="bg-purple-500 shrink-0" icon={<UserOutlined />} />
                                <div>
                                    <div className="font-medium text-gray-800">{selectedClient.name || '—'}</div>
                                    <div className="text-sm text-gray-500">{selectedClient.code || '—'}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Client Code</div>
                                    <div className="font-medium text-gray-800">{selectedClient.code || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <BankOutlined /> Client Name
                                    </div>
                                    <div className="font-medium text-gray-800">{selectedClient.name || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Client Type</div>
                                    <div>{selectedClient.type ? <Tag color="blue">{selectedClient.type}</Tag> : '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Contact Person</div>
                                    <div className="text-gray-800">{selectedClient.contactPerson || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <MailOutlined /> Email
                                    </div>
                                    <div className="text-gray-800">{selectedClient.email || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <PhoneOutlined /> Phone
                                    </div>
                                    <div className="text-gray-800">{selectedClient.phone || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                                        <EnvironmentOutlined /> Country / State / City
                                    </div>
                                    <div className="text-gray-800">
                                        {[selectedClient.country, selectedClient.state, selectedClient.city]
                                            .filter(Boolean)
                                            .join(', ') || '—'}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Address</div>
                                    <div className="text-gray-800 whitespace-pre-wrap">{selectedClient.address || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Tier</div>
                                    <div>{selectedClient.tier ? <Tag color={selectedClient.tier === 'Gold' ? 'gold' : selectedClient.tier === 'Premium' ? 'orange' : 'default'}>{selectedClient.tier}</Tag> : '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Segment</div>
                                    <div className="text-gray-800">{selectedClient.segment || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Credit Limit (£)</div>
                                    <div className="font-medium text-gray-800">
                                        {selectedClient.creditLimit != null && selectedClient.creditLimit !== ''
                                            ? formatCurrency(Number(selectedClient.creditLimit), 'GBP')
                                            : '—'}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Payment Terms</div>
                                    <div className="text-gray-800">{selectedClient.paymentTerms || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-gray-500 text-xs font-medium uppercase mb-1">Status</div>
                                    <div>
                                        <Tag color={(selectedClient.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'green' : 'default'}>
                                            {(selectedClient.status || 'ACTIVE').toUpperCase()}
                                        </Tag>
                                    </div>
                                </div>
                            </div>
                            <Divider className="my-2" />
                            <div className="flex gap-2 pt-2">
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    className="bg-blue-600 border-blue-600 rounded-lg"
                                    onClick={() => {
                                        setViewDrawerOpen(false);
                                        openEdit(selectedClient);
                                    }}
                                >
                                    Edit
                                </Button>
                                <Popconfirm
                                    title="Delete this client?"
                                    okText="Yes"
                                    cancelText="No"
                                    onConfirm={() => handleDelete(selectedClient.id)}
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
