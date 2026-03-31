import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, InputNumber, Button, message, Tag, Spin, Card } from 'antd';
import {
    QrcodeOutlined, ArrowUpOutlined, ArrowDownOutlined,
    CheckCircleOutlined, WarningOutlined, ReloadOutlined, DeleteOutlined
} from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';

const { Option } = Select;

// Stock status badge
function StockBadge({ qty }) {
    if (qty === null || qty === undefined) return null;
    if (qty <= 0) return <Tag color="red" icon={<WarningOutlined />}>Out of Stock</Tag>;
    if (qty <= 50) return <Tag color="orange" icon={<WarningOutlined />}>Low Stock</Tag>;
    return <Tag color="green" icon={<CheckCircleOutlined />}>In Stock</Tag>;
}

export default function ScanScreen() {
    const { token } = useAuthStore();
    const inputRef = useRef(null);

    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingDeps, setLoadingDeps] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [qty, setQty] = useState(1);
    const [action, setAction] = useState('IN');
    const [processing, setProcessing] = useState(false);

    // Session history log
    const [history, setHistory] = useState([]);

    // Current stock of selected product+warehouse
    const [currentStock, setCurrentStock] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);

    // Load products + warehouses
    const fetchDeps = useCallback(async () => {
        if (!token) return;
        setLoadingDeps(true);
        try {
            const [prodRes, whRes] = await Promise.all([
                apiRequest('/api/inventory/products', { method: 'GET' }, token),
                apiRequest('/api/warehouses', { method: 'GET' }, token),
            ]);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
        } catch {
            setProducts([]);
            setWarehouses([]);
        } finally {
            setLoadingDeps(false);
        }
    }, [token]);

    useEffect(() => { fetchDeps(); }, [fetchDeps]);

    // Load current stock when product + warehouse selected
    const fetchCurrentStock = useCallback(async () => {
        if (!token || !selectedProduct || !selectedWarehouse) { setCurrentStock(null); return; }
        setLoadingStock(true);
        try {
            const res = await apiRequest('/api/inventory/stock', { method: 'GET' }, token);
            const all = Array.isArray(res.data) ? res.data : [];
            const match = all.find(i =>
                (i.productId === selectedProduct || i.Product?.id === selectedProduct) &&
                (i.warehouseId === selectedWarehouse || i.Warehouse?.id === selectedWarehouse)
            );
            setCurrentStock(match ? (match.quantity || 0) : 0);
        } catch {
            setCurrentStock(null);
        } finally {
            setLoadingStock(false);
        }
    }, [token, selectedProduct, selectedWarehouse]);

    useEffect(() => { fetchCurrentStock(); }, [fetchCurrentStock]);

    const handleScan = async () => {
        if (!selectedProduct || !selectedWarehouse || !qty) {
            message.warning('Product, Warehouse aur Quantity select karo pehle!');
            return;
        }
        setProcessing(true);
        try {
            const adjustmentQty = action === 'IN' ? Math.abs(qty) : -Math.abs(qty);
            await apiRequest('/api/inventory/adjustments', {
                method: 'POST',
                body: JSON.stringify({
                    productId: selectedProduct,
                    warehouseId: selectedWarehouse,
                    quantity: adjustmentQty,
                    reason: action === 'IN' ? 'SCAN_IN' : 'SCAN_OUT',
                    notes: `Quick scan ${action === 'IN' ? 'Stock In' : 'Stock Out'} — ${new Date().toLocaleTimeString()}`
                })
            }, token);

            const prod = products.find(p => p.id === selectedProduct);
            const wh = warehouses.find(w => w.id === selectedWarehouse);

            const newEntry = {
                id: Date.now(),
                action,
                qty: Number(qty),
                product: prod?.name || 'Product',
                sku: prod?.sku || '',
                warehouse: wh?.name || 'Warehouse',
                time: new Date().toLocaleTimeString(),
            };

            // Add to top of history
            setHistory(prev => [newEntry, ...prev]);

            message.success({
                content: `✅ Stock ${action === 'IN' ? 'In' : 'Out'}: ${qty} units — ${prod?.name}`,
                duration: 2,
            });

            setQty(1);
            fetchCurrentStock();
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err) {
            message.error(err?.message || 'Operation failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleScan();
    };

    const prodOptions = products.map(p => ({
        value: p.id,
        label: `${p.name} (${p.sku})`,
    }));

    const whOptions = warehouses.map(w => ({
        value: w.id,
        label: w.name,
    }));

    // Total IN / OUT from session
    const totalIn = history.filter(h => h.action === 'IN').reduce((s, h) => s + h.qty, 0);
    const totalOut = history.filter(h => h.action === 'OUT').reduce((s, h) => s + h.qty, 0);

    if (loadingDeps) return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spin size="large" tip="Loading..." />
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto mt-4 pb-12 animate-in fade-in duration-300">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-3">
                        <QrcodeOutlined className="text-3xl text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Quick Scan</h1>
                    <p className="text-gray-500 text-sm mt-1">Scan product → Stock In / Out instantly</p>
                </div>

                {/* Main Card */}
                <Card className="rounded-2xl shadow-md border-gray-100 mb-5">
                    <div className="space-y-5">
                        {/* Product Select */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">📦 Product</label>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Search aur product chuno..."
                                className="w-full"
                                size="large"
                                value={selectedProduct}
                                onChange={setSelectedProduct}
                                options={prodOptions}
                            />
                        </div>

                        {/* Warehouse Select */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">🏭 Warehouse</label>
                            <Select
                                placeholder="Warehouse chuno..."
                                className="w-full"
                                size="large"
                                value={selectedWarehouse}
                                onChange={setSelectedWarehouse}
                                options={whOptions}
                            />
                        </div>

                        {/* Current Stock indicator */}
                        {selectedProduct && selectedWarehouse && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-sm text-gray-500">Current Stock:</span>
                                {loadingStock
                                    ? <Spin size="small" />
                                    : <>
                                        <span className="font-bold text-gray-800 text-lg">{currentStock ?? '—'}</span>
                                        <span className="text-xs text-gray-400">units</span>
                                        <StockBadge qty={currentStock} />
                                    </>
                                }
                                <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchCurrentStock} className="ml-auto" />
                            </div>
                        )}

                        {/* Stock In / Out Toggle */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Action</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAction('IN')}
                                    className={`flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all border-2 ${action === 'IN'
                                        ? 'bg-green-500 border-green-500 text-white shadow-lg scale-[1.02]'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'}`}
                                >
                                    <ArrowUpOutlined />
                                    STOCK IN
                                </button>
                                <button
                                    onClick={() => setAction('OUT')}
                                    className={`flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all border-2 ${action === 'OUT'
                                        ? 'bg-red-500 border-red-500 text-white shadow-lg scale-[1.02]'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-red-300'}`}
                                >
                                    <ArrowDownOutlined />
                                    STOCK OUT
                                </button>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                            <InputNumber
                                ref={inputRef}
                                min={1}
                                value={qty}
                                onChange={setQty}
                                onKeyDown={handleKeyDown}
                                size="large"
                                className="w-full text-center text-xl"
                                controls
                            />
                            <p className="text-xs text-gray-400 mt-1 text-center">Enter press karo ya niche button dabao</p>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleScan}
                            disabled={processing || !selectedProduct || !selectedWarehouse || !qty}
                            className={`w-full py-5 rounded-xl text-white text-lg font-black tracking-wide transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${action === 'IN'
                                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95'
                                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:scale-95'}`}
                        >
                            {processing
                                ? '⏳ Processing...'
                                : action === 'IN'
                                    ? `✅ STOCK IN — ${qty || 0} Units`
                                    : `📦 STOCK OUT — ${qty || 0} Units`
                            }
                        </button>
                    </div>
                </Card>

                {/* ===== SCAN HISTORY LOG ===== */}
                {history.length > 0 && (
                    <Card
                        className="rounded-2xl shadow-sm border-gray-100"
                        title={
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800">📋 Aaj ki Scan History</span>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="flex items-center gap-1 text-green-600 font-bold">
                                        <ArrowUpOutlined /> +{totalIn}
                                    </span>
                                    <span className="flex items-center gap-1 text-red-500 font-bold">
                                        <ArrowDownOutlined /> -{totalOut}
                                    </span>
                                    <button
                                        onClick={() => setHistory([])}
                                        className="text-gray-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors"
                                    >
                                        <DeleteOutlined /> Clear
                                    </button>
                                </div>
                            </div>
                        }
                        bodyStyle={{ padding: '0' }}
                    >
                        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                            {history.map((entry, idx) => (
                                <div
                                    key={entry.id}
                                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${idx === 0 ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                                >
                                    {/* +/- badge */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-lg ${entry.action === 'IN'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-red-100 text-red-600'
                                    }`}>
                                        {entry.action === 'IN' ? '+' : '-'}{entry.qty}
                                    </div>

                                    {/* Product info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-800 text-sm truncate">{entry.product}</div>
                                        <div className="text-xs text-gray-400">{entry.sku} · {entry.warehouse}</div>
                                    </div>

                                    {/* Time + tag */}
                                    <div className="text-right shrink-0">
                                        <Tag
                                            color={entry.action === 'IN' ? 'green' : 'red'}
                                            className="text-xs font-bold mb-1"
                                        >
                                            {entry.action === 'IN' ? '▲ IN' : '▼ OUT'}
                                        </Tag>
                                        <div className="text-[11px] text-gray-400">{entry.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary bar */}
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-sm rounded-b-2xl">
                            <span className="text-gray-500">{history.length} scans this session</span>
                            <span className="font-semibold text-gray-700">
                                Net: <span className={totalIn - totalOut >= 0 ? 'text-green-600' : 'text-red-500'}>
                                    {totalIn - totalOut >= 0 ? '+' : ''}{totalIn - totalOut} units
                                </span>
                            </span>
                        </div>
                    </Card>
                )}

                {/* Quick instructions */}
                <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700 font-semibold mb-1">⚡ Fast Scanning Tips</p>
                    <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                        <li>Product select karo → Quantity type karo → Enter dabao</li>
                        <li>Product & Warehouse selection save rehti hai — sirf qty change karo</li>
                        <li>Stock In (green) = maal aaya | Stock Out (red) = maal gaya</li>
                    </ul>
                </div>
            </div>
        </MainLayout>
    );
}
