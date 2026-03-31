import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Row, Col, Progress, Spin, Empty } from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
export default function PickerDashboard() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            pending: { value: 0, change: 0, trend: 'neutral' },
            complete: { value: 0, change: 0, trend: 'up' },
            issue: { value: 0, change: 0, trend: 'flat' },
        },
        pickingQueue: [],
        dailyGoal: 50,
        goalProgress: 0,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, pickingRes] = await Promise.all([
                apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                apiRequest('/api/picking', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);

            const list = Array.isArray(pickingRes.data) ? pickingRes.data : [];
            const queue = list.map((pl) => ({
                id: String(pl.id),
                orderNumber: pl.SalesOrder?.orderNumber ? (pl.SalesOrder.orderNumber.split('-').length === 3 ? `ORD-${pl.SalesOrder.orderNumber.split('-')[2]}` : pl.SalesOrder.orderNumber) : '—',
                customer: pl.SalesOrder?.Customer?.name || '-',
                priority: pl.status === 'in_progress' ? 'high' : 'medium',
                items: (pl.PickListItems && pl.PickListItems.length) || 0,
                status: (pl.status || 'pending').toUpperCase().replace('_', ' '),
            }));

            const pendingCount = list.filter((pl) => ['PENDING', 'IN_PROGRESS', 'ASSIGNED'].includes((pl.status || '').toUpperCase())).length;
            const completedCount = list.filter((pl) => ['PICKED', 'COMPLETED'].includes((pl.status || '').toUpperCase())).length;

            const d = statsRes.data || {};
            // Prefer stats if available, else derived
            const pickedToday = d.ordersPickedToday ?? completedCount;

            const totalOrders = pendingCount + pickedToday;
            const progressPercent = totalOrders > 0 ? Math.round((pickedToday / totalOrders) * 100) : 0;

            setData({
                stats: {
                    pending: { value: pendingCount, change: 0, trend: 'neutral' },
                    complete: { value: pickedToday, change: 0, trend: 'up' },
                    issue: { value: 0, change: 0, trend: 'flat' },
                },
                pickingQueue: queue, // Show ALL
                dailyGoal: totalOrders,
                goalProgress: progressPercent,
            });
        } catch (_) {
            setData((prev) => ({ ...prev, pickingQueue: [] }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const columns = [
        {
            title: 'Order #',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            render: (text) => <span className="font-semibold text-blue-600">{text}</span>
        },
        { title: 'Customer', dataIndex: 'customer', key: 'customer' },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority) => {
                let color = 'default';
                if (priority === 'urgent') color = 'red';
                if (priority === 'high') color = 'orange';
                return <Tag color={color}>{priority}</Tag>;
            },
        },
        { title: 'Items', dataIndex: 'items', key: 'items', render: (val) => <span className="font-medium">{val}</span> },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'default';
                let label = status;
                if (status === 'IN PROGRESS') { color = 'processing'; label = 'In Progress'; }
                if (['PICKED', 'COMPLETED'].includes(status)) { color = 'success'; label = 'Picked'; }
                return <Tag color={color}>{label}</Tag>;
            },
        }
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Dashboard</h1>
                        <p className="text-gray-500 text-sm mt-1">Pick queue and progress for {user?.name || 'Operator'}</p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchData()} loading={loading} className="rounded-xl">
                        Refresh Queue
                    </Button>
                </div>

                <div>
                    <h2 className="text-base font-semibold text-slate-700 mb-4">Key metrics</h2>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8}>
                            <KPICard
                                title="Pending Picks"
                                value={data.stats.pending.value}
                                change={data.stats.pending.change}
                                trend={data.stats.pending.trend}
                                icon={<ClockCircleOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <KPICard
                                title="Picked Today"
                                value={data.stats.complete.value}
                                change={data.stats.complete.change}
                                trend={data.stats.complete.trend}
                                icon={<CheckCircleOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <KPICard
                                title="Issues"
                                value={data.stats.issue.value}
                                change={data.stats.issue.change}
                                trend={data.stats.issue.trend}
                                icon={<WarningOutlined />}
                            />
                        </Col>
                    </Row>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                        <Card
                            title={<span className="font-semibold text-slate-800">Assignments Queue</span>}
                            className="rounded-xl border border-gray-100 shadow-sm h-full"
                            extra={<Tag color="blue">{data.pickingQueue.length} orders</Tag>}
                        >
                            {data.pickingQueue.length > 0 ? (
                                <Table
                                    dataSource={data.pickingQueue}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={{ pageSize: 8 }}
                                    size="middle"
                                />
                            ) : (
                                <Empty description="No pending pick lists. Great job!" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card title={<span className="font-semibold text-slate-800">Daily Progress</span>} className="rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-center py-4">
                                <Progress
                                    type="dashboard"
                                    percent={data.goalProgress}
                                    strokeColor={data.goalProgress >= 100 ? '#52c41a' : '#1890ff'}
                                    gapDegree={60}
                                    strokeWidth={10}
                                    format={(percent) => (
                                        <div className="flex flex-col items-center">
                                            <span className="text-2xl font-bold text-slate-800">{percent}%</span>
                                            <span className="text-xs font-medium text-gray-500">Velocity</span>
                                        </div>
                                    )}
                                />
                                <div className="mt-4 flex justify-between px-4 text-xs font-medium text-gray-500">
                                    <span>Done: {data.stats.complete.value}</span>
                                    <span>Total: {data.dailyGoal}</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
}
