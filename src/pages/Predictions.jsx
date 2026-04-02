import React, { useState, useEffect, useCallback } from 'react';
import { Button, Select, message, Spin, Modal, Form, InputNumber, Space, Typography, Tag, Divider, Avatar } from 'antd';
import {
    ReloadOutlined,
    ShoppingCartOutlined,
    FilterOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    HomeOutlined,
    ThunderboltOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Title, Text } = Typography;

// Backend returns status: 'CRITICAL' | 'LOW' | 'HEALTHY'
// Map to our 4-level urgency
const getUrgency = (item) => {
    const status = (item.status || '').toUpperCase();
    if (status === 'CRITICAL') return 'critical';
    if (status === 'LOW') return 'high';
    if (status === 'MEDIUM') return 'medium';
    return 'low';
};

const URGENCY_CONFIG = {
    critical: { label: 'Critical', bg: 'bg-red-50', border: 'border-red-200', badgeBg: '#ef4444', statBg: '#fef2f2', statText: '#ef4444' },
    high: { label: 'High', bg: 'bg-orange-50', border: 'border-orange-200', badgeBg: '#f59e0b', statBg: '#fffbeb', statText: '#d97706' },
    medium: { label: 'Medium', bg: 'bg-teal-50/40', border: 'border-teal-200', badgeBg: '#0d9488', statBg: '#f0fdfa', statText: '#0d9488' },
    low: { label: 'Low / OK', bg: 'bg-green-50/30', border: 'border-green-200', badgeBg: '#22c55e', statBg: '#f0fdf4', statText: '#16a34a' },
};

const daysColor = (days, stock) => {
    if (stock <= 0 || days === 0) return 'text-red-500 font-bold';
    if (days <= 3) return 'text-red-500 font-bold';
    if (days <= 7) return 'text-amber-500 font-semibold';
    return 'text-teal-600 font-semibold';
};

const daysLabel = (days, stock) => {
    if (stock <= 0 || days === 0) return 'Out!';
    if (days === null) return '—';
    return `${days} days`;
};

// Simple horizontal progress bar
const Bar = ({ percent = 0, color = '#0d9488', height = 4 }) => (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#e5e7eb' }}>
        <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: color }}
        />
    </div>
);

export default function Predictions() {
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const orderType = Form.useWatch('type', form);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [data, setData] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [formulas, setFormulas] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [counts, setCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0 });

    // Reorder Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [predRes, whRes, formulaRes, supplierRes] = await Promise.all([
                apiRequest('/api/predictions', { method: 'GET' }, token).catch(e => { console.error('Predictions fetch error:', e); return { data: [] }; }),
                apiRequest('/api/warehouses', { method: 'GET' }, token).catch(e => { console.error('Warehouses fetch error:', e); return { data: [] }; }),
                apiRequest('/api/production/formulas', { method: 'GET' }, token).catch(e => { console.error('Formulas fetch error:', e); return { data: [] }; }),
                apiRequest('/api/suppliers', { method: 'GET' }, token).catch(e => { console.error('Suppliers fetch error:', e); return { data: [] }; })
            ]);

            const list = Array.isArray(predRes?.data) ? predRes.data : [];
            setWarehouses(whRes.data || []);
            setFormulas(formulaRes.data || []);
            setSuppliers(supplierRes.data || []);

            const c = { critical: 0, high: 0, medium: 0, low: 0 };
            const enriched = list.map(item => {
                const urgency = getUrgency(item);
                c[urgency]++;
                return { ...item, urgency };
            });
            // Sort: critical first
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            enriched.sort((a, b) => order[a.urgency] - order[b.urgency]);
            setData(enriched);
            setCounts(c);
        } catch (err) {
            message.error(err?.message || 'Failed to load data');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenReorder = (item) => {
        setSelectedItem(item);
        const hasFormula = formulas.some(f => f.productId === item.id);
        form.setFieldsValue({
            quantity: item.suggestedReorder || 0,
            warehouseId: item.warehouseId || warehouses[0]?.id,
            type: hasFormula ? 'production' : 'purchase',
            supplierId: item.supplierId || suppliers[0]?.id
        });
        setIsModalOpen(true);
    };

    const handleConfirmReorder = async (values) => {
        setActionLoading(true);
        try {
            if (values.type === 'production') {
                await apiRequest('/api/production', {
                    method: 'POST',
                    body: JSON.stringify({
                        productId: selectedItem.id,
                        quantityGoal: values.quantity,
                        warehouseId: values.warehouseId,
                        productionAreaId: selectedItem.productionAreaId,
                        notes: 'Created from Stock Prediction recommendation'
                    })
                }, token);
                message.success(`Production order created for ${selectedItem.name}`);
            } else {
                // For Purchase Order
                if (!values.supplierId) {
                    message.error('Please select a supplier for purchase orders');
                    setActionLoading(false);
                    return;
                }
                await apiRequest('/api/purchase-orders', {
                    method: 'POST',
                    body: JSON.stringify({
                        supplierId: values.supplierId,
                        items: [{
                            productId: selectedItem.id,
                            quantity: values.quantity,
                            unitPrice: selectedItem.costPrice || 0,
                            productName: selectedItem.name,
                            productSku: selectedItem.sku
                        }],
                        warehouseId: values.warehouseId,
                        status: 'pending'
                    })
                }, token);
                message.success(`Purchase order created for ${selectedItem.name}`);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            message.error(err.message || 'Failed to create reorder');
        } finally {
            setActionLoading(false);
        }
    };

    const filtered = filter === 'all' ? data : data.filter(d => d.urgency === filter);

    return (
        <MainLayout>
            <div className="space-y-5 pb-12 animate-in fade-in duration-500">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Prediction &amp; Restock</h1>
                        <p className="text-gray-400 text-sm mt-0.5">AI-powered demand forecasting and reorder recommendations</p>
                    </div>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchData}
                        loading={loading}
                        className="rounded-lg flex items-center gap-1.5"
                    >
                        Refresh Predictions
                    </Button>
                </div>

                {/* Info banner */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3 text-sm">
                    <InfoCircleOutlined className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-gray-600">
                        <span className="font-semibold">Based on last 30 days usage.</span>{' '}
                        Recommendations are calculated using historical consumption patterns and predicted demand.
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { key: 'critical', label: 'Critical' },
                        { key: 'high', label: 'High' },
                        { key: 'medium', label: 'Medium' },
                        { key: 'low', label: 'Low / OK' },
                    ].map(({ key, label }) => {
                        const cfg = URGENCY_CONFIG[key];
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(filter === key ? 'all' : key)}
                                className={`rounded-xl p-4 text-center border-2 transition-all cursor-pointer ${filter === key ? `border-2 ring-2 ring-offset-1` : 'border-gray-100'
                                    }`}
                                style={{
                                    background: cfg.statBg,
                                    borderColor: filter === key ? cfg.statText : undefined,
                                    ringColor: cfg.statText,
                                }}
                            >
                                <div className="text-3xl font-bold" style={{ color: cfg.statText }}>{counts[key]}</div>
                                <div className="text-sm mt-1 font-medium" style={{ color: cfg.statText }}>{label}</div>
                            </button>
                        );
                    })}
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                    <FilterOutlined className="text-gray-400" />
                    <Select
                        value={filter}
                        onChange={setFilter}
                        className="w-40 rounded-lg"
                        options={[
                            { value: 'all', label: 'All Products' },
                            { value: 'critical', label: 'Critical' },
                            { value: 'high', label: 'High' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'low', label: 'Low / OK' },
                        ]}
                    />
                </div>

                {/* Product Cards */}
                <Spin spinning={loading}>
                    {filtered.length === 0 && !loading ? (
                        <div className="text-center py-16 text-gray-400">No predictions available</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((item) => {
                                const cfg = URGENCY_CONFIG[item.urgency];
                                // Backend fields
                                const rawDays = item.daysUntilStockout ?? 9999;
                                const days = rawDays >= 9999 ? null : rawDays; // null = infinite
                                const stock = item.currentStock ?? 0;
                                const avgUsage = item.velocity ?? 0; // already per-day float from backend
                                const reorder = item.suggestedReorder ?? 0;

                                // Confidence: based on how well-stocked (more days = higher confidence)
                                // If critical → low confidence (~60-75%), healthy → high (~88-95%)
                                let confidence = 85;
                                if (item.urgency === 'critical') confidence = Math.max(60, 75 - Math.max(0, 14 - (days ?? 0)) * 2);
                                else if (item.urgency === 'high') confidence = 80;
                                else if (item.urgency === 'medium') confidence = 88;
                                else confidence = 92;

                                // Stock bar (% of 30-day window)
                                const stockBarPct = days === null ? 100 : Math.min(100, Math.round((days / 30) * 100));
                                const stockBarColor = stock <= 0 ? '#ef4444' : days !== null && days <= 3 ? '#ef4444' : days !== null && days <= 7 ? '#f59e0b' : '#0d9488';

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-xl border ${cfg.border} shadow-sm overflow-hidden flex flex-col ${item.isOrdered ? 'opacity-70 contrast-75' : ''}`}
                                    >
                                        {/* Card header */}
                                        <div className={`px-4 pt-4 pb-3 ${cfg.bg}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-gray-800 text-base leading-tight">{item.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{item.sku || item.categoryName || ''}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span
                                                        className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                                                        style={{ background: cfg.badgeBg }}
                                                    >
                                                        {(item.urgency === 'critical' || item.urgency === 'high') && <WarningOutlined />}
                                                        {cfg.label}
                                                    </span>
                                                    {item.isOrdered && (
                                                        <Tag color="default" className="m-0 border-none px-2 rounded-full font-bold text-[10px] uppercase">
                                                            Already Ordered ({item.pendingOrderQty})
                                                        </Tag>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Current Stock + Avg Usage */}
                                            <div className="flex gap-6 mt-3">
                                                <div>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                                        <span>⊙</span> Current Stock
                                                    </p>
                                                    <p className="text-xl font-bold text-gray-800 leading-tight">{stock}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                                        <span>↗</span> Avg Usage
                                                    </p>
                                                    <p className="text-xl font-bold text-gray-800 leading-tight">{avgUsage}<span className="text-xs text-gray-400 font-normal">/day</span></p>
                                                </div>
                                            </div>

                                            {/* Days remaining */}
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">⏱ Days Remaining</span>
                                                <span className={`text-sm ${daysColor(days, stock)}`}>
                                                    {daysLabel(days, stock)}
                                                </span>
                                            </div>
                                            <div className="mt-1.5">
                                                <Bar percent={stockBarPct} color={stockBarColor} height={5} />
                                            </div>
                                        </div>

                                        {/* Card body */}
                                        <div className="px-4 py-3 flex-1 flex flex-col gap-3 relative">
                                            {/* Recommended buy */}
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Recommended Buy</span>
                                                    <span className="text-sm font-bold" style={{ color: cfg.badgeBg }}>
                                                        {reorder > 0 ? `${reorder} units` : '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-xs text-gray-400">Confidence: {confidence}%</span>
                                                </div>
                                                <div className="mt-1">
                                                    <Bar percent={confidence} color="#1e293b" height={4} />
                                                </div>
                                            </div>

                                            {/* Create Reorder button */}
                                            <Button
                                                block
                                                icon={<ShoppingCartOutlined />}
                                                onClick={() => !item.isOrdered && handleOpenReorder(item)}
                                                disabled={item.isOrdered}
                                                style={{ 
                                                    background: item.isOrdered ? '#bfbfbf' : '#0d9488', 
                                                    borderColor: item.isOrdered ? '#bfbfbf' : '#0d9488', 
                                                    color: '#fff' 
                                                }}
                                                className="rounded-lg font-medium"
                                                type={item.isOrdered ? 'default' : 'primary'}
                                            >
                                                {item.isOrdered ? 'Already Ordered' : 'Create Reorder'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Spin>

                {/* Modal: Reorder Form */}
                <Modal
                    title={<div className="flex items-center gap-2"><ShoppingCartOutlined className="text-teal-600" /> Create Reorder</div>}
                    open={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    onOk={() => form.submit()}
                    okText="Place Order"
                    okButtonProps={{ loading: actionLoading, className: 'bg-teal-600 border-teal-600' }}
                    width={400}
                >
                    {selectedItem && (
                        <div className="py-2">
                            <div className="bg-slate-50 p-4 rounded-xl mb-4 flex items-center gap-3 border border-slate-100">
                                <Avatar shape="square" size={48} className="bg-white border border-slate-200 text-teal-600" icon={<AppstoreOutlined />} />
                                <div>
                                    <div className="font-bold text-slate-800">{selectedItem.name}</div>
                                    <div className="text-xs text-slate-400">{selectedItem.sku}</div>
                                </div>
                            </div>

                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleConfirmReorder}
                                initialValues={{ quantity: selectedItem.suggestedReorder }}
                            >
                                <Form.Item
                                    label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Quantity to Order</span>}
                                    name="quantity"
                                    rules={[{ required: true, message: 'Please input quantity' }]}
                                >
                                    <InputNumber min={1} className="w-full h-10 rounded-lg" placeholder="Enter amount..." />
                                </Form.Item>

                                <Form.Item
                                    label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Destination Warehouse</span>}
                                    name="warehouseId"
                                    rules={[{ required: orderType !== 'production', message: 'Select a warehouse' }]}
                                    hidden={orderType === 'production'}
                                >
                                    <Select className="w-full h-10 rounded-lg" placeholder="Select facility...">
                                        {warehouses.map(w => (
                                            <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Order Method</span>}
                                    name="type"
                                >
                                    <Select className="w-full h-10 rounded-lg">
                                        <Select.Option value="production"><span><ThunderboltOutlined className="mr-1 text-amber-500" /> Production Order</span></Select.Option>
                                        <Select.Option value="purchase"><span><ShoppingCartOutlined className="mr-1 text-blue-500" /> Purchase Order</span></Select.Option>
                                    </Select>
                                </Form.Item>

                                {orderType === 'purchase' && (
                                    <Form.Item
                                        label={<span className="text-xs font-bold uppercase tracking-wider text-slate-500">Supplier</span>}
                                        name="supplierId"
                                        rules={[{ required: true, message: 'Please select a supplier' }]}
                                    >
                                        <Select className="w-full h-10 rounded-lg" placeholder="Select supplier...">
                                            {suppliers.map(s => (
                                                <Select.Option key={s.id} value={s.id}>{s.name} ({s.code})</Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}

                                <div className="bg-teal-50 p-3 rounded-lg flex items-center gap-2 border border-teal-100 mt-2">
                                    <InfoCircleOutlined className="text-teal-600" />
                                    <Text className="text-[11px] text-teal-800">
                                        {orderType === 'production'
                                            ? "This will create a production run with automated BOM deduction."
                                            : "This will create a purchase order for external procurement."}
                                    </Text>
                                </div>
                            </Form>
                        </div>
                    )}
                </Modal>

            </div>
        </MainLayout>
    );
}
