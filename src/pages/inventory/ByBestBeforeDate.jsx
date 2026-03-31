import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Card, Form, Select, DatePicker, Space, Empty, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatNumber } from '../../utils';

export default function InventoryByBestBeforeDate() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [form] = Form.useForm();

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(res?.data) ? res.data : []);
        } catch {
            setProducts([]);
        }
    }, [token]);

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(res?.data) ? res.data : []);
        } catch {
            setWarehouses([]);
        }
    }, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        const values = form.getFieldsValue();
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (values.productId) params.set('productId', values.productId);
            if (values.warehouseId) params.set('warehouseId', values.warehouseId);
            if (values.minBbd) params.set('minBbd', dayjs(values.minBbd).format('YYYY-MM-DD'));
            if (values.maxBbd) params.set('maxBbd', dayjs(values.maxBbd).format('YYYY-MM-DD'));
            const res = await apiRequest(`/api/inventory/stock/by-best-before-date?${params.toString()}`, { method: 'GET' }, token);
            setData(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            setData([]);
            message.error(err?.message || 'Failed to load inventory by best before date.');
        } finally {
            setLoading(false);
        }
    }, [token, form]);

    useEffect(() => {
        fetchProducts();
        fetchWarehouses();
    }, [fetchProducts, fetchWarehouses]);

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const totalRows = data.length;
    const totalAvailableSum = data.reduce((s, r) => s + (Number(r.totalAvailable) || 0), 0);
    const uniqueProducts = new Set(data.map((r) => r.productId).filter(Boolean)).size;
    const totalBbdCountSum = data.reduce((s, r) => s + (Number(r.bbdCount) || 0), 0);

    const columns = [
        { title: 'Product', key: 'product', width: 280, render: (_, r) => <span className="font-medium text-blue-600">{(r.productName || '—')} {(r.productSku) && <span className="text-gray-500 text-sm">({r.productSku})</span>}</span> },
        { title: 'Best Before Date', dataIndex: 'bestBeforeDate', key: 'bbd', width: 160, render: (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—' },
        { title: 'Total Available', dataIndex: 'totalAvailable', key: 'available', width: 140, align: 'right', render: (v) => formatNumber(v ?? 0) },
        { title: 'BBD Count', dataIndex: 'bbdCount', key: 'bbdCount', width: 120, align: 'right', render: (v) => formatNumber(v ?? 0) },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Inventory by Best Before Date</h1>
                        <p className="text-gray-500 text-sm mt-0.5">View stock grouped by product and best before date</p>
                    </div>
                    <Button icon={<ReloadOutlined />} className="rounded-lg" onClick={fetchData} loading={loading}>
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">BBD Entries</div>
                        <div className="text-xl font-medium text-blue-600">{formatNumber(totalRows)}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Total Available</div>
                        <div className="text-xl font-medium text-green-600">{formatNumber(totalAvailableSum)}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Unique Products</div>
                        <div className="text-xl font-medium text-purple-600">{formatNumber(uniqueProducts)}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">BBD Count</div>
                        <div className="text-xl font-medium text-orange-600">{formatNumber(totalBbdCountSum)}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-b border-gray-100">
                        <Form form={form} layout="inline" className="flex flex-wrap gap-3">
                            <Form.Item name="productId" label="Product" className="mb-0">
                                <Select placeholder="Select product" allowClear className="w-52 rounded-lg" options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
                            </Form.Item>
                            <Form.Item name="warehouseId" label="Warehouse" className="mb-0">
                                <Select placeholder="Select warehouse" allowClear className="w-48 rounded-lg" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                            </Form.Item>
                            <Form.Item name="minBbd" label="Min BBD" className="mb-0">
                                <DatePicker placeholder="Start date" className="rounded-lg" format="DD/MM/YYYY" />
                            </Form.Item>
                            <Form.Item name="maxBbd" label="Max BBD" className="mb-0">
                                <DatePicker placeholder="End date" className="rounded-lg" format="DD/MM/YYYY" />
                            </Form.Item>
                            <Form.Item className="mb-0">
                                <Button type="primary" htmlType="button" icon={<ReloadOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={fetchData} loading={loading}>Apply</Button>
                            </Form.Item>
                        </Form>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey={(r) => `${r.productId}-${r.bestBeforeDate}`}
                        loading={loading}
                        pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} items`, pageSize: 20 }}
                        className="[&_.ant-table-thead_th]:font-normal [&_.ant-table]:px-4"
                        scroll={{ x: 700 }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <span>
                                            No inventory with Best Before Date found.
                                            <br />
                                            <span className="text-gray-400 text-sm">Add Best Before Date in Inventory to see data here, or clear filters.</span>
                                        </span>
                                    }
                                    className="py-12"
                                />
                            ),
                        }}
                    />
                </Card>
            </div>
        </MainLayout>
    );
}
