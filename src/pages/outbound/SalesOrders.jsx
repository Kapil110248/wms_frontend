import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Tag, Space, Card, Tabs, message, Select, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ExportOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate, getStatusColor } from '../../utils';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Search } = Input;

export default function SalesOrders() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [channelMulti, setChannelMulti] = useState([]);
    const [searchText, setSearchText] = useState('');

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            setOrders(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDeleteOrder = useCallback(async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/orders/sales/${id}`, { method: 'DELETE' }, token);
            message.success('Order deleted');
            fetchOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to delete order');
        }
    }, [token, fetchOrders]);

    const filteredOrders = orders.filter((order) => {
        const customerName = order.Customer?.name || order.customer?.name || '';
        const matchesSearch = !searchText ||
            order.orderNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
            customerName.toLowerCase().includes(searchText.toLowerCase());

        const orderChannel = (order.salesChannel || 'DIRECT').toUpperCase();
        const matchesChannel = channelFilter === 'all'
            ? (channelMulti.length === 0 || channelMulti.includes(orderChannel))
            : orderChannel === channelFilter.toUpperCase();

        let matchesStatus = true;
        if (activeTab !== 'all') {
            const s = (order.status || '').toUpperCase();
            if (activeTab === 'pending') {
                matchesStatus = ['DRAFT', 'CONFIRMED', 'PICK_LIST_CREATED'].includes(s);
            } else if (activeTab === 'in_progress') {
                matchesStatus = ['PICKING_IN_PROGRESS', 'PICKED', 'PACKING_IN_PROGRESS', 'PACKED'].includes(s);
            } else if (activeTab === 'completed') {
                matchesStatus = ['SHIPPED', 'DELIVERED'].includes(s);
            } else if (activeTab === 'cancelled') {
                matchesStatus = s === 'CANCELLED';
            }
        }
        return matchesSearch && matchesChannel && matchesStatus;
    });

    const shortenOrderNumber = (num) => {
        if (!num) return '—';
        const parts = num.split('-');
        return parts.length === 3 ? `ORD-${parts[2]}` : num;
    };

    const CHANNEL_OPTIONS = [
        { value: 'AMAZON', label: 'Amazon' },
        { value: 'EBAY', label: 'eBay' },
        { value: 'SHOPIFY', label: 'Shopify' },
        { value: 'DIRECT', label: 'Direct' },
    ];

    const columns = [
        { title: 'Order #', dataIndex: 'orderNumber', key: 'orderNumber', width: 120, render: (v, r) => <Link to={`/sales-orders/${r.id}`} className="font-bold text-blue-600 hover:underline">{shortenOrderNumber(v)}</Link> },
        { title: 'Customer', key: 'customer', width: 160, render: (_, r) => (r.Customer?.name || r.customer?.name) || '-' },
        { title: 'Channel', dataIndex: 'salesChannel', key: 'channel', width: 110, render: (c) => <Tag color="blue" className="uppercase">{c || 'Direct'}</Tag> },
        { title: 'SKU(s)', key: 'skus', width: 180, ellipsis: true, render: (_, r) => (r.OrderItems || r.orderItems || []).map((i) => i.Product?.sku || i.product?.sku).filter(Boolean).join(', ') || '—' },
        { title: 'Date', dataIndex: 'orderDate', key: 'orderDate', width: 110, render: (v, r) => formatDate(v || r.createdAt) },
        { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, render: (v, r) => <span className="font-medium text-slate-800">{formatCurrency(v, r.currency)}</span> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (s) => <Tag color={getStatusColor(s)} className="uppercase font-bold">{s === 'PICK_LIST_CREATED' ? 'CONFIRMED' : s}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const canEdit = ['DRAFT', 'CONFIRMED'].includes((record.status || '').toUpperCase());
                return (
                    <Space onClick={(e) => e.stopPropagation()} role="group" size="small">
                        <Button type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${record.id}`); }} title="View" />
                        <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${record.id}/edit`); }} title="Edit" />
                        <Popconfirm title="Delete this order?" onConfirm={() => handleDeleteOrder(record.id)} okText="Yes" cancelText="No">
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} title="Delete" />
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    const statusUpper = (s) => (s || '').toUpperCase();
    const tabItems = [
        { key: 'all', label: `All (${orders.length})` },
        { key: 'pending', label: `Pending (${orders.filter(o => ['DRAFT', 'CONFIRMED', 'PICK_LIST_CREATED'].includes(statusUpper(o.status))).length})` },
        { key: 'in_progress', label: `In Progress (${orders.filter(o => ['PICKING_IN_PROGRESS', 'PICKED', 'PACKING_IN_PROGRESS', 'PACKED'].includes(statusUpper(o.status))).length})` },
        { key: 'completed', label: `Completed (${orders.filter(o => ['SHIPPED', 'DELIVERED'].includes(statusUpper(o.status))).length})` },
        { key: 'cancelled', label: `Cancelled (${orders.filter(o => statusUpper(o.status) === 'CANCELLED').length})` },
    ];

    return (
        <MainLayout>
            <div className="space-y-8">
                {/* Page header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Sales Orders</h1>
                        <p className="text-gray-500 text-sm mt-1">Track and fulfill omni-channel orders across all platforms</p>
                    </div>
                    <Space size="middle" wrap>
                        <Button icon={<ReloadOutlined />} onClick={fetchOrders} className="h-10 rounded-xl">Sync Orders</Button>
                        <Button icon={<ExportOutlined />} className="h-10 rounded-xl" onClick={async () => {
                            if (!orders.length) return message.warning('No data to export');
                            const format = await new Promise(resolve => {
                                Modal.confirm({
                                    title: 'Export Sales Orders',
                                    content: 'Select export format:',
                                    okText: 'PDF',
                                    cancelText: 'CSV',
                                    onOk: () => resolve('PDF'),
                                    onCancel: () => resolve('CSV')
                                });
                            });

                            if (format === 'CSV') {
                                const headers = ['Order Number', 'Customer', 'Channel', 'Date', 'Total', 'Status', 'Items'];
                                const csvContent = [
                                    headers.join(','),
                                    ...filteredOrders.map(o => [
                                        `"${o.orderNumber || ''}"`,
                                        `"${o.Customer?.name || o.customer?.name || ''}"`,
                                        `"${o.salesChannel || ''}"`,
                                        `"${o.orderDate || o.createdAt || ''}"`,
                                        o.totalAmount || 0,
                                        o.status || 'DRAFT',
                                        `"${(o.OrderItems || o.orderItems || []).map(i => `${i.Product?.sku || i.product?.sku} (x${i.quantity})`).join('; ')}"`
                                    ].join(','))
                                ].join('\n');
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`);
                                link.click();
                            } else {
                                // PDF Export via backend (creates a temporary report)
                                try {
                                    message.loading({ content: 'Generating PDF...', key: 'pdf_so' });
                                    const res = await apiRequest('/api/reports', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            reportType: 'ORDERS',
                                            reportName: `Orders Export ${new Date().toLocaleDateString()}`,
                                            format: 'PDF'
                                        })
                                    }, token);
                                    
                                    if (res?.data?.id) {
                                        const downloadRes = await fetch(`/api/reports/${res.data.id}/download`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        const blob = await downloadRes.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `sales_orders_export_${new Date().toISOString().slice(0, 10)}.pdf`;
                                        a.click();
                                        message.success({ content: 'PDF Downloaded', key: 'pdf_so' });
                                    }
                                } catch (err) {
                                    message.error({ content: 'Failed to generate PDF', key: 'pdf_so' });
                                }
                            }
                        }}>Export</Button>
                        <Link to="/sales-orders/new">
                            <Button type="primary" icon={<PlusOutlined />} size="large" className="h-10 rounded-xl">New Order</Button>
                        </Link>
                    </Space>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-blue-600 text-xs font-medium mb-1">Active Orders</div>
                        <div className="text-xl font-bold text-slate-800">{orders.length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-orange-500 text-xs font-medium mb-1">Urgent Priority</div>
                        <div className="text-xl font-bold text-slate-800">{orders.filter(o => o.priority === 'HIGH' || o.priority === 'URGENT').length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-green-600 text-xs font-medium mb-1">Dispatched</div>
                        <div className="text-xl font-bold text-slate-800">{orders.filter(o => ['SHIPPED', 'DELIVERED'].includes((o.status || '').toUpperCase())).length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-slate-600 text-xs font-medium mb-1">Total Value</div>
                        <div className="text-xl font-bold text-slate-800">{formatCurrency(orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0))}</div>
                    </Card>
                </div>

                {/* Filters + Table */}
                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50/80 rounded-t-xl border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 flex-wrap">
                            <Search placeholder="Order# / Customer..." className="max-w-xs" value={searchText} onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} allowClear />
                            <Select value={channelFilter} onChange={setChannelFilter} className="w-40" options={[
                                { value: 'all', label: 'All Channels' },
                                { value: 'AMAZON', label: 'Amazon' },
                                { value: 'SHOPIFY', label: 'Shopify' },
                                { value: 'EBAY', label: 'eBay' },
                                { value: 'DIRECT', label: 'Direct' },
                            ]} />
                            <Select mode="multiple" placeholder="Filter by channel (multi)" value={channelMulti} onChange={setChannelMulti} className="w-56" options={CHANNEL_OPTIONS} allowClear />
                        </div>
                        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="min-w-0" />
                    </div>
                    <Table columns={columns} dataSource={filteredOrders} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} scroll={{ x: 1000 }} className="px-4" />
                </Card>
            </div>
        </MainLayout>
    );
}
