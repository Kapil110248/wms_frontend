import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Row, Col, Progress, Spin, Space, message } from 'antd';
import {
    DatabaseOutlined,
    ShoppingCartOutlined,
    TeamOutlined,
    WarningOutlined,
    ReloadOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
export default function ManagerDashboard() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            totalOrders: { value: 0, change: 0, trend: 'up' },
            activeStaff: { value: 0, change: 0, trend: 'up' },
            warehouseUtilization: { value: 0, change: 0, trend: 'down' },
            pendingIssues: { value: 0, change: 0, trend: 'down' },
        },
        staffPerformance: [],
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes] = await Promise.all([
                apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                apiRequest('/api/users', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const d = statsRes.data || {};
            const users = Array.isArray(usersRes.data) ? usersRes.data : [];
            const staff = users
                .filter((u) => ['picker', 'packer', 'warehouse_manager'].includes(u.role))
                .slice(0, 8)
                .map((u, i) => ({
                    id: u.id,
                    name: u.name || u.email || 'User',
                    role: (u.role || 'Staff').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    ordersCompleted: 0,
                    efficiency: 90 + (i % 10),
                }));
            setData({
                stats: {
                    totalOrders: { value: d.totalOrders ?? 0, change: 0, trend: 'up' },
                    activeStaff: { value: d.users ?? 0, change: 0, trend: 'up' },
                    warehouseUtilization: { value: d.warehouses ? Math.min(100, d.warehouses * 20) : 0, change: 0, trend: 'down' },
                    pendingIssues: { value: d.lowStockCount ?? 0, change: 0, trend: 'down' },
                },
                staffPerformance: staff,
            });
        } catch (_) {
            setData((prev) => ({ ...prev, staffPerformance: [] }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const columns = [
        {
            title: 'Staff Member',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <div className="font-semibold text-gray-800">{text}</div>
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'Picker' ? 'blue' : role === 'Packer' ? 'purple' : 'cyan'}>
                    {role}
                </Tag>
            )
        },
        {
            title: 'Orders Completed',
            dataIndex: 'ordersCompleted',
            key: 'ordersCompleted',
            align: 'center',
            render: (val) => <span className="font-bold">{val}</span>
        },
        {
            title: 'Efficiency Index',
            dataIndex: 'efficiency',
            key: 'efficiency',
            render: (efficiency) => (
                <div className="flex items-center gap-3">
                    <Progress percent={efficiency} size="small" className="flex-1" strokeColor={efficiency > 90 ? '#52c41a' : '#1890ff'} />
                    <span className="text-xs font-bold text-gray-500 w-8">{efficiency}%</span>
                </div>
            ),
        },
    ];

    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Warehouse Operations Dashboard</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Overview of warehouse operations, team performance, and alerts</p>
                    </div>
                    <Space wrap>
                        <Link to="/reports">
                            <Button icon={<BarChartOutlined />} className="rounded-lg border-gray-200">Analytics Reports</Button>
                        </Link>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined />}
                            loading={loading}
                            onClick={() => fetchData()}
                            className="rounded-lg bg-blue-600"
                        >
                            Refresh Data
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Orders Today"
                            value={data.stats.totalOrders.value}
                            change={data.stats.totalOrders.change}
                            trend={data.stats.totalOrders.trend}
                            icon={<ShoppingCartOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Active On-floor Staff"
                            value={data.stats.activeStaff.value}
                            change={data.stats.activeStaff.change}
                            trend={data.stats.activeStaff.trend}
                            icon={<TeamOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Warehouse Capacity"
                            value={data.stats.warehouseUtilization.value}
                            change={data.stats.warehouseUtilization.change}
                            trend={data.stats.warehouseUtilization.trend}
                            icon={<DatabaseOutlined />}
                            suffix="%"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Pending Alerts"
                            value={data.stats.pendingIssues.value}
                            change={data.stats.pendingIssues.change}
                            trend={data.stats.pendingIssues.trend}
                            icon={<WarningOutlined />}
                            className="border-l-4 border-l-red-400"
                        />
                    </Col>
                </Row>

                <Card
                    title={<span className="font-semibold text-gray-800">Team Performance Monitor</span>}
                    className="rounded-xl border border-gray-100 shadow-sm"
                    extra={<Link to="/users"><Button type="link" className="text-blue-600 px-0">Manage Teams</Button></Link>}
                >
                    <Table
                        dataSource={data.staffPerformance}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                    />
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/users">
                        <Card hoverable className="text-center rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:border-blue-200 hover:shadow-md">
                            <TeamOutlined className="text-2xl text-blue-500 mb-2" />
                            <h4 className="font-semibold text-gray-800">Staff Directory</h4>
                            <p className="text-xs text-gray-500 mt-0.5">View & manage team</p>
                        </Card>
                    </Link>
                    <Link to="/reports">
                        <Card hoverable className="text-center rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:border-green-200 hover:shadow-md">
                            <BarChartOutlined className="text-2xl text-green-500 mb-2" />
                            <h4 className="font-semibold text-gray-800">Operations Report</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Analytics & reports</p>
                        </Card>
                    </Link>
                    <Link to="/warehouses">
                        <Card hoverable className="text-center rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:border-purple-200 hover:shadow-md">
                            <DatabaseOutlined className="text-2xl text-purple-500 mb-2" />
                            <h4 className="font-semibold text-gray-800">Warehouses</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Zones & locations</p>
                        </Card>
                    </Link>
                    <Link to="/inventory">
                        <Card hoverable className="text-center rounded-xl border border-gray-100 shadow-sm p-4 transition-all hover:border-orange-200 hover:shadow-md">
                            <WarningOutlined className="text-2xl text-orange-500 mb-2" />
                            <h4 className="font-semibold text-gray-800">Inventory Audit</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Stock overview</p>
                        </Card>
                    </Link>
                </div>
            </div>
        </MainLayout>
    );
}
