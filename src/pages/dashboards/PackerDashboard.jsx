import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Row, Col, Progress, Spin, Empty } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
export default function PackerDashboard() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            pending: { value: 0, change: 0, trend: 'neutral' },
            complete: { value: 0, change: 0, trend: 'up' },
            return: { value: 0, change: 0, trend: 'flat' },
        },
        packingQueue: [],
        dailyGoal: 80,
        goalProgress: 0,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, packingRes] = await Promise.all([
                apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                apiRequest('/api/packing', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const list = Array.isArray(packingRes.data) ? packingRes.data : [];
            const queue = list.map((t) => ({
                id: String(t.id),
                orderNumber: t.SalesOrder?.orderNumber ? (t.SalesOrder.orderNumber.split('-').length === 3 ? `ORD-${t.SalesOrder.orderNumber.split('-')[2]}` : t.SalesOrder.orderNumber) : '—',
                customer: t.SalesOrder?.Customer?.name || '-',
                priority: t.status === 'packing' ? 'high' : 'medium',
                items: (t.PickList?.PickListItems && t.PickList.PickListItems.length) || 0,
                status: (t.status || 'pending').toUpperCase(), // Keep original status mostly, map strictly for display
            }));

            const pendingCount = list.filter((t) => ['PENDING', 'PACKING', 'NOT_STARTED', 'ASSIGNED'].includes((t.status || '').toUpperCase())).length;
            const completedCount = list.filter((t) => (t.status || '').toUpperCase() === 'PACKED').length;

            const d = statsRes.data || {};
            const packedToday = d.ordersPackedToday ?? completedCount;

            const totalOrders = pendingCount + packedToday;
            const progressPercent = totalOrders > 0 ? Math.round((packedToday / totalOrders) * 100) : 0;

            setData({
                stats: {
                    pending: { value: pendingCount, change: 0, trend: 'neutral' },
                    complete: { value: packedToday, change: 0, trend: 'up' },
                    return: { value: 0, change: 0, trend: 'flat' },
                },
                packingQueue: queue, // Show ALL orders including PACKED
                dailyGoal: totalOrders,
                goalProgress: progressPercent,
            });
        } catch (_) {
            setData((prev) => ({ ...prev, packingQueue: [] }));
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
                let label = 'Pending';
                if (status === 'PACKING') { color = 'processing'; label = 'Packing'; }
                if (status === 'PACKED') { color = 'success'; label = 'Completed'; }
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
                        <p className="text-gray-500 text-sm mt-1">Packing queue and progress for {user?.name || 'Operator'}</p>
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
                                title="Pending Orders"
                                value={data.stats.pending.value}
                                change={data.stats.pending.change}
                                trend={data.stats.pending.trend}
                                icon={<ClockCircleOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <KPICard
                                title="Completed Today"
                                value={data.stats.complete.value}
                                change={data.stats.complete.change}
                                trend={data.stats.complete.trend}
                                icon={<CheckCircleOutlined />}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <KPICard
                                title="Returns"
                                value={data.stats.return.value}
                                change={data.stats.return.change}
                                trend={data.stats.return.trend}
                                icon={<UndoOutlined />}
                            />
                        </Col>
                    </Row>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                        <Card
                            title={<span className="font-semibold text-slate-800">Packing Assignments</span>}
                            className="rounded-xl border border-gray-100 shadow-sm h-full"
                            extra={<Tag color="blue">{data.packingQueue.length} active</Tag>}
                        >
                            {data.packingQueue.length > 0 ? (
                                <Table
                                    dataSource={data.packingQueue}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={{ pageSize: 8 }}
                                    size="middle"
                                />
                            ) : (
                                <Empty description="No pending orders." image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                                            <span className="text-xs font-medium text-gray-500">Efficiency</span>
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
