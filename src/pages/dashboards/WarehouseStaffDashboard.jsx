import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Row, Col, Spin } from 'antd';
import {
    InboxOutlined,
    SendOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';

export default function WarehouseStaffDashboard() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        receivedToday: { value: 0, change: 0, trend: 'up' },
        shippedToday: { value: 0, change: 0, trend: 'up' },
        tasksCompleted: { value: 0, change: 0, trend: 'up' },
        pendingTasks: { value: 0, change: 0, trend: 'down' },
    });
    const [myTasks, setMyTasks] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [statsRes, pickingRes, packingRes] = await Promise.all([
                    apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                    apiRequest('/api/picking', { method: 'GET' }, token).catch(() => ({ data: [] })),
                    apiRequest('/api/packing', { method: 'GET' }, token).catch(() => ({ data: [] })),
                ]);
                if (cancelled) return;
                const d = statsRes.data || {};
                const pickList = Array.isArray(pickingRes.data) ? pickingRes.data : [];
                const packList = Array.isArray(packingRes.data) ? packingRes.data : [];
                const tasks = [
                    ...pickList.map((pl) => ({
                        id: `p-${pl.id}`,
                        task: `Pick order ${pl.SalesOrder?.orderNumber || pl.id}`,
                        type: 'Picking',
                        priority: pl.status === 'in_progress' ? 'high' : 'normal',
                        status: pl.status === 'in_progress' ? 'in_progress' : 'pending',
                    })),
                    ...packList.map((t) => ({
                        id: `pk-${t.id}`,
                        task: `Pack order ${t.SalesOrder?.orderNumber || t.id}`,
                        type: 'Packing',
                        priority: t.status === 'packing' ? 'high' : 'normal',
                        status: t.status === 'packing' ? 'in_progress' : 'pending',
                    })),
                ];
                setStats({
                    receivedToday: { value: d.pendingOrders ?? 0, change: 0, trend: 'up' },
                    shippedToday: { value: d.totalOrders ?? 0, change: 0, trend: 'up' },
                    tasksCompleted: { value: 0, change: 0, trend: 'up' },
                    pendingTasks: { value: tasks.length, change: 0, trend: 'down' },
                });
                setMyTasks(tasks);
            } catch (_) {
                setMyTasks([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const columns = [
        { title: 'Task', dataIndex: 'task', key: 'task', render: (text) => <span className="font-semibold">{text}</span> },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (type) => <Tag className="rounded-full px-3">{type}</Tag> },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority) => (
                <Tag color={priority === 'high' ? 'red' : priority === 'normal' ? 'blue' : 'default'} className="uppercase text-[10px] font-bold rounded-full px-3">
                    {priority}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'in_progress' ? 'blue' : 'default'} className="uppercase text-[10px] font-bold rounded-full px-3">
                    {status.replace('_', ' ')}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: () => <Button type="link" size="small">Start Task</Button>,
        },
    ];

    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Operational Pulse</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Mission-critical task manifest and real-time operational flow for {user?.name || 'Staff'}</p>
                    </div>
                </div>

                {/* KPI Cards */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Received Today"
                            value={stats.receivedToday.value}
                            change={stats.receivedToday.change}
                            trend={stats.receivedToday.trend}
                            icon={<InboxOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Shipped Today"
                            value={stats.shippedToday.value}
                            change={stats.shippedToday.change}
                            trend={stats.shippedToday.trend}
                            icon={<SendOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Tasks Completed"
                            value={stats.tasksCompleted.value}
                            change={stats.tasksCompleted.change}
                            trend={stats.tasksCompleted.trend}
                            icon={<CheckCircleOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Pending Tasks"
                            value={stats.pendingTasks.value}
                            change={stats.pendingTasks.change}
                            trend={stats.pendingTasks.trend}
                            icon={<ClockCircleOutlined />}
                        />
                    </Col>
                </Row>

                {/* My Tasks */}
                <Card title={<span className="font-bold text-gray-700">My Priority Tasks</span>} className="shadow-sm rounded-xl border-gray-100">
                    <Table
                        dataSource={myTasks}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                    />
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/goods-receiving">
                        <Button block size="large" className="rounded-lg h-12">Receive Goods</Button>
                    </Link>
                    <Link to="/inventory/movements">
                        <Button block size="large" className="rounded-lg h-12">Stock Movement</Button>
                    </Link>
                    <Link to="/inventory/cycle-counts">
                        <Button block size="large" className="rounded-lg h-12">Cycle Count</Button>
                    </Link>
                    <Link to="/shipments">
                        <Button block size="large" className="rounded-lg h-12">Process Shipment</Button>
                    </Link>
                </div>
            </div>
        </MainLayout>
    );
}
