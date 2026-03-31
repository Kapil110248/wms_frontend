import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, Button, Spin, Empty, Badge, Tooltip } from 'antd';
import { 
    ReloadOutlined, 
    ArrowUpOutlined, 
    ArrowDownOutlined, 
    LineChartOutlined,
    ClockCircleOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { playSuccessBeep } from '../../utils/audio';
import { formatNumber } from '../../utils';

export default function LiveStock() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [adjustmentMap, setAdjustmentMap] = useState({}); // { productId: { totalIn, totalOut } }
    const [stats, setStats] = useState({ totalUnits: 0, totalAvailable: 0, liveItems: 0, totalIn: 0, totalOut: 0 });
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [stockRes, adjRes] = await Promise.all([
                apiRequest('/api/inventory/stock', { method: 'GET' }, token),
                apiRequest('/api/inventory/adjustments?limit=5000', { method: 'GET' }, token),
            ]);

            const data = Array.isArray(stockRes.data) ? stockRes.data : [];
            
            // Build per-product adjustment totals (same as Inventory.jsx)
            const adjs = Array.isArray(adjRes.data) ? adjRes.data : [];
            const map = {};
            adjs.forEach(a => {
                const pid = a.productId;
                const wid = a.warehouseId;
                if (!pid || !wid) return;
                const key = `${pid}-${wid}`;
                if (!map[key]) map[key] = { totalIn: 0, totalOut: 0 };
                const qty = parseFloat(a.quantity || 0);
                if (a.type === 'INCREASE') map[key].totalIn = Math.round((map[key].totalIn + qty) * 1e12) / 1e12;
                else if (a.type === 'DECREASE') map[key].totalOut = Math.round((map[key].totalOut + qty) * 1e12) / 1e12;
            });
            setAdjustmentMap(map);

            // Transform data
            const list = data.map(item => ({
                id: item.id,
                productId: item.productId || item.Product?.id || item.product?.id,
                product: item.Product || item.product,
                warehouse: item.Warehouse || item.warehouse,
                location: item.Location || item.location,
                quantity: parseFloat(item.quantity || 0),
                reserved: parseFloat(item.reserved || 0),
                available: Math.max(0, parseFloat(item.quantity || 0) - parseFloat(item.reserved || 0)),
                status: item.status || 'ACTIVE',
                isVirtual: !!item.isVirtual,
                virtualQuantity: item.virtualQuantity != null ? parseFloat(item.virtualQuantity) : null,
            }));

            setInventory(list);

            // Calculate stats
            const totalUnits = list.reduce((acc, curr) => acc + curr.quantity, 0);
            const totalAvailable = list.reduce((acc, curr) => acc + curr.available, 0);
            const liveItems = list.length;
            const totalIn = Math.round(Object.values(map).reduce((s, v) => s + v.totalIn, 0) * 1e12) / 1e12;
            const totalOut = Math.round(Object.values(map).reduce((s, v) => s + v.totalOut, 0) * 1e12) / 1e12;

            setStats({ totalUnits, totalAvailable, liveItems, totalIn, totalOut });
        } catch (err) {
            console.error('Failed to fetch stock list:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchData, 60000); // 60 seconds is enough for stock monitor
        }
        return () => clearInterval(interval);
    }, [fetchData, autoRefresh]);

    const columns = [
        {
            title: 'PRODUCT / SKU',
            key: 'product',
            render: (_, record) => (
                <div>
                    <div className="font-bold text-slate-800 text-sm">{record.product?.name || 'Unknown Item'}</div>
                    <div className="flex gap-1 items-center">
                        <div className="text-[10px] text-slate-400 font-mono">{record.product?.sku || 'NO SKU'}</div>
                        {record.isVirtual && <Tag color="blue" className="text-[8px] px-1 rounded font-bold m-0 h-4 flex items-center">VIRTUAL</Tag>}
                    </div>
                </div>
            )
        },
        {
            title: 'WAREHOUSE / LOCATION',
            key: 'warehouseLocation',
            render: (_, record) => (
                <div>
                    <div className="text-[11px] font-bold text-slate-600">{record.warehouse?.name || 'General'}</div>
                    <div className="text-[11px] text-blue-500 font-mono font-bold uppercase tracking-tight">
                        {record.location?.name || record.location?.code || '—'}
                    </div>
                </div>
            )
        },
        {
            title: (
                <Tooltip title="Total quantity received via Stock IN (all time)">
                    <span className="cursor-help">STOCK IN <InfoCircleOutlined className="text-gray-400 text-xs" /></span>
                </Tooltip>
            ),
            key: 'stockIn',
            width: 120,
            align: 'right',
            render: (_, record) => {
                const key = `${record.productId}-${record.warehouse?.id || record.warehouseId}`;
                const adj = adjustmentMap[key] || { totalIn: 0, totalOut: 0 };
                return (
                    <div className="flex flex-col items-end leading-none">
                        <span className="font-bold text-lg tabular-nums text-emerald-600">{formatNumber(adj.totalIn)}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            {record.product?.unitOfMeasure || 'pcs'}
                        </span>
                    </div>
                );
            }
        },
        {
            title: (
                <Tooltip title="Total quantity dispatched via Stock OUT (all time)">
                    <span className="cursor-help">STOCK OUT <InfoCircleOutlined className="text-gray-400 text-xs" /></span>
                </Tooltip>
            ),
            key: 'stockOut',
            width: 120,
            align: 'right',
            render: (_, record) => {
                const key = `${record.productId}-${record.warehouse?.id || record.warehouseId}`;
                const adj = adjustmentMap[key] || { totalIn: 0, totalOut: 0 };
                return (
                    <div className="flex flex-col items-end leading-none">
                        <span className="font-bold text-lg tabular-nums text-rose-500">{formatNumber(adj.totalOut)}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            {record.product?.unitOfMeasure || 'pcs'}
                        </span>
                    </div>
                );
            }
        },
        {
            title: (
                <Tooltip title="Current available stock = Quantity − Reserved">
                    <span className="cursor-help">AVAILABLE <InfoCircleOutlined className="text-gray-400 text-xs" /></span>
                </Tooltip>
            ),
            dataIndex: 'available',
            key: 'available',
            width: 120,
            align: 'right',
            render: (available, r) => (
                <div className="flex flex-col items-end leading-none">
                    <span className={`font-bold text-lg tabular-nums ${available > 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                        {formatNumber(available)}
                    </span>
                    {r.virtualQuantity != null && (
                        <div className="text-[10px] text-blue-500 font-bold mt-1">
                            VIRTUAL: {formatNumber(r.virtualQuantity)}
                        </div>
                    )}
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                        {r.product?.unitOfMeasure || 'pcs'}
                    </span>
                </div>
            )
        },
        {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => {
                return (
                    <Tag color={status === 'ACTIVE' ? '#10b981' : '#94a3b8'} className="rounded-full border-none px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                        {status}
                    </Tag>
                );
            }
        }
    ];


    return (
        <MainLayout>
            <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-12">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                            LIVE <span className="text-blue-600">INVENTORY</span> MONITOR
                        </h1>
                        <div className="flex items-center gap-2">
                            <Badge status="processing" color="#2563eb" />
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] m-0">Real-time Stock Visibility</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            icon={<ReloadOutlined tabIndex={-1} />} 
                            onClick={fetchData} 
                            loading={loading}
                            className="rounded-xl h-11 px-6 font-bold flex items-center gap-2 border-slate-200 hover:border-blue-500 hover:text-blue-500 transition-all"
                        >
                            Refresh
                        </Button>
                        <Button 
                            type={autoRefresh ? 'primary' : 'default'}
                            icon={<SyncOutlined spin={autoRefresh} />}
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`rounded-xl h-11 px-6 font-bold flex items-center gap-2 transition-all ${autoRefresh ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' : ''}`}
                        >
                            {autoRefresh ? 'LIVE AUTO' : 'PAUSED'}
                        </Button>
                    </div>
                </div>

                {/* KPI CARDS */}
                <Row gutter={[20, 20]}>
                    <Col xs={24} sm={12} xl={5}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-100/50 bg-white overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-500">
                                        <ArrowUpOutlined className="text-blue-500 group-hover:text-white transition-colors duration-500" />
                                    </div>
                                    <Tag color="blue" className="m-0 rounded-full border-none px-3 font-bold text-[10px]">TOTAL</Tag>
                                </div>
                                <Statistic 
                                    title={<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Units</span>}
                                    value={stats.totalUnits}
                                    formatter={v => formatNumber(v)}
                                    valueStyle={{ color: '#2563eb', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.05em' }}
                                />
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    <LineChartOutlined className="text-blue-500" />
                                    <span>Cumulative units in all locations</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} xl={5}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-emerald-100/50 bg-white overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-500">
                                        <ArrowUpOutlined className="text-emerald-500 group-hover:text-white transition-colors duration-500" />
                                    </div>
                                    <Tag color="green" className="m-0 rounded-full border-none px-3 font-bold text-[10px]">IN</Tag>
                                </div>
                                <Statistic 
                                    title={<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Stock IN</span>}
                                    value={stats.totalIn}
                                    formatter={v => formatNumber(v)}
                                    valueStyle={{ color: '#10b981', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.05em' }}
                                />
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    <LineChartOutlined className="text-emerald-500" />
                                    <span>Total received (all time)</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} xl={5}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-rose-100/50 bg-white overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 transition-colors duration-500">
                                        <ArrowDownOutlined className="text-rose-500 group-hover:text-white transition-colors duration-500" />
                                    </div>
                                    <Tag color="red" className="m-0 rounded-full border-none px-3 font-bold text-[10px]">OUT</Tag>
                                </div>
                                <Statistic 
                                    title={<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Stock OUT</span>}
                                    value={stats.totalOut}
                                    formatter={v => formatNumber(v)}
                                    valueStyle={{ color: '#f43f5e', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.05em' }}
                                />
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    <LineChartOutlined className="text-rose-500" />
                                    <span>Total dispatched (all time)</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} xl={5}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-100/50 bg-white overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-500">
                                        <CheckCircleOutlined className="text-emerald-500 group-hover:text-white transition-colors duration-500" />
                                    </div>
                                    <Tag color="cyan" className="m-0 rounded-full border-none px-3 font-bold text-[10px]">READY</Tag>
                                </div>
                                <Statistic 
                                    title={<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Available</span>}
                                    value={stats.totalAvailable}
                                    formatter={v => formatNumber(v)}
                                    valueStyle={{ color: '#0891b2', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.05em' }}
                                />
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    <LineChartOutlined className="text-emerald-500" />
                                    <span>Units available for picking/shipping</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} xl={4}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-100/50 bg-white overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                            <div className="p-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 transition-colors duration-500">
                                        <ClockCircleOutlined className="text-indigo-500 group-hover:text-white transition-colors duration-500" />
                                    </div>
                                    <Tag color="purple" className="m-0 rounded-full border-none px-3 font-bold text-[10px]">ITEMS</Tag>
                                </div>
                                <Statistic 
                                    title={<span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active SKUs</span>}
                                    value={stats.liveItems}
                                    valueStyle={{ color: '#4f46e5', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.05em' }}
                                />
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    <LineChartOutlined className="text-indigo-500" />
                                    <span>Unique product-location assignments</span>
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>


                {/* STOCK LIST TABLE */}
                <Card 
                  className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden"
                  title={
                    <div className="py-4 border-none">
                        <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                            Current Inventory Levels
                        </span>
                    </div>
                  }
                >
                    <Table 
                        dataSource={inventory}
                        columns={columns}
                        rowKey={(r) => `${r.id}-${r.product?.id}-${r.location?.id}`}
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        className="live-log-table"
                        rowClassName="group transition-colors duration-300 hover:bg-slate-50 border-none"
                        scroll={{ x: 600 }}
                    />
                </Card>
            </div>

            <style jsx>{`
                .live-log-table :global(.ant-table-thead > tr > th) {
                    background: transparent;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    border-bottom: 2px solid #f1f5f9;
                }
                .live-log-table :global(.ant-table-tbody > tr > td) {
                    border-bottom: 1px solid #f8fafc;
                    padding: 16px;
                }
            `}</style>
        </MainLayout>
    );
}
