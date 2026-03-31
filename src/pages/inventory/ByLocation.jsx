import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Card, Form, Select, Empty, Tag, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatNumber } from '../../utils';

export default function InventoryByLocation() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [form] = Form.useForm();

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
            if (values.warehouseId) params.set('warehouseId', values.warehouseId);
            if (values.locationType) params.set('locationType', values.locationType);
            const res = await apiRequest(`/api/inventory/stock/by-location?${params.toString()}`, { method: 'GET' }, token);
            setData(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            setData([]);
            message.error(err?.message || 'Failed to load inventory by location.');
        } finally {
            setLoading(false);
        }
    }, [token, form]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const totalLocations = data.length;
    const totalItemsSum = data.reduce((s, r) => s + (Number(r.totalItems) || 0), 0);
    const totalProductCount = data.reduce((s, r) => s + (Number(r.productCount) || 0), 0);
    const withWarnings = data.filter((r) => r.warnings && r.warnings !== '—').length;

    const columns = [
        {
            title: 'Location',
            key: 'location',
            width: 260,
            render: (_, r) => {
                const primary = (r.locationCode && r.locationCode !== '—' ? r.locationCode : r.locationName) || '—';
                const showSubName = r.locationName && r.locationCode !== r.locationName && primary !== r.locationName;
                return (
                    <div>
                        <div className="font-medium text-blue-600">{primary}</div>
                        {r.pickSequence != null && <Tag color="purple" className="mt-1">Seq: {r.pickSequence}</Tag>}
                        {showSubName && <div className="text-gray-500 text-sm mt-0.5">{r.locationName}</div>}
                    </div>
                );
            },
        },
        {
            title: 'Type',
            dataIndex: 'locationType',
            key: 'type',
            width: 100,
            render: (v) => v && v !== '—' ? <Tag color="green">{v}</Tag> : '—',
        },
        { title: 'Zone', dataIndex: 'zoneName', key: 'zone', width: 120, render: (v) => v || '—' },
        {
            title: 'Properties',
            dataIndex: 'properties',
            key: 'properties',
            width: 140,
            render: (v) => v && v !== '—' ? <Tag color="red">{v}</Tag> : '—',
        },
        {
            title: 'Total Items',
            dataIndex: 'totalItems',
            key: 'totalItems',
            width: 120,
            align: 'right',
            render: (v) => (v != null && v >= 99 ? <Tag color="green">99+</Tag> : formatNumber(v ?? 0)),
        },
        { title: 'Product Count', dataIndex: 'productCount', key: 'productCount', width: 120, align: 'right', render: (v) => formatNumber(v ?? 0) },
        { title: 'Warnings', dataIndex: 'warnings', key: 'warnings', width: 140, ellipsis: true, render: (v) => v && v !== '—' ? <Tag color="orange">{v}</Tag> : '—' },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Inventory by Location</h1>
                        <p className="text-gray-500 text-sm mt-0.5">View stock grouped by location</p>
                    </div>
                    <Button icon={<ReloadOutlined />} className="rounded-lg" onClick={fetchData} loading={loading}>
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Total Locations</div>
                        <div className="text-xl font-medium text-blue-600">{formatNumber(totalLocations)}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Total Items</div>
                        <div className="text-xl font-medium text-green-600">{formatNumber(totalItemsSum)}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Product Count</div>
                        <div className="text-xl font-medium text-purple-600">{formatNumber(totalProductCount)}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">With Warnings</div>
                        <div className="text-xl font-medium text-orange-600">{formatNumber(withWarnings)}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-b border-gray-100">
                        <Form form={form} layout="inline" className="flex flex-wrap gap-3">
                            <Form.Item name="warehouseId" label="Warehouse" className="mb-0">
                                <Select placeholder="Select warehouse" allowClear className="w-48 rounded-lg" options={warehouses.map(w => ({ value: w.id, label: w.name }))} onChange={() => fetchData()} />
                            </Form.Item>
                            <Form.Item name="locationType" label="Type" className="mb-0">
                                <Select placeholder="Location type" allowClear className="w-40 rounded-lg" options={[{ value: 'PICK', label: 'Pick' }, { value: 'BULK', label: 'Bulk' }, { value: 'QUARANTINE', label: 'Quarantine' }, { value: 'STAGING', label: 'Staging' }]} onChange={() => fetchData()} />
                            </Form.Item>
                            <Form.Item className="mb-0">
                                <Button type="primary" htmlType="button" icon={<ReloadOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={fetchData} loading={loading}>Apply</Button>
                            </Form.Item>
                        </Form>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey={(r) => r.locationId ?? `loc-${r.locationCode}-${r.locationName}`}
                        loading={loading}
                        pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} locations`, pageSize: 20 }}
                        className="[&_.ant-table-thead_th]:font-normal [&_.ant-table]:px-4"
                        scroll={{ x: 900 }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <span>
                                            No inventory by location found.
                                            <br />
                                            <span className="text-gray-400 text-sm">Add stock in Inventory to see data here, or try clearing filters.</span>
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
