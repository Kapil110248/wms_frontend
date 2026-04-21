import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Form, Input, Select, InputNumber, Modal, Divider, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MinusCircleOutlined, ReloadOutlined, ShoppingCartOutlined, DollarOutlined, SearchOutlined, BoxPlotOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatCurrency, formatNumber } from '../../utils';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

export default function Bundles() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [bundles, setBundles] = useState([]);
    const [products, setProducts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';
    const bundleItems = Form.useWatch('bundleItems', form) || [];
    const selectedCurrency = Form.useWatch('currency', form) || 'EUR';

    const fetchBundles = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/bundles', { method: 'GET' }, token);
            setBundles(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load bundles');
            setBundles([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setProducts([]);
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
            fetchBundles();
            fetchProducts();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchBundles, fetchProducts, isSuperAdmin, fetchCompanies]);

    // Auto-calculate cost from bundle components (product costPrice * quantity)
    useEffect(() => {
        if (!modalOpen || viewMode) return;
        const items = bundleItems.filter(i => i?.productId && i?.quantity > 0);
        if (items.length === 0) return;
        let total = 0;
        for (const it of items) {
            const p = products.find(pr => pr.id === it.productId);
            if (p && p.costPrice != null) total += Number(p.costPrice) * Number(it.quantity);
        }
        if (total > 0) form.setFieldValue('costPrice', total);
    }, [bundleItems, products, modalOpen, viewMode, form]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                sku: values.sku,
                description: values.description || null,
                sellingPrice: values.sellingPrice,
                costPrice: values.costPrice ?? 0,
                currency: values.currency || 'EUR',
                status: values.status || 'ACTIVE',
                barcode: values.barcode || null,
                bundleItems: (values.bundleItems || []).filter(i => i?.productId && i?.quantity > 0).map(i => ({ productId: i.productId, quantity: i.quantity })),
            };
            if (isSuperAdmin && !selectedBundle) payload.companyId = values.companyId;
            if (selectedBundle) {
                await apiRequest(`/api/bundles/${selectedBundle.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Bundle updated');
            } else {
                await apiRequest('/api/bundles', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Bundle created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedBundle(null);
            fetchBundles();
        } catch (err) {
            message.error(err.message || 'Bundle save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/bundles/${id}`, { method: 'DELETE' }, token);
            message.success('Bundle deleted');
            fetchBundles();
        } catch (err) {
            message.error(err?.message || 'Delete failed');
        }
    };

    const filteredBundles = bundles.filter(b => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        return (b.sku || '').toLowerCase().includes(s) || (b.name || '').toLowerCase().includes(s);
    });

    const activeCount = bundles.filter(b => b.status === 'ACTIVE').length;
    const margins = bundles.filter(b => b.sellingPrice > 0 && b.costPrice != null).map(b => ((b.sellingPrice - b.costPrice) / b.sellingPrice) * 100);
    const avgMargin = margins.length ? formatNumber(margins.reduce((a, b) => a + b, 0) / margins.length) : null;

    const columns = [
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Bundle Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><BoxPlotOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 140, render: (v) => v ? <span className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{v}</span> : '—' },
        { title: 'Items', key: 'items', width: 80, render: (_, r) => <Tag color="blue" className="font-normal">{(r.bundleItems?.length || 0)}</Tag> },
        { title: 'Cost Price', dataIndex: 'costPrice', key: 'cost', width: 120, render: (v, r) => <span className="text-gray-600">{v != null ? formatCurrency(v, r.currency) : '—'}</span> },
        { title: 'Selling Price', dataIndex: 'sellingPrice', key: 'price', width: 120, render: (v, r) => <span className="font-medium text-gray-900">{v != null ? formatCurrency(v, r.currency) : '—'}</span> },
        {
            title: 'Margin',
            key: 'margin',
            width: 100,
            render: (_, r) => {
                if (r.sellingPrice == null || r.sellingPrice <= 0 || r.costPrice == null) return '—';
                const margin = ((r.sellingPrice - r.costPrice) / r.sellingPrice) * 100;
                return <Tag color={margin >= 20 ? 'green' : margin >= 0 ? 'orange' : 'red'} className="font-normal">{formatNumber(margin)}%</Tag>;
            }
        },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v || '—'}</Tag> },
        {
            title: 'Actions',
            key: 'act',
            width: 140,
            fixed: 'right',
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedBundle(r); setViewMode(true); setModalOpen(true); }}>View</Button>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-medium text-blue-600">Product Bundles</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Multi-pack and bundle products (e.g., 12-packs, cases)</p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchBundles}>Refresh</Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Total Bundles</div>
                            <div className="text-2xl font-medium text-blue-600">{bundles.length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Active Bundles</div>
                            <div className="text-2xl font-medium text-green-600">{activeCount}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Average Margin</div>
                            <div className={`text-2xl font-medium ${avgMargin != null && Number(avgMargin) < 0 ? 'text-red-600' : 'text-gray-800'}`}>{avgMargin != null ? `${avgMargin}%` : '—'}</div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Search placeholder="Search by SKU or bundle name..." className="max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white">Search</Button>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredBundles}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} bundles`, pageSize: 20 }}
                            scroll={{ x: 1000 }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Bundle' : selectedBundle ? 'Edit Bundle' : 'Create Bundle'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedBundle(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedBundle(null); }}>Close</Button>] : undefined}
                    width={640}
                >
                    {viewMode && selectedBundle ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Bundle Name</div><div className="text-gray-900">{selectedBundle.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">SKU</div><div className="text-gray-900">{selectedBundle.sku ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Barcode</div><div className="text-gray-900 font-mono italic">{selectedBundle.barcode ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Description</div><div className="text-gray-900 whitespace-pre-wrap">{selectedBundle.description ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Cost Price (Auto-Calculated)</div><div className="text-gray-900">{selectedBundle.costPrice != null ? formatCurrency(selectedBundle.costPrice, selectedBundle.currency) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Selling Price</div><div className="text-gray-900">{selectedBundle.sellingPrice != null ? formatCurrency(selectedBundle.sellingPrice, selectedBundle.currency) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Status</div><div className="text-gray-900">{selectedBundle.status ?? '—'}</div></div>
                            <div>
                                <div className="text-gray-500 text-sm font-normal mb-2">Bundle Components</div>
                                <div className="space-y-2">
                                    {(selectedBundle.bundleItems || []).length ? selectedBundle.bundleItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="text-gray-900">{(item.child && item.child.name) || `Product #${item.productId}`} {(item.child && item.child.sku) && <span className="text-gray-500 text-xs">({item.child.sku})</span>}</span>
                                            <span className="font-medium">×{item.quantity}</span>
                                        </div>
                                    )) : <span className="text-gray-500">—</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            {isSuperAdmin && !selectedBundle && (
                                <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                    <Select placeholder="Select company" className="rounded-lg" options={companies.map(c => ({ value: c.id, label: c.name }))} />
                                </Form.Item>
                            )}
                            <Form.Item label="Bundle Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Select 
                                    showSearch
                                    placeholder="Select a bundle product..."
                                    className="rounded-lg"
                                    optionFilterProp="label"
                                    onChange={(val) => {
                                        const p = products.find(prod => prod.name === val);
                                        if (p) {
                                            form.setFieldsValue({
                                                sku: p.sku,
                                                description: p.description
                                            });
                                        }
                                    }}
                                    options={products
                                        .filter(p => p.productType === 'BUNDLE')
                                        .map(p => ({ value: p.name, label: `${p.name} (${p.sku})` }))
                                    }
                                    disabled={!!selectedBundle}
                                />
                            </Form.Item>
                            <Form.Item label="SKU" name="sku" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Automatic from product..." className="rounded-lg" disabled={true} />
                            </Form.Item>
                            <Form.Item label="Description" name="description">
                                <TextArea rows={2} placeholder="Bundle description" className="rounded-lg" />
                            </Form.Item>
                            <div className="grid grid-cols-3 gap-4">
                                <Form.Item label="Currency" name="currency" rules={[{ required: true, message: 'Required' }]}>
                                    <Select className="rounded-lg">
                                        <Option value="USD">USD ($)</Option>
                                        <Option value="EUR">EUR (€)</Option>
                                        <Option value="GBP">GBP (£)</Option>
                                        <Option value="INR">INR (₹)</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Cost Price" name="costPrice">
                                    <InputNumber 
                                        addonBefore={selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : selectedCurrency === 'GBP' ? '£' : '€'} 
                                        className="w-full rounded-lg" 
                                        min={0} 
                                        step={0.0001} 
                                        placeholder="From components" 
                                    />
                                </Form.Item>
                                <Form.Item label="Selling Price" name="sellingPrice" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber 
                                        addonBefore={selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : selectedCurrency === 'GBP' ? '£' : '€'} 
                                        className="w-full rounded-lg" 
                                        min={0} 
                                        step={0.0001} 
                                    />
                                </Form.Item>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item label="Barcode" name="barcode">
                                    <Input placeholder="Scan or enter bundle barcode..." className="rounded-lg" />
                                </Form.Item>
                                <Form.Item label="Status" name="status" initialValue="ACTIVE">
                                    <Select placeholder="Select status" className="rounded-lg">
                                        <Option value="ACTIVE">Active</Option>
                                        <Option value="INACTIVE">Inactive</Option>
                                    </Select>
                                </Form.Item>
                            </div>

                            <Divider className="text-gray-500 font-normal">Bundle Components</Divider>

                            <Form.List name="bundleItems">
                                {(fields, { add, remove }) => (
                                    <div className="space-y-3">
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <Form.Item {...restField} name={[name, 'productId']} label="Product" className="mb-0 flex-1">
                                                    <Select showSearch placeholder="Select product" className="rounded-lg" optionFilterProp="label" options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'quantity']} label="Qty" className="mb-0 w-20">
                                                    <InputNumber min={0.00000001} step={0.00000001} className="w-full rounded-lg" />
                                                </Form.Item>
                                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} className="mb-1" />
                                            </div>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="rounded-lg border-gray-300">Add Component</Button>
                                    </div>
                                )}
                            </Form.List>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
