import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Spin, message, Input, Button, Tag } from 'antd';
import {
    AppstoreOutlined,
    WarningOutlined,
    CloseCircleOutlined,
    ScanOutlined,
    SearchOutlined,
    ReloadOutlined,
    BarcodeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';

// Inventory health color logic
const getHealthStatus = (daysLeft, currentStock) => {
    if (currentStock <= 0) return { label: 'Out', color: 'red', dot: '#ef4444' };
    if (daysLeft === null || daysLeft === undefined) return { label: 'Good', color: 'green', dot: '#22c55e' }; // Unknown usage but has stock
    if (daysLeft <= 0) return { label: 'Out', color: 'red', dot: '#ef4444' };
    if (daysLeft <= 5) return { label: 'Low', color: 'orange', dot: '#f59e0b' };
    return { label: 'Good', color: 'green', dot: '#22c55e' };
};

export default function CompanyDashboard() {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const barcodeRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalProducts: 0, itemsInStock: 0, lowStockItems: 0, outOfStock: 0 });
    const [stockData, setStockData] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [barcode, setBarcode] = useState('');
    const [scanLoading, setScanLoading] = useState(false);

    const fetchDashboard = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            // 1. Stats
            const statRes = await apiRequest('/api/dashboard/stats', { method: 'GET' }, token);
            const d = statRes?.data || {};

            // 2. Inventory stock for health table
            const invRes = await apiRequest('/api/inventory/stock', { method: 'GET' }, token);
            const stocks = Array.isArray(invRes?.data) ? invRes.data : [];

            let totalStock = 0;
            let lowCount = 0;
            let outCount = 0;

            const rows = stocks.map(s => {
                const avail = Math.max(0, (s.quantity || 0) - (s.reserved || 0));
                totalStock += avail;
                // Avg daily usage from adjustments — use stored or default
                const avgDaily = s.avgDailyUsage || s.dailyUsage || s.Product?.avgDailyUsage || 0;
                const daysLeft = avgDaily > 0 ? Math.floor(avail / avgDaily) : (avail > 0 ? null : 0);

                const health = getHealthStatus(daysLeft, avail);
                if (health.label === 'Out') outCount++;
                else if (health.label === 'Low') lowCount++;

                return {
                    id: s.id,
                    productName: s.Product?.name || s.productName || '—',
                    warehouse: s.Warehouse?.name || s.warehouseName || '—',
                    currentStock: avail,
                    avgDaily,
                    health,
                    uom: s.Product?.unitOfMeasure || 'EACH'
                };
            });

            setStats({
                totalProducts: d.products ?? stocks.length,
                itemsInStock: totalStock,
                lowStockItems: lowCount || d.lowStockCount || 0,
                outOfStock: outCount,
            });
            setStockData(rows);
            setFiltered(rows);
        } catch (err) {
            message.error(err?.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    // Filter on search change
    useEffect(() => {
        if (!search.trim()) { setFiltered(stockData); return; }
        const q = search.toLowerCase();
        setFiltered(stockData.filter(r =>
            r.productName.toLowerCase().includes(q) ||
            r.warehouse.toLowerCase().includes(q)
        ));
    }, [search, stockData]);

    // Quick Scan handler
    const handleScan = async () => {
        const val = barcode.trim();
        if (!val) return;
        setScanLoading(true);
        try {
            // Use 'search' parameter as expected by the backend
            const res = await apiRequest(`/api/inventory/products?search=${encodeURIComponent(val)}&limit=1`, { method: 'GET' }, token);
            const prods = Array.isArray(res?.data) ? res.data : [];
            
            if (prods.length > 0) {
                message.success(`Found: ${prods[0].name}`);
                // Pass the scanned value to FastScan for automatic processing
                navigate('/fast-scan', { state: { initialScan: val } });
            } else {
                message.warning('Product not found for this barcode/SKU');
            }
        } catch (err) {
            message.error('Scan failed');
        } finally {
            setScanLoading(false);
            setBarcode('');
            barcodeRef.current?.focus();
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-[320px]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6 pb-12 animate-in fade-in duration-500">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Inventory overview and stock health monitoring</p>
                </div>

                {/* High Impact Stats Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Counter: Total Units in Stock */}
                    <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 rounded-[2rem] p-8 shadow-2xl shadow-blue-200 group transition-all duration-500 hover:scale-[1.01]">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <span className="text-blue-100 text-xs font-black uppercase tracking-[0.3em]">Live Inventory</span>
                                <h1 className="text-white text-5xl md:text-6xl font-black tracking-tighter">
                                    {stats.itemsInStock.toLocaleString()}
                                    <span className="text-blue-200 text-xl ml-3 font-medium tracking-normal">Units in Stock</span>
                                </h1>
                                <p className="text-blue-100/80 text-sm font-medium max-w-sm">
                                    Total cumulative quantity of all products across all connected warehouse locations.
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                    <p className="text-blue-100 text-[10px] font-bold uppercase mb-1">Total SKUs</p>
                                    <p className="text-white text-3xl font-black">{stats.totalProducts.toLocaleString()}</p>
                                </div>
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-500">
                                    <AppstoreOutlined className="text-blue-600 text-3xl" />
                                </div>
                            </div>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-20%] left-[-5%] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
                    </div>

                    {/* Secondary Stats Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Low Stock Card */}
                        <div className={`relative overflow-hidden p-6 rounded-[1.5rem] border-none shadow-xl transition-all duration-500 hover:translate-y-[-4px] ${stats.lowStockItems > 0 ? 'bg-amber-50 shadow-amber-100' : 'bg-slate-50 shadow-slate-100'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Low Stock</p>
                                    <p className={`text-3xl font-black ${stats.lowStockItems > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                        {stats.lowStockItems}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Items needing attention</p>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.lowStockItems > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <WarningOutlined className="text-xl" />
                                </div>
                            </div>
                        </div>

                        {/* Out of Stock Card */}
                        <div className={`relative overflow-hidden p-6 rounded-[1.5rem] border-none shadow-xl transition-all duration-500 hover:translate-y-[-4px] ${stats.outOfStock > 0 ? 'bg-rose-50 shadow-rose-100' : 'bg-slate-50 shadow-slate-100'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Out of Stock</p>
                                    <p className={`text-3xl font-black ${stats.outOfStock > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                        {stats.outOfStock}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Critical depletion</p>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.outOfStock > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-400'}`}>
                                    <CloseCircleOutlined className="text-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Scan */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <p className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                        <BarcodeOutlined className="text-teal-500" /> Barcode / Product Search
                    </p>
                    <div className="flex gap-2">
                        <Input
                            ref={barcodeRef}
                            value={barcode}
                            onChange={e => setBarcode(e.target.value)}
                            onPressEnter={handleScan}
                            placeholder="Enter Name, SKU or Barcode..."
                            className="rounded-lg"
                            style={{ borderColor: '#0d9488' }}
                            suffix={
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h1M4 10h1M4 14h1M4 18h1M8 6h1M8 18h1M12 6h1M12 10h1M12 14h1M12 18h1M16 6h1M16 18h1M20 6h1M20 10h1M20 14h1M20 18h1" />
                                </svg>
                            }
                        />
                        <Button
                            type="primary"
                            loading={scanLoading}
                            onClick={handleScan}
                            style={{ background: '#0d9488', borderColor: '#0d9488' }}
                            className="rounded-lg px-6 flex items-center gap-2"
                            icon={<SearchOutlined />}
                        >
                            Search
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Press Enter to search or click the Search button</p>
                </div>

                {/* Inventory Health Overview */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                        <div>
                            <p className="font-semibold text-gray-800">Inventory Health Overview</p>
                            <p className="text-xs text-gray-400 mt-0.5">Monitor stock levels and days until depletion</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Good Stock</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Low Stock</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Out of Stock</span>
                            <Button size="small" icon={<ReloadOutlined />} onClick={fetchDashboard} className="rounded-md" />
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-5 py-3 border-b border-gray-50">
                        <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="Search products..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="rounded-lg w-64"
                            allowClear
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-5 py-3 text-teal-600 font-semibold">Product Name</th>
                                    <th className="text-left px-4 py-3 text-teal-600 font-semibold">Warehouse</th>
                                    <th className="text-center px-4 py-3 text-teal-600 font-semibold">Current Stock</th>
                                    <th className="text-center px-4 py-3 text-teal-600 font-semibold">Stock Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-gray-400">
                                            {loading ? 'Loading...' : 'No inventory data found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((row, i) => (
                                        <tr key={row.id || i} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${row.health.label === 'Out' ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-5 py-3 font-medium text-gray-800">{row.productName}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-teal-600 text-xs">{row.warehouse}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <span className="font-mono font-semibold text-gray-700">{row.currentStock}</span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold">{row.uom}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: row.health.dot }}>
                                                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: row.health.dot }} />
                                                    {row.health.label}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </MainLayout>
    );
}
