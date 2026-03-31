import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, InputNumber, Button, Tag, Spin, Card, Empty, Tooltip, message, AutoComplete, Input } from 'antd';
import {
    ArrowUpOutlined, CheckCircleOutlined, WarningOutlined,
    ReloadOutlined, BarcodeOutlined, ScanOutlined
} from '@ant-design/icons';
import { Trash2, Undo } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';
import { playSuccessBeep, playErrorBeep } from '../utils/audio';
import { formatNumber } from '../utils';

function StockBadge({ qty }) {
    if (qty === null || qty === undefined) return null;
    if (qty <= 0) return <Tag color="red" icon={<WarningOutlined />}>Out of Stock</Tag>;
    if (qty <= 50) return <Tag color="orange" icon={<WarningOutlined />}>Low Stock</Tag>;
    return <Tag color="green" icon={<CheckCircleOutlined />}>In Stock</Tag>;
}

export default function StockIn() {
    const { token } = useAuthStore();
    const barcodeRef = useRef(null);
    const qtyRef = useRef(null);

    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [preferredWarehouseId, setPreferredWarehouseId] = useState(null);
    const [loadingDeps, setLoadingDeps] = useState(true);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [qty, setQty] = useState('1.000');
    const [processing, setProcessing] = useState(false);
    const [currentStock, setCurrentStock] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);

    // Barcode scanner state
    const [barcodeInput, setBarcodeInput] = useState('');
    const [searchOptions, setSearchOptions] = useState([]);

    // History from API
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchDeps = useCallback(async () => {
        if (!token) return;
        setLoadingDeps(true);
        try {
            const [prodRes, whRes] = await Promise.all([
                apiRequest('/api/inventory/products', { method: 'GET' }, token),
                apiRequest('/api/warehouses', { method: 'GET' }, token),
            ]);
            const prods = Array.isArray(prodRes.data) ? prodRes.data : [];
            const whs = Array.isArray(whRes.data) ? whRes.data : [];
            setProducts(prods);
            setWarehouses(whs);


        } catch {
            setProducts([]); setWarehouses([]);
        } finally {
            setLoadingDeps(false);
        }
    }, [token, selectedWarehouse]);

    const fetchHistory = useCallback(async () => {
        if (!token) return;
        setLoadingHistory(true);
        try {
            const res = await apiRequest('/api/inventory/adjustments?limit=30', { method: 'GET' }, token);
            const all = Array.isArray(res.data) ? res.data : [];
            // Show only SCAN_IN or positive adjustments
            setHistory(all.filter(a => a.type === 'INCREASE' || a.reason === 'SCAN_IN').slice(0, 20));
        } catch {
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, [token]);

    useEffect(() => { fetchDeps(); fetchHistory(); }, [fetchDeps, fetchHistory]);

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
        } catch { setCurrentStock(null); }
        finally { setLoadingStock(false); }
    }, [token, selectedProduct, selectedWarehouse]);

    useEffect(() => { fetchCurrentStock(); }, [fetchCurrentStock]);

    // Real-time Barcode Matching & Immediate Auto-Submit
    useEffect(() => {
        const query = barcodeInput.trim().toLowerCase();
        if (query) {
            // Find by exact barcode OR exact SKU
            const match = products.find(p => 
                (p.barcode && p.barcode.trim().toLowerCase() === query) || 
                (p.sku && p.sku.trim().toLowerCase() === query)
            );
            
            if (match) {
                setSelectedProduct(match.id);
                // Auto-select product's default warehouse or fallback to first warehouse
                let whId = match.warehouseId || (match.ProductStocks && match.ProductStocks[0]?.warehouseId);
                
                if (!whId && warehouses.length > 0) {
                    whId = warehouses[0].id;
                }

                if (whId) {
                    setSelectedWarehouse(whId);
                    setPreferredWarehouseId(whId);
                } else {
                    setPreferredWarehouseId(null);
                }
                setBarcodeInput('');
                setSearchOptions([]);
                message.success(`🔍 Product Found: ${match.name}`);
                setTimeout(() => qtyRef.current?.focus(), 100);
            }
        }
    }, [barcodeInput, products]);

    const handleSearchSuggestions = (searchText) => {
        setBarcodeInput(searchText);
        if (!searchText) {
            setSearchOptions([]);
            return;
        }
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchText.toLowerCase())) ||
            (p.barcode && p.barcode.toLowerCase().includes(searchText.toLowerCase()))
        ).slice(0, 10);

        setSearchOptions(filtered.map(p => ({
            value: p.barcode || p.sku || p.name,
            label: (
                <div className="flex justify-between items-center py-1">
                    <div>
                        <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">SKU: {p.sku} | BC: {p.barcode || '—'}</div>
                    </div>
                </div>
            )
        })));
    };


    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter' && barcodeInput.trim()) {
            const query = barcodeInput.trim().toLowerCase();
            // Try exact barcode, then exact SKU, then exact Name
            const match = products.find(p => 
                (p.barcode && p.barcode.toLowerCase() === query) ||
                (p.sku && p.sku.toLowerCase() === query) ||
                (p.name && p.name.toLowerCase() === query)
            );

            if (match) {
                setSelectedProduct(match.id);
                // Auto-select product's default warehouse or fallback
                let whId = match.warehouseId || (match.ProductStocks && match.ProductStocks[0]?.warehouseId);
                
                if (!whId && warehouses.length > 0) {
                    whId = warehouses[0].id;
                }

                if (whId) {
                    setSelectedWarehouse(whId);
                }
                setBarcodeInput('');
                setSearchOptions([]);
                message.success(`🔍 Product Found: ${match.name}`);
                setTimeout(() => qtyRef.current?.focus(), 100);
            } else {
                message.error('Product not found — check your search.');
                playErrorBeep();
                setBarcodeInput('');
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !selectedWarehouse || !qty) return;
        setProcessing(true);
        try {
            await apiRequest('/api/inventory/adjustments', {
                method: 'POST',
                body: JSON.stringify({
                    productId: selectedProduct,
                    warehouseId: selectedWarehouse,
                    quantity: Math.abs(qty),
                    type: 'INCREASE',
                    reason: 'SCAN_IN',
                    notes: `Stock In — ${new Date().toLocaleTimeString()}`,
                })
            }, token);

            message.success('✅ Stock In successfully');
            playSuccessBeep();
            setQty(1);
            fetchCurrentStock();
            fetchHistory();
            setTimeout(() => barcodeRef.current?.focus(), 100);
        } catch (err) {
            message.error(err.message || 'Stock in failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteAdjustment = async (id) => {
        try {
            await apiRequest(`/api/inventory/adjustments/${id}`, { method: 'DELETE' }, token);
            message.success('✅ Adjustment deleted and stock reverted');
            fetchHistory();
            fetchCurrentStock();
        } catch (err) {
            message.error(`❌ Delete failed: ${err.message}`);
        }
    };

    const prodOptions = products.map(p => ({ value: p.id, label: `${p.name} ${p.barcode ? `(${p.barcode})` : ''}` }));
    const whOptions = warehouses.map(w => ({ value: w.id, label: w.name }));

    if (loadingDeps) return <MainLayout><div className="flex items-center justify-center min-h-[60vh]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto mt-0 pb-10 px-4 sm:px-0">

                {/* LEFT — Scan form */}
                <div className="w-full lg:w-[380px] shrink-0 space-y-3">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                                <ArrowUpOutlined className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white mb-0 leading-tight">Stock In</h1>
                                <p className="text-emerald-100 text-[10px] m-0 opacity-80 uppercase tracking-widest font-semibold font-mono">Inventory Receipt</p>
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-2xl shadow-sm border-gray-100" bodyStyle={{ padding: 16 }}>
                        <div className="space-y-4">

                            {/* Barcode Scanner */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                    <BarcodeOutlined className="mr-1" /> Search Barcode / Product
                                </label>
                                <AutoComplete
                                    ref={barcodeRef}
                                    options={searchOptions}
                                    onSearch={handleSearchSuggestions}
                                    onSelect={(val) => {
                                        setBarcodeInput(val);
                                        // The useEffect will catch the exact match from AutoComplete selection
                                    }}
                                    value={barcodeInput}
                                    className="w-full"
                                >
                                    <Input
                                        autoFocus
                                        placeholder="Type Name or Barcode..."
                                        onKeyDown={handleBarcodeKeyDown}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono bg-gray-50 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
                                    />
                                </AutoComplete>
                            </div>

                            {/* Selected Product Banner */}
                            {selectedProduct && (() => {
                                const prod = products.find(p => p.id === selectedProduct);
                                return prod ? (
                                    <div className="flex items-center gap-3 px-3 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                            <span className="text-xl">{prod.productType === 'RAW_MATERIAL' ? '🧪' : '📦'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-emerald-900 text-sm leading-tight truncate m-0">{prod.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-emerald-600 font-mono font-bold">BC: {prod.barcode || '—'}</span>
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                    Unit: {prod.unitOfMeasure || 'EACH'}
                                                </span>
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                                    WH: {warehouses.find(w => w.id === selectedWarehouse)?.name || '—'}
                                                </span>
                                                {prod.productType === 'RAW_MATERIAL' && (
                                                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">RAW MAT</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : null;
                            })()}





                            {/* Stock Display Section — Always visible when product selected */}
                            {selectedProduct && selectedWarehouse && (
                                <div className="space-y-4">
                                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Available Balance</span>
                                        {loadingStock ? <Spin size="large" /> : (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-4xl font-black text-gray-900 tabular-nums">{formatNumber(currentStock)}</span>
                                                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                                                    {products.find(p => p.id === selectedProduct)?.unitOfMeasure || 'EACH'}
                                                </span>
                                                <div className="mt-1">
                                                    <StockBadge qty={currentStock} />
                                                </div>
                                            </div>
                                        )}
                                        <Button 
                                            type="text" 
                                            size="small" 
                                            icon={<ReloadOutlined className="text-gray-300" />} 
                                            onClick={fetchCurrentStock} 
                                            className="mt-4 opacity-50 hover:opacity-100"
                                        >
                                            Update Stock
                                        </Button>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                            Receipt Quantity — in <span className="text-blue-600">{products.find(p => p.id === selectedProduct)?.unitOfMeasure || 'EACH'}</span>
                                        </label>
                                        <InputNumber
                                            ref={qtyRef}
                                            stringMode
                                            min={0.00000001}
                                            value={qty}
                                            onChange={setQty}
                                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                            size="large"
                                            className="w-full text-center font-bold text-2xl rounded-2xl h-14 flex items-center justify-center"
                                            controls
                                            formatter={value => value ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 20, useGrouping: false }).format(value) : value}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={processing || !selectedProduct || !selectedWarehouse || !qty}
                                        className="w-full py-5 rounded-2xl text-white text-lg font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xl shadow-emerald-700/20 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest"
                                    >
                                        {processing ? '⏳ Processing...' : 'Add to Inventory'}
                                    </button>
                                </div>
                            )}

                            {/* Manual Rescue — Discrete dropdown */}
                            {!selectedProduct && (
                                <div className="pt-4 border-t border-gray-100">
                                    <Button 
                                        type="link" 
                                        size="small" 
                                        className="text-gray-400 p-0 text-[10px] uppercase font-bold tracking-widest hover:text-emerald-500"
                                        onClick={() => {
                                            // Focus manual select if needed, but keeping it hidden until they scan or we can show it
                                        }}
                                    >
                                        Don't have a barcode?
                                    </Button>
                                    <Select
                                        showSearch 
                                        optionFilterProp="label"
                                        placeholder="Type product name manually..."
                                        className="w-full mt-2" 
                                        size="middle"
                                        value={selectedProduct}
                                        onChange={(val) => {
                                            setSelectedProduct(val);
                                            // Auto-select warehouse from product or fallback
                                            const prod = products.find(p => p.id === val);
                                            let whId = prod?.warehouseId || (prod?.ProductStocks && prod.ProductStocks[0]?.warehouseId);
                                            
                                            if (!whId && warehouses.length > 0) {
                                                whId = warehouses[0].id;
                                            }

                                            if (whId) {
                                                setSelectedWarehouse(whId);
                                                setPreferredWarehouseId(whId);
                                            } else {
                                                setPreferredWarehouseId(null);
                                            }
                                        }}
                                        options={prodOptions}
                                        bordered={false}
                                        style={{ background: '#f8fafc', borderRadius: '12px' }}
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* RIGHT — History */}
                <div className="flex-1 min-w-0">
                    <Card
                        className="rounded-2xl shadow-sm border-gray-100 h-full"
                        title={
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-sm">Recent Stock In Records</span>
                                <Button size="small" type="text" icon={<ReloadOutlined />} onClick={fetchHistory} loading={loadingHistory} className="text-gray-400 text-xs">Refresh</Button>
                            </div>
                        }
                        styles={{ body: { padding: 0 } }}
                    >
                        {loadingHistory ? (
                            <div className="flex items-center justify-center py-16"><Spin /></div>
                        ) : history.length === 0 ? (
                            <div className="py-16"><Empty description={<span className="text-gray-400 text-xs">No active records</span>} /></div>
                        ) : (
                            <div className="divide-y divide-gray-50 max-h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden">
                                {history.map((entry, idx) => {
                                    const prod = entry.items?.[0]?.product || entry.Product || {};
                                    const prodName = prod.name || entry.productName || 'Unknown Product';
                                    const sku = prod.sku || '';
                                    const whName = entry.Warehouse?.name || entry.warehouseName || '—';
                                    const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                                    const displayQty = Math.abs(entry.quantity || entry.items?.[0]?.quantity || 0);
                                    
                                    return (
                                        <div key={entry.id || idx} className="group flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate m-0">{prodName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono font-bold leading-none">{sku || 'NO SKU'}</span>
                                                    <span className="text-[10px] text-gray-400 truncate uppercase font-bold tracking-tight">{whName} — WH</span>
                                                </div>
                                            </div>
                                            
                                            {/* Dedicated Qty Column */}
                                            <div className="w-20 flex flex-col items-center justify-center shrink-0 border-l border-r border-gray-100 px-2 text-center">
                                                <span className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Added</span>
                                                <div className="flex flex-col items-center leading-none">
                                                    <span className="text-xl font-black text-emerald-600">+{formatNumber(displayQty)}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-full">
                                                        {prod.unitOfMeasure || 'EACH'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0 flex items-center gap-3">
                                                <div className="flex flex-col items-end">
                                                   <span className="text-[9px] text-gray-400 font-bold tracking-tighter uppercase whitespace-nowrap">Accepted</span>
                                                   <p className="text-[10px] text-gray-300 font-mono m-0">{dateStr}</p>
                                                </div>
                                                <Tooltip title="Delete & Revert Stock">
                                                    <Button 
                                                        type="text" 
                                                        danger 
                                                        size="small"
                                                        className="opacity-100 text-gray-300 hover:text-red-500"
                                                        icon={<Trash2 size={16} />} 
                                                        onClick={() => handleDeleteAdjustment(entry.id)}
                                                    />
                                                </Tooltip>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
