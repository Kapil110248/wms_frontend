import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Table, Tag, Spin } from 'antd';
import {
    DatabaseOutlined,
    WarningOutlined,
    SwapOutlined,
    AppstoreOutlined,
    InboxOutlined,
    HomeOutlined,
    BarChartOutlined,
    ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';

export default function InventoryManagerDashboard() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ lowStockItems: 0, movementsToday: 0, totalProducts: 0, totalStock: 0 });
    const [products, setProducts] = useState([]);
    const [stockList, setStockList] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [statsRes, productsRes, stockRes] = await Promise.all([
                    apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                    apiRequest('/api/inventory/products', { method: 'GET' }, token).catch(() => ({ data: [] })),
                    apiRequest('/api/inventory/stock', { method: 'GET' }, token).catch(() => ({ data: [] })),
                ]);
                if (cancelled) return;
                const d = statsRes.data || {};
                setStats({
                    lowStockItems: d.lowStockCount ?? 0,
                    movementsToday: 0,
                    totalProducts: d.products ?? 0,
                    totalStock: d.totalStock ?? 0,
                });
                setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
                setStockList(Array.isArray(stockRes.data) ? stockRes.data : []);
            } catch (_) {
                if (!cancelled) setStats({ lowStockItems: 0, movementsToday: 0, totalProducts: 0, totalStock: 0 });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const lowStockList = useMemo(() => {
        const byProduct = {};
        stockList.forEach((s) => {
            byProduct[s.productId] = (byProduct[s.productId] || 0) + (s.quantity || 0);
        });
        return products
            .filter((p) => (byProduct[p.id] ?? 0) < (p.reorderLevel ?? 0))
            .slice(0, 10)
            .map((p) => ({ id: String(p.id), name: p.name, sku: p.sku, current: byProduct[p.id] ?? 0, reorder: p.reorderLevel ?? 0, uom: p.unitOfMeasure || 'EACH' }));
    }, [products, stockList]);

    const todayMovements = [];
    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;
    const quickLinks = [
        { to: '/inventory', icon: <DatabaseOutlined />, label: 'Stock Overview' },
        { to: '/inventory/adjustments', icon: <SwapOutlined />, label: 'Adjustments' },
        { to: '/inventory/movements', icon: <SwapOutlined />, label: 'Movement History' },
        { to: '/products', icon: <AppstoreOutlined />, label: 'Products / SKU' },
        { to: '/purchase-orders', icon: <InboxOutlined />, label: 'Stock In (PO)' },
        { to: '/goods-receiving', icon: <InboxOutlined />, label: 'Goods Receiving' },
        { to: '/warehouses', icon: <HomeOutlined />, label: 'Product Categories' },
        { to: '/reports', icon: <BarChartOutlined />, label: 'Stock Report' },
    ];

    return (
        <MainLayout>
            <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <DatabaseOutlined className="text-purple-500" /> Inventory Manager Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Stock control • Product setup • Inventory accuracy</p>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Low Stock Alerts" value={stats.lowStockItems} icon={<WarningOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Movements Today" value={stats.movementsToday} icon={<SwapOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Total Products" value={stats.totalProducts} icon={<AppstoreOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Total Stock" value={stats.totalStock} icon={<DatabaseOutlined />} />
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-semibold text-gray-800">Low Stock Alerts</span>} className="rounded-xl border border-gray-100 shadow-sm">
                            <Table
                                dataSource={lowStockList}
                                columns={[
                                    { title: 'Product', dataIndex: 'name', key: 'name' },
                                    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
                                    { title: 'Current', dataIndex: 'current', key: 'current', render: (v, r) => <Tag color="orange">{v} {r.uom} (reorder: {r.reorder})</Tag> },
                                ]}
                                pagination={false}
                                size="small"
                                rowKey="id"
                            />
                            <Link to="/inventory" className="text-blue-600 font-medium text-sm mt-2 inline-block hover:underline">View all →</Link>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-semibold text-gray-800">Today Stock Movements</span>} className="rounded-xl border border-gray-100 shadow-sm">
                            <Table
                                dataSource={todayMovements}
                                columns={[
                                    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color={t === 'RECEIVE' ? 'green' : 'blue'}>{t}</Tag> },
                                    { title: 'Product', dataIndex: 'product', key: 'product' },
                                    { title: 'Qty', dataIndex: 'qty', key: 'qty', render: (v, r) => <>{v} <span className="text-[10px] text-gray-400 uppercase">{r.uom || 'EACH'}</span></> },
                                ]}
                                pagination={false}
                                size="small"
                                rowKey="id"
                                locale={{ emptyText: 'No movement data from API yet' }}
                            />
                            <Link to="/inventory/movements" className="text-blue-600 font-medium text-sm mt-2 inline-block hover:underline">Movement history →</Link>
                        </Card>
                    </Col>
                </Row>

                <Card title={<span className="font-semibold text-gray-800">Quick Links</span>} className="rounded-xl border border-gray-100 shadow-sm">
                    <Row gutter={[12, 12]}>
                        {quickLinks.map((link, i) => (
                            <Col xs={12} sm={8} md={6} key={i}>
                                <Link to={link.to}>
                                    <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all">
                                        {link.icon}
                                        <span className="font-medium text-slate-700 text-sm">{link.label}</span>
                                        <ArrowRightOutlined className="text-gray-400 ml-auto text-xs" />
                                    </div>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </div>
        </MainLayout>
    );
}
