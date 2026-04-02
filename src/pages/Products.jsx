import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, message, Popconfirm } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReloadOutlined,
    UploadOutlined,
    ShoppingOutlined,
    CopyOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatCurrency, getStatusColor, formatNumber } from '../utils';

export default function Products() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(undefined);
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setProducts(list);
        } catch (err) {
            message.error(err?.message || err?.data?.message || 'Failed to load products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);
    const handleDelete = async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/inventory/products/${id}`, { method: 'DELETE' }, token);
            message.success('Product deleted');
            fetchProducts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to delete product');
        }
    };

    const handleDuplicate = async (id) => {
        if (!token) return;
        try {
            message.loading({ content: 'Duplicating product...', key: 'dup' });
            await apiRequest(`/api/inventory/products/${id}/duplicate`, { method: 'POST' }, token);
            message.success({ content: 'Product duplicated successfully!', key: 'dup' });
            fetchProducts();
        } catch (err) {
            message.error({ content: err?.message || 'Failed to duplicate product', key: 'dup' });
        }
    };

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/inventory/categories', { method: 'GET' }, token);
            setCategories(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (_) {
            setCategories([]);
        }
    }, [token]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts, fetchCategories]);

    const filteredProducts = products.filter((p) => {
        const matchSearch = !searchText || (p.name && p.name.toLowerCase().includes(searchText.toLowerCase())) || (p.sku && String(p.sku).toLowerCase().includes(searchText.toLowerCase())) || (p.barcode && String(p.barcode).toLowerCase().includes(searchText.toLowerCase()));
        const matchCategory = categoryFilter == null || p.categoryId === categoryFilter;
        const matchStatus = statusFilter == null || (p.status || 'ACTIVE') === statusFilter;
        return matchSearch && matchCategory && matchStatus;
    });

    const getCategoryName = (categoryId) => {
        if (categoryId == null) return '—';
        const c = categories.find((x) => x.id === categoryId);
        return c ? c.name : '—';
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: setSelectedRowKeys,
    };

    const columns = [
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 110, render: (v, r) => <Link to={`/products/${r.id}`} className="text-blue-600 hover:underline font-medium">{v || '—'}</Link> },
        { title: 'Product Name', dataIndex: 'name', key: 'name', width: 180, ellipsis: true, render: (v, r) => <Link to={`/products/${r.id}`} className="text-blue-600 hover:underline">{v || '—'}</Link> },
        { title: 'Product Category', key: 'category', width: 120, render: (_, r) => getCategoryName(r.categoryId) },
        { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 130, render: (v) => <span className="font-mono text-xs text-gray-600">{v || '—'}</span> },
        { title: 'Color', dataIndex: 'color', key: 'color', width: 100, render: (t) => t || '—' },
        { title: 'Price', dataIndex: 'price', key: 'price', width: 95, align: 'right', render: (v, r) => <span className="font-medium">{formatCurrency(v, r.currency)}</span> },
        { title: 'Cost', dataIndex: 'costPrice', key: 'costPrice', width: 95, align: 'right', render: (v, r) => <span className="text-gray-600">{formatCurrency(v, r.currency)}</span> },
        { title: 'Stock', key: 'stock', width: 130, align: 'right', render: (_, r) => {
            const stocks = r.ProductStocks || r.inventory || [];
            const virtual = stocks.find(s => s.isVirtual);
            const physical = stocks.filter(s => !s.isVirtual).reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
            
            const isManualStockExists = physical > 0;
            const total = isManualStockExists ? physical : (virtual ? Number(virtual.quantity) : 0);
            const isComputed = !isManualStockExists && !!virtual;

            // Threshold labels - handle both camelCase and snake_case from API
            const reorderLevel = Number(r.reorderLevel ?? r.reorder_level) || 0;
            const lowThreshold = Number(r.lowStockThreshold ?? r.low_stock_threshold) || 0;
            const mediumThreshold = Number(r.mediumStockThreshold ?? r.medium_stock_threshold) || 0;

            let statusTag = null;
            if (total < reorderLevel || total === 0) {
                statusTag = <Tag color="error" style={{ fontSize: '10px', marginTop: '2px' }}>CRITICAL</Tag>;
            } else if (lowThreshold > 0 && total <= lowThreshold) {
                statusTag = <Tag color="warning" style={{ fontSize: '10px', marginTop: '2px' }}>LOW STOCK</Tag>;
            } else if (mediumThreshold > 0 && total <= mediumThreshold) {
                statusTag = <Tag color="processing" style={{ fontSize: '10px', marginTop: '2px' }}>MEDIUM STOCK</Tag>;
            }
            
            return (
                <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1">
                        <ShoppingOutlined className="text-slate-400 text-xs" />
                        <span className="font-medium">{formatNumber(total)}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{r.unitOfMeasure || 'EACH'}</span>
                    </span>
                    {statusTag}
                    {isComputed && <Tag color="blue" style={{ fontSize: '9px', lineHeight: '14px', margin: 0, padding: '0 4px', borderRadius: '4px' }}>COMPUTED</Tag>}
                </div>
            );
        } },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 95, render: (s) => <Tag color={getStatusColor(s)}>{s || 'ACTIVE'}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            width: 140,
            render: (_, r) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}`); }} className="p-0 h-auto font-normal">View</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}/edit`); }} className="p-0 h-auto font-normal">Edit</Button>
                    <Button type="link" size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); handleDuplicate(r.id); }} className="p-0 h-auto font-normal">Copy</Button>
                    <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)} okText="Delete" danger cancelText="No">
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0 h-auto font-normal">Del</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const activeCount = products.filter((x) => (x.status || 'ACTIVE') === 'ACTIVE').length;
    const inactiveCount = products.length - activeCount;

    return (
        <MainLayout>
            <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-12 p-2 md:p-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-slate-800 tracking-tight">Products</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-1">Manage items ({filteredProducts.length} total)</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button icon={<ReloadOutlined />} onClick={fetchProducts} className="h-10 rounded-lg flex-1 md:flex-none">Refresh</Button>
                        <Button icon={<UploadOutlined />} onClick={() => navigate('/products/import-export')} className="h-10 rounded-lg flex-1 md:flex-none">Import</Button>
                        <Link to="/products/add" className="w-full md:w-auto">
                            <Button type="primary" icon={<PlusOutlined />} size="large" className="h-10 px-5 rounded-lg font-semibold bg-blue-600 border-blue-600 hover:bg-blue-700 w-full">
                                Add Product
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:24px' }}>
                        <div className="text-[10px] md:text-sm font-bold text-slate-500 uppercase">Total</div>
                        <div className="text-xl md:text-2xl font-black text-blue-600 mt-1">{products.length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:24px' }}>
                        <div className="text-[10px] md:text-sm font-bold text-slate-500 uppercase">Active</div>
                        <div className="text-xl md:text-2xl font-black text-green-600 mt-1">{activeCount}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm col-span-2 md:col-span-1" bodyStyle={{ padding: '12px md:24px' }}>
                        <div className="text-[10px] md:text-sm font-bold text-slate-500 uppercase">Inactive</div>
                        <div className="text-xl md:text-2xl font-black text-red-600 mt-1">{inactiveCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <div className="p-3 md:p-6">
                        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex gap-2 flex-1 w-full md:max-w-md">
                                <Input
                                    placeholder="Search items..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    allowClear
                                    className="rounded-lg h-10 flex-1"
                                />
                                <Button type="primary" icon={<SearchOutlined />} className="h-10 rounded-lg bg-blue-600 border-blue-600 md:hidden" />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                <Select
                                    placeholder="Category"
                                    allowClear
                                    value={categoryFilter}
                                    onChange={setCategoryFilter}
                                    className="w-full sm:min-w-[150px] rounded-lg h-10"
                                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                                    dropdownMatchSelectWidth={false}
                                />
                                <Select
                                    placeholder="Status"
                                    allowClear
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    className="w-full sm:min-w-[130px] rounded-lg h-10"
                                    options={[
                                        { value: 'ACTIVE', label: 'Active' },
                                        { value: 'INACTIVE', label: 'Inactive' },
                                    ]}
                                />
                            </div>
                        </div>

                        <Table
                            size="small"
                            rowSelection={rowSelection}
                            columns={columns}
                            dataSource={filteredProducts}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `Total ${t} products`, pageSizeOptions: ['10', '50', '100', '500'] }}
                            className="[&_.ant-table-thead_th]:bg-gray-50 [&_.ant-table-thead_th]:font-medium [&_.ant-table-thead_th]:text-slate-600"
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
}
