import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Progress, Row, Col, Tag, Space, Select, Alert, Button, message, Typography } from 'antd';
import {
    WarningOutlined,
    LineChartOutlined,
    ThunderboltOutlined,
    TrophyOutlined,
    SyncOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatNumber } from '../../utils';

export default function MarginAnalysis() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [kpis, setKpis] = useState({
        avgGrossMargin: 0,
        totalNetProfit: 0,
        totalRevenue: 0,
        avgHealthScore: 0,
        improvementPotential: 0,
        lowMarginCount: 0,
        targetMargin: 25,
    });
    const [topPerformers, setTopPerformers] = useState([]);
    const [bottomPerformers, setBottomPerformers] = useState([]);
    const [channels, setChannels] = useState(['Direct']);
    const [categories, setCategories] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState('All Channels');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [alertClosed, setAlertClosed] = useState(false);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedChannel && selectedChannel !== 'All Channels') params.set('channel', selectedChannel);
            if (selectedCategory && selectedCategory !== 'All Categories') params.set('category', selectedCategory);
            const url = `/api/analytics/margins${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await apiRequest(url, { method: 'GET' }, token);
            const data = res?.data || {};
            setProducts(Array.isArray(data.products) ? data.products : []);
            setKpis(data.kpis || {
                avgGrossMargin: 0,
                totalNetProfit: 0,
                totalRevenue: 0,
                avgHealthScore: 0,
                improvementPotential: 0,
                lowMarginCount: 0,
                targetMargin: 25,
            });
            setTopPerformers(Array.isArray(data.topPerformers) ? data.topPerformers : []);
            setBottomPerformers(Array.isArray(data.bottomPerformers) ? data.bottomPerformers : []);
            setChannels(Array.isArray(data.channels) ? data.channels : ['Direct']);
            setCategories(Array.isArray(data.categories) ? data.categories : []);
        } catch (err) {
            message.error(err?.message || 'Failed to load margin data');
            setProducts([]);
            setTopPerformers([]);
            setBottomPerformers([]);
        } finally {
            setLoading(false);
        }
    }, [token, selectedChannel, selectedCategory]);

    useEffect(() => {
        if (token) fetchData();
    }, [token, fetchData]);

    const columns = [
        {
            title: 'Product',
            key: 'product',
            width: 250,
            render: (_, r) => (
                <div>
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.channel} • {r.sku}</div>
                </div>
            ),
        },
        {
            title: 'Grade',
            dataIndex: 'grade',
            key: 'grade',
            width: 80,
            render: (g) => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : g === 'C' ? 'orange' : 'red'}>{g}</Tag>,
        },
        {
            title: 'Price/Cost',
            key: 'pc',
            width: 120,
            render: (_, r) => (
                <div>
                    <div className="text-sm font-medium text-gray-700">£{formatNumber(Number(r.sellingPrice))}</div>
                    <div className="text-xs text-red-500">£{formatNumber(Number(r.productCost))}</div>
                </div>
            ),
        },
        {
            title: 'Gross Margin',
            dataIndex: 'profitMargin',
            key: 'marg',
            width: 140,
            render: (m) => (
                <div className="flex items-center gap-2">
                    <Progress percent={Math.round(Number(m))} size="small" strokeColor={m > 25 ? '#10b981' : m > 15 ? '#3b82f6' : '#ef4444'} />
                </div>
            ),
        },
        {
            title: 'Net',
            dataIndex: 'netProfit',
            key: 'net',
            width: 120,
            render: (v) => <span className="font-medium text-gray-900">£{Math.round(Number(v)).toLocaleString()}</span>,
        },
        {
            title: 'Total',
            dataIndex: 'totalRevenue',
            key: 'total',
            width: 120,
            render: (v) => <span className="text-gray-700">£{Math.round(Number(v)).toLocaleString()}</span>,
        },
        {
            title: 'Health',
            dataIndex: 'healthScore',
            key: 'health',
            width: 120,
            render: (s) => <Progress percent={Math.round(Number(s))} size="small" steps={5} strokeColor={s > 70 ? '#10b981' : s > 40 ? '#f59e0b' : '#ef4444'} />,
        },
    ];

    const lowMarginCount = kpis.lowMarginCount || 0;
    const showAlert = lowMarginCount > 0 && !alertClosed;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-semibold text-blue-600">% Margin Analysis</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Comprehensive profitability analysis with cost breakdown and optimization opportunities</p>
                    </div>
                    <Space>
                        <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading} className="rounded-lg">Refresh</Button>
                        <Button icon={<ExportOutlined />} className="rounded-lg">Export Report</Button>
                        <Select value={selectedChannel} onChange={setSelectedChannel} className="w-40 rounded-lg" options={[{ value: 'All Channels', label: 'All Channels' }, ...channels.map(c => ({ value: c, label: c }))]} />
                        <Select value={selectedCategory} onChange={setSelectedCategory} className="w-44 rounded-lg" options={[{ value: 'All Categories', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
                    </Space>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-xl border-gray-100">
                            <div className="text-gray-500 text-sm mb-1">Average Gross Margin</div>
                            <div className={`text-2xl font-semibold ${kpis.avgGrossMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatNumber(Number(kpis.avgGrossMargin))}%</div>
                            <div className="mt-1 text-xs text-gray-400">Target: {kpis.targetMargin || 25}% | Net: {formatNumber(Number(kpis.avgGrossMargin))}%</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-xl border-gray-100">
                            <div className="text-gray-500 text-sm mb-1">Total Net Profit</div>
                            <div className={`text-2xl font-semibold ${kpis.totalNetProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>£{Math.round(Number(kpis.totalNetProfit)).toLocaleString()}</div>
                            <div className="mt-1 text-xs text-gray-400">Revenue: £{Math.round(Number(kpis.totalRevenue)).toLocaleString()}</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-xl border-gray-100">
                            <div className="text-gray-500 text-sm mb-1">Average Health Score</div>
                            <div className={`text-2xl font-semibold ${kpis.avgHealthScore >= 50 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(Number(kpis.avgHealthScore))} / 100</div>
                            <Progress percent={Math.min(100, Math.max(0, Number(kpis.avgHealthScore)))} showInfo={false} size="small" strokeColor="#10b981" />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-xl border-gray-100">
                            <div className="text-gray-500 text-sm mb-1">Improvement Potential</div>
                            <div className="text-2xl font-semibold text-blue-600">£{Math.round(Number(kpis.improvementPotential)).toLocaleString()}</div>
                            <div className="mt-1 text-xs text-gray-400">{lowMarginCount} products need attention</div>
                        </Card>
                    </Col>
                </Row>

                {showAlert && (
                    <Alert
                        type="warning"
                        message="Low Margin Alert"
                        description={`${lowMarginCount} products have margins below 10%. These require immediate attention to improve profitability.`}
                        showIcon
                        icon={<WarningOutlined />}
                        closable
                        onClose={() => setAlertClosed(true)}
                        className="rounded-xl"
                    />
                )}

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="flex items-center gap-2"><TrophyOutlined /> Top 3 Profit Generators</span>} className="rounded-xl border-gray-100 shadow-sm">
                            <div className="space-y-3">
                                {topPerformers.map((p, i) => (
                                    <div key={p.id || i} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                        <div>
                                            <div className="font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.channel} • {p.sku}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-green-600">£{Math.round(Number(p.totalRevenue)).toLocaleString()}</div>
                                            <div className="text-xs text-green-600">{formatNumber(Number(p.profitMargin))}% margin</div>
                                        </div>
                                    </div>
                                ))}
                                {topPerformers.length === 0 && !loading && <div className="text-gray-400 text-sm py-4 text-center">No data</div>}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="flex items-center gap-2"><WarningOutlined /> Bottom 3 Margins (Need Attention)</span>} className="rounded-xl border-gray-100 shadow-sm">
                            <div className="space-y-3">
                                {bottomPerformers.map((p, i) => (
                                    <div key={p.id || i} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                                        <div>
                                            <div className="font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.channel} • {p.sku}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-semibold ${Number(p.profitMargin) < 10 ? 'text-red-600' : 'text-gray-700'}`}>{formatNumber(Number(p.profitMargin))}%</div>
                                            <div className="text-xs text-gray-500">{p.improvementPotential > 0 ? `+£${Math.round(p.improvementPotential).toLocaleString()} potential` : 'At target'}</div>
                                        </div>
                                    </div>
                                ))}
                                {bottomPerformers.length === 0 && !loading && <div className="text-gray-400 text-sm py-4 text-center">No data</div>}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card title={<span className="flex items-center gap-2"><LineChartOutlined /> Product Margin Details</span>} extra={<span className="text-sm text-gray-500">{products.length} products • £{Math.round(Number(kpis.totalRevenue)).toLocaleString()} revenue</span>} className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Select value={selectedChannel} onChange={setSelectedChannel} className="w-40 rounded-lg" options={[{ value: 'All Channels', label: 'All Channels' }, ...channels.map(c => ({ value: c, label: c }))]} />
                        <Select value={selectedCategory} onChange={setSelectedCategory} className="w-44 rounded-lg" options={[{ value: 'All Categories', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
                    </div>
                    <Table columns={columns} dataSource={products} rowKey="id" loading={loading} pagination={{ pageSize: 10, showTotal: (t) => `Total ${t} products` }} locale={{ emptyText: 'No data' }} className="[&_.ant-table-thead_th]:font-normal" />
                </Card>
            </div>
        </MainLayout>
    );
}
