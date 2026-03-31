import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Table, Tag, message, Spin } from 'antd';
import {
    ShopOutlined,
    TeamOutlined,
    ShoppingCartOutlined,
    HomeOutlined,
    SafetyCertificateOutlined,
    BarChartOutlined,
    SettingOutlined,
    CrownOutlined,
    ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const recentActivity = [
    { key: '1', action: 'New company registered: Acme Corp', time: '2 mins ago', type: 'info' },
    { key: '2', action: 'User login failed (3 attempts) - user_xyz', time: '15 mins ago', type: 'warning' },
    { key: '3', action: 'System backup completed', time: '1 hour ago', type: 'success' },
];

export default function SuperAdminDashboard() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCompanies: 0,
        activeUsers: 0,
        totalOrders: 0,
        totalWarehouses: 0,
        systemHealth: 'Healthy',
    });

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/superadmin/stats', { method: 'GET' }, token);
            setStats(data.data || { totalCompanies: 0, activeUsers: 0, totalOrders: 0, totalWarehouses: 0, systemHealth: 'Healthy' });
        } catch (err) {
            message.error(err.message || 'Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const quickLinks = [
        { to: '/companies', icon: <ShopOutlined />, label: 'Company Management', desc: 'List, add, edit companies' },
        { to: '/users', icon: <TeamOutlined />, label: 'User Management', desc: 'Admins, reset password, lock/unlock' },
        { to: '/reports', icon: <BarChartOutlined />, label: 'Reports', desc: 'Usage, orders, storage' },
        { to: '/settings', icon: <SettingOutlined />, label: 'System Settings', desc: 'Global config, templates' },
        { to: '/settings', icon: <SafetyCertificateOutlined />, label: 'Security & Logs', desc: 'Login history, activity logs' },
    ];

    if (loading) {
        return (
            <MainLayout>
                <div className="flex flex-col justify-center items-center min-h-[320px] gap-4">
                    <Spin size="large" />
                    <p className="text-gray-500 text-sm font-medium">Loading dashboard…</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <CrownOutlined className="text-lg" />
                        </span>
                        Super Admin
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">System-wide overview • All companies • Global controls</p>
                </div>

                <div>
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Key metrics</h2>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Total Companies" value={stats.totalCompanies} icon={<ShopOutlined />} />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Active Users" value={stats.activeUsers} icon={<TeamOutlined />} />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Total Orders (All)" value={stats.totalOrders} icon={<ShoppingCartOutlined />} />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Categories" value={stats.totalWarehouses} icon={<HomeOutlined />} />
                        </Col>
                    </Row>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px 24px' }}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <SafetyCertificateOutlined className="text-xl text-green-600" />
                            </div>
                            <div>
                                <div className="text-xs font-medium text-gray-500">System Health</div>
                                <div className="text-lg font-semibold text-green-700">{stats.systemHealth}</div>
                            </div>
                        </div>
                        <Tag color="green">All systems operational</Tag>
                    </div>
                </Card>

                <div>
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Quick access</h2>
                    <Row gutter={[16, 16]}>
                        {quickLinks.map((link, i) => (
                            <Col xs={24} sm={12} md={8} key={i}>
                                <Link to={link.to} className="block h-full">
                                    <Card
                                        size="small"
                                        className="h-full rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all duration-200"
                                        bodyStyle={{ padding: '16px' }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                {link.icon}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-slate-800">{link.label}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{link.desc}</div>
                                            </div>
                                            <ArrowRightOutlined className="text-gray-400 shrink-0" />
                                        </div>
                                    </Card>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </div>

                <Card
                    title={<span className="font-semibold text-slate-800">Recent Activity</span>}
                    className="rounded-xl border border-gray-100 shadow-sm"
                >
                    <Table
                        dataSource={recentActivity}
                        columns={[
                            { title: 'Action', dataIndex: 'action', key: 'action', render: (t) => <span className="font-medium text-slate-700">{t}</span> },
                            { title: 'Time', dataIndex: 'time', key: 'time', width: 120, className: 'text-gray-500' },
                            {
                                title: '',
                                key: 'type',
                                width: 80,
                                render: (_, r) => (
                                    <Tag color={r.type === 'success' ? 'green' : r.type === 'warning' ? 'orange' : 'blue'}>{r.type}</Tag>
                                ),
                            },
                        ]}
                        pagination={false}
                        size="small"
                    />
                </Card>
            </div>
        </MainLayout>
    );
}
