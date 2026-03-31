import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Tag, Spin } from 'antd';
import { EyeOutlined, ShoppingCartOutlined, DatabaseOutlined, BarChartOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';

export default function ViewerDashboard() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState({ totalOrders: 0, totalStock: 0, lowStock: 0 });
    const [recentOrders, setRecentOrders] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [statsRes, ordersRes] = await Promise.all([
                    apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                    apiRequest('/api/orders/sales', { method: 'GET' }, token).catch(() => ({ data: [] })),
                ]);
                if (cancelled) return;
                const d = statsRes.data || {};
                setOverview({
                    totalOrders: d.totalOrders ?? 0,
                    totalStock: d.totalStock ?? 0,
                    lowStock: d.lowStockCount ?? 0,
                });
                const list = Array.isArray(ordersRes.data) ? ordersRes.data : [];
                setRecentOrders(
                    list.slice(0, 5).map((o) => ({
                        id: o.id,
                        orderNumber: o.orderNumber,
                        customer: o.Customer?.name || '-',
                        total: o.totalAmount ?? 0,
                        status: (o.status || '').toUpperCase(),
                    }))
                );
            } catch (_) {
                setOverview({ totalOrders: 0, totalStock: 0, lowStock: 0 });
                setRecentOrders([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                        <EyeOutlined className="text-cyan-500" /> Viewer (Read-only)
                    </h1>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose mt-1">
                        Orders overview • Stock overview • Reports — view only
                    </p>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <KPICard title="Orders Overview" value={overview.totalOrders} icon={<ShoppingCartOutlined />} />
                    </Col>
                    <Col xs={24} sm={8}>
                        <KPICard title="Stock Overview" value={overview.totalStock} icon={<DatabaseOutlined />} />
                    </Col>
                    <Col xs={24} sm={8}>
                        <KPICard title="Low Stock Items" value={overview.lowStock} icon={<DatabaseOutlined />} />
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold">Orders Overview (Read-only)</span>} className="rounded-2xl shadow-sm">
                            <Table
                                dataSource={recentOrders}
                                rowKey="id"
                                columns={[
                                    { title: 'Order', dataIndex: 'orderNumber', key: 'orderNumber' },
                                    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
                                    { title: 'Total', dataIndex: 'total', key: 'total' },
                                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color="blue">{s}</Tag> },
                                ]}
                                pagination={false}
                                size="small"
                            />
                            <Link to="/sales-orders" className="text-blue-600 font-medium text-sm mt-2 inline-block">View orders →</Link>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold">Quick Links (View only)</span>} className="rounded-2xl shadow-sm">
                            <div className="space-y-2">
                                <Link to="/sales-orders" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                                    <ShoppingCartOutlined /> Orders overview <ArrowRightOutlined className="text-xs" />
                                </Link>
                                <Link to="/inventory" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                                    <DatabaseOutlined /> Stock overview <ArrowRightOutlined className="text-xs" />
                                </Link>
                                <Link to="/reports" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                                    <BarChartOutlined /> Reports <ArrowRightOutlined className="text-xs" />
                                </Link>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
}
