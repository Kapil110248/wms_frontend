import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Descriptions, Table, Tag, Spin, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatCurrency, formatDate, getStatusColor } from '../../utils';

export default function ViewSalesOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);

    const fetchOrder = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await apiRequest(`/api/orders/sales/${id}`, { method: 'GET' }, token);
            setOrder(res?.data ?? res);
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load order');
            navigate('/sales-orders');
        } finally {
            setLoading(false);
        }
    }, [token, id, navigate]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }
    if (!order) return null;

    const items = order.OrderItems || order.orderItems || [];
    const customerName = order.Customer?.name || order.customer?.name || '—';

    const itemColumns = [
        { title: 'Product', dataIndex: ['Product', 'name'], key: 'name', render: (_, r) => r.Product?.name || r.product?.name || '—' },
        { title: 'SKU', dataIndex: ['Product', 'sku'], key: 'sku', render: (_, r) => r.Product?.sku || r.product?.sku || '—' },
        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (v) => formatCurrency(v) },
        { title: 'Total', key: 'total', render: (_, r) => formatCurrency((Number(r.unitPrice) || 0) * (r.quantity || 0)) },
    ];

    return (
        <MainLayout>
            <div className="w-full max-w-6xl mx-auto space-y-6 pb-8">
                <div className="flex items-center justify-between">
                    <Link to="/sales-orders" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                        <ArrowLeftOutlined /> Back
                    </Link>
                    {['DRAFT', 'CONFIRMED'].includes((order.status || '').toUpperCase()) && (
                        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/sales-orders/${id}/edit`)} className="rounded-xl">
                            Edit Order
                        </Button>
                    )}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sales Order</h1>
                    <p className="text-gray-500 mt-1">Order # {order.orderNumber}</p>
                </div>

                <Card title="Order Information" className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Order Number">{order.orderNumber}</Descriptions.Item>
                        <Descriptions.Item label="Master Status"><Tag color={getStatusColor(order.status)} className="uppercase font-bold">{order.status}</Tag></Descriptions.Item>

                        <Descriptions.Item label="Picking Status">
                            {order.PickLists?.[0] ? <Tag color="blue">{order.PickLists[0].status}</Tag> : 'NOT STARTED'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Packing Status">
                            {order.PackingTasks?.[0] ? <Tag color="orange">{order.PackingTasks[0].status}</Tag> : 'NOT STARTED'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Shipment Status">
                            {order.Shipment ? <Tag color="green">{order.Shipment.deliveryStatus}</Tag> : 'NOT STARTED'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Customer">{customerName}</Descriptions.Item>

                        <Descriptions.Item label="Order Date">{formatDate(order.orderDate || order.createdAt)}</Descriptions.Item>
                        <Descriptions.Item label="Required Date">{order.requiredDate ? formatDate(order.requiredDate) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Priority">{order.priority || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Sales Channel">{order.salesChannel || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Order Type">{order.orderType || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Reference Number">{order.referenceNumber || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Total">{formatCurrency(order.totalAmount)}</Descriptions.Item>
                        <Descriptions.Item label="Notes" span={2}>{order.notes || '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card title="Order Items" className="rounded-2xl shadow-sm border-gray-100">
                    {items.length === 0 ? (
                        <p className="text-gray-500 py-4">No items.</p>
                    ) : (
                        <Table columns={itemColumns} dataSource={items} rowKey="id" pagination={false} size="small" />
                    )}
                </Card>
            </div>
        </MainLayout>
    );
}
