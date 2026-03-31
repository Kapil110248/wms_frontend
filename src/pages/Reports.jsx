import React, { useState, useEffect, useCallback } from 'react';
import { Button, DatePicker, message, Spin } from 'antd';
import {
    FileTextOutlined,
    DownloadOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';
import dayjs from 'dayjs';

const { MonthPicker } = DatePicker;

// Simple horizontal bar chart component
const HBarChart = ({ data = [], color = '#06b6d4' }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="space-y-3 mt-4">
            {data.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-24 text-right text-xs text-gray-500 truncate shrink-0">{item.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                            className="h-5 rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.round((item.value / max) * 100)}%`,
                                backgroundColor: ['#06b6d4', '#1e293b', '#22c55e', '#f59e0b', '#ef4444'][i % 5],
                            }}
                        />
                    </div>
                    <div className="w-8 text-xs text-gray-500 font-mono">{item.value}</div>
                </div>
            ))}
        </div>
    );
};

export default function Reports() {
    const { token } = useAuthStore();
    const [period, setPeriod] = useState('Monthly');
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [loading, setLoading] = useState(false);

    const [stats, setStats] = useState({ stockIn: 0, stockOut: 0, netChange: 0 });
    const [monthlyStats, setMonthlyStats] = useState({ topCategory: '—', lowStockAlerts: 0, outOfStockDays: 0 });
    const [topConsumed, setTopConsumed] = useState([]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Determine date range from period + selectedMonth
            let startDate, endDate;
            const now = selectedMonth || dayjs();

            if (period === 'Daily') {
                startDate = now.startOf('day').format('YYYY-MM-DD');
                endDate = now.endOf('day').format('YYYY-MM-DD');
            } else if (period === 'Weekly') {
                startDate = now.startOf('week').format('YYYY-MM-DD');
                endDate = now.endOf('week').format('YYYY-MM-DD');
            } else {
                startDate = now.startOf('month').format('YYYY-MM-DD');
                endDate = now.endOf('month').format('YYYY-MM-DD');
            }

            // Fetch adjustments for date range
            const adjRes = await apiRequest(
                `/api/inventory/adjustments?startDate=${startDate}&endDate=${endDate}`,
                { method: 'GET' },
                token
            );
            const adjustments = Array.isArray(adjRes?.data) ? adjRes.data : [];

            // Calculate stock in/out
            let stockIn = 0;
            let stockOut = 0;
            const productConsumption = {};

            adjustments.forEach(adj => {
                const qty = Math.abs(adj.quantity || 0);
                const type = (adj.type || '').toUpperCase();
                const prodName = adj.items?.[0]?.product?.name || adj.Product?.name || 'Unknown';

                if (type === 'INCREASE') {
                    stockIn += qty;
                } else if (type === 'DECREASE') {
                    stockOut += qty;
                    // Track consumption per product for the chart
                    if (!productConsumption[prodName]) productConsumption[prodName] = 0;
                    productConsumption[prodName] += qty;
                }
            });

            setStats({ stockIn, stockOut, netChange: stockIn - stockOut });

            // Top 5 consumed
            const top5 = Object.entries(productConsumption)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, value]) => ({ label, value }));
            setTopConsumed(top5);

            // Fetch inventory for low stock alerts
            try {
                const invRes = await apiRequest('/api/inventory/stock', { method: 'GET' }, token);
                const stocks = Array.isArray(invRes?.data) ? invRes.data : [];
                const lowStock = stocks.filter(s => {
                    const avail = (s.quantity || 0) - (s.reserved || 0);
                    return avail > 0 && avail <= 50;
                });
                const outOfStock = stocks.filter(s => {
                    const avail = (s.quantity || 0) - (s.reserved || 0);
                    return avail <= 0;
                });

                // Top category from products
                let topCat = '—';
                try {
                    const prodRes = await apiRequest('/api/inventory/products?limit=200', { method: 'GET' }, token);
                    const prods = Array.isArray(prodRes?.data) ? prodRes.data : [];
                    const catMap = {};
                    prods.forEach(p => {
                        const cat = p.Category?.name || p.categoryName || 'N/A';
                        catMap[cat] = (catMap[cat] || 0) + 1;
                    });
                    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
                    if (sortedCats.length > 0) topCat = sortedCats[0][0];
                } catch {}

                setMonthlyStats({
                    topCategory: topCat,
                    lowStockAlerts: lowStock.length,
                    outOfStockDays: outOfStock.length,
                });
            } catch {}

        } catch (err) {
            message.error(err?.message || 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [token, period, selectedMonth]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Export CSV
    const exportCSV = () => {
        const rows = [
            ['Metric', 'Value'],
            ['Total Stock In', stats.stockIn],
            ['Total Stock Out', stats.stockOut],
            ['Net Change', stats.netChange],
            ['Top Category', monthlyStats.topCategory],
            ['Low Stock Alerts', monthlyStats.lowStockAlerts],
            ['Out of Stock Items', monthlyStats.outOfStockDays],
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${period.toLowerCase()}-${(selectedMonth || dayjs()).format('YYYY-MM')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('CSV exported!');
    };

    // Export PDF (print)
    const exportPDF = () => {
        window.print();
    };

    const periods = ['Daily', 'Weekly', 'Monthly'];
    const periodLabel = `${(selectedMonth || dayjs()).format('MMMM YYYY')} overview`;

    return (
        <MainLayout>
            <div id="reports-page" className="space-y-6 pb-12 animate-in fade-in duration-500">
                {/* Print-only Header */}
                <div className="hidden print:block border-b-2 border-gray-100 pb-4 mb-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 leading-none">Inventory Report</h1>
                            <p className="text-gray-500 text-sm mt-2">{period} Analytics — {periodLabel}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Generated on</p>
                            <p className="text-sm font-medium text-gray-700">{dayjs().format('DD MMM YYYY, hh:mm A')}</p>
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Reports</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Analyze stock movements and consumption patterns</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            icon={<FileTextOutlined />}
                            onClick={exportCSV}
                            className="rounded-lg border-gray-300"
                        >
                            Export CSV
                        </Button>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={exportPDF}
                            style={{ background: '#0d9488', borderColor: '#0d9488' }}
                            className="rounded-lg"
                        >
                            Export PDF
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} className="rounded-lg" />
                    </div>
                </div>

                {/* Date Picker */}
                <div className="no-print">
                    <MonthPicker
                        value={selectedMonth}
                        onChange={v => setSelectedMonth(v || dayjs())}
                        format="MMMM YYYY"
                        allowClear={false}
                        className="rounded-lg"
                        style={{ width: 200 }}
                    />
                </div>

                {/* Period Tabs */}
                <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-fit bg-white no-print">
                    {periods.map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-8 py-2 text-sm font-medium transition-colors ${
                                period === p
                                    ? 'bg-teal-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <Spin spinning={loading}>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4">
                        {/* Total Stock In */}
                        <div className="bg-white border border-l-4 border-l-green-500 border-gray-100 rounded-xl p-5 shadow-sm">
                            <p className="text-sm text-gray-500">Total Stock In</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">+{stats.stockIn.toLocaleString()}</p>
                            <div className="flex justify-end mt-2">
                                <svg className="w-8 h-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>

                        {/* Total Stock Out */}
                        <div className="bg-white border border-l-4 border-l-red-500 border-gray-100 rounded-xl p-5 shadow-sm">
                            <p className="text-sm text-gray-500">Total Stock Out</p>
                            <p className="text-3xl font-bold text-red-500 mt-1">-{stats.stockOut.toLocaleString()}</p>
                            <div className="flex justify-end mt-2">
                                <svg className="w-8 h-8 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                </svg>
                            </div>
                        </div>

                        {/* Net Change */}
                        <div className="bg-white border border-l-4 border-l-teal-500 border-gray-100 rounded-xl p-5 shadow-sm">
                            <p className="text-sm text-gray-500">Net Change</p>
                            <p className={`text-3xl font-bold mt-1 ${stats.netChange >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                                {stats.netChange >= 0 ? '+' : ''}{stats.netChange.toLocaleString()}
                            </p>
                            <div className="flex justify-end mt-2">
                                <svg className="w-8 h-8 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Monthly Stats + Bar Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 mt-4">

                        {/* Monthly Statistics */}
                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                            <p className="font-semibold text-gray-800 text-base">{period} Statistics</p>
                            <p className="text-gray-400 text-xs mt-0.5">{periodLabel}</p>
                            <div className="mt-6 space-y-4 divide-y divide-gray-50">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-500">Top Category</span>
                                    <span className="font-bold text-gray-800">{monthlyStats.topCategory}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-500">Low Stock Alerts</span>
                                    <span className="font-bold text-amber-500">{monthlyStats.lowStockAlerts}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-gray-500">Out of Stock Items</span>
                                    <span className="font-bold text-red-500">{monthlyStats.outOfStockDays}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top 5 Consumed Bar Chart */}
                        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                            <p className="font-semibold text-gray-800 text-base">Top 5 Consumed - {period}</p>
                            <p className="text-amber-500 text-xs mt-0.5">Highest consumption this {period.toLowerCase()}</p>
                            {topConsumed.length > 0 ? (
                                <HBarChart data={topConsumed} />
                            ) : (
                                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                                    No stock out data for this period
                                </div>
                            )}
                        </div>

                    </div>
                </Spin>
            </div>
        </MainLayout>
    );
}
