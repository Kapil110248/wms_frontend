import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Tabs, Tooltip, Space, Divider, Alert, Checkbox, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, EyeOutlined, TruckOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, SettingOutlined, ApiOutlined, PrinterOutlined, SendOutlined, ShoppingCartOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatDate } from '../../utils';

const { Search } = Input;
const { Option } = Select;

function deliveryStatusLabel(s) {
    const u = (s || '').toUpperCase();
    if (u === 'DELIVERED') return 'Delivered';
    if (u === 'SHIPPED' || u === 'IN_TRANSIT') return u === 'IN_TRANSIT' ? 'In Transit' : 'Shipped';
    if (u === 'READY_TO_SHIP') return 'Ready to Ship';
    return s || '—';
}

function deliveryStatusColor(s) {
    const u = (s || '').toUpperCase();
    if (u === 'DELIVERED') return 'green';
    if (u === 'SHIPPED' || u === 'IN_TRANSIT') return 'blue';
    if (u === 'READY_TO_SHIP') return 'orange';
    return 'default';
}

export default function Shipments() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [shipments, setShipments] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]);
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [form] = Form.useForm();
    const [batchForm] = Form.useForm();

    const fetchReadyOrders = useCallback(async () => {
        if (!token) return;
        try {
            const [ordersRes, shipmentsRes] = await Promise.all([
                apiRequest('/api/orders/sales?status=PACKED', { method: 'GET' }, token),
                apiRequest('/api/shipments', { method: 'GET' }, token),
            ]);
            const packedList = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
            const allShipments = Array.isArray(shipmentsRes?.data) ? shipmentsRes.data : (shipmentsRes?.data && !Array.isArray(shipmentsRes.data) ? [] : []);
            const readyToShipShipments = allShipments.filter((s) => (s.deliveryStatus || '').toUpperCase() === 'READY_TO_SHIP' && s.SalesOrder);
            const seenOrderIds = new Set(packedList.map((o) => o.id));
            const merged = [...packedList];
            readyToShipShipments.forEach((ship) => {
                const order = ship.SalesOrder;
                if (!order || !order.id) return;
                if (seenOrderIds.has(order.id)) {
                    const idx = merged.findIndex((o) => o.id === order.id);
                    if (idx >= 0 && !merged[idx].Shipment) merged[idx] = { ...merged[idx], Shipment: ship };
                    return;
                }
                seenOrderIds.add(order.id);
                merged.push({ ...order, Shipment: ship });
            });
            setReadyOrders(merged);
        } catch (_) {
            setReadyOrders([]);
        }
    }, [token]);

    const isOrderShipped = (o) => {
        const st = (o?.Shipment?.deliveryStatus || '').toUpperCase();
        return ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(st);
    };
    const ordersAvailableForDispatch = readyOrders.filter((o) => !o.Shipment || !isOrderShipped(o));

    const fetchShipments = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/shipments', { method: 'GET' }, token);
            setShipments(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load shipments');
            setShipments([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchShipments();
    }, [fetchShipments]);

    useEffect(() => {
        if (batchModalOpen) fetchReadyOrders();
    }, [batchModalOpen, fetchReadyOrders]);

    const handleCreateBatch = async (values) => {
        if (selectedOrderIds.length === 0) {
            message.warning('No orders selected');
            return;
        }
        try {
            for (const orderId of selectedOrderIds) {
                const order = readyOrders.find((o) => o.id === orderId);
                const existingShipment = order?.Shipment && !isOrderShipped(order) ? order.Shipment : null;
                if (existingShipment?.id) {
                    await apiRequest(`/api/shipments/${existingShipment.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ courierName: values.carrier }),
                    }, token);
                } else {
                    await apiRequest('/api/shipments', {
                        method: 'POST',
                        body: JSON.stringify({
                            salesOrderId: orderId,
                            courierName: values.carrier,
                        }),
                    }, token);
                }
            }
            message.success('Dispatch Manifest Generated');
            setBatchModalOpen(false);
            fetchShipments();
            setSelectedOrderIds([]);
        } catch (err) {
            message.error(err.message || 'Manifest failure');
        }
    };

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState(null);

    const handleViewClick = (record) => {
        setSelectedShipment(record);
        setViewModalOpen(true);
    };

    const [printModalOpen, setPrintModalOpen] = useState(false);

    const handlePrint = (record) => {
        setSelectedShipment(record);
        setPrintModalOpen(true);
    };

    const shortenOrderNumber = (num) => {
        if (!num) return '—';
        const parts = num.split('-');
        return parts.length === 3 ? `ORD-${parts[2]}` : num;
    };

    const confirmPrint = () => {
        setPrintModalOpen(false);
        message.success('Label sent to printer');
    };
    const columns = [
        { title: 'Shipment ID', dataIndex: 'id', key: 'sn', render: (v, r) => <a onClick={() => handleViewClick(r)} className="font-semibold text-blue-600 hover:underline cursor-pointer">SHI-{String(v).padStart(3, '0')}</a> },
        { title: 'Order', key: 'order', render: (_, r) => <span className="text-slate-600">{shortenOrderNumber(r?.SalesOrder?.orderNumber) || '—'}</span> },
        { title: 'Courier', dataIndex: 'courierName', key: 'carrier', render: (v) => <span>{v || '—'}</span> },
        { title: 'Tracking', dataIndex: 'trackingNumber', key: 'track', render: (v) => <span className="font-mono text-xs text-slate-500">{v || '—'}</span> },
        { title: 'Destination Postcode', key: 'postcode', render: (_, r) => <span className="font-mono text-slate-600">{r?.SalesOrder?.Customer?.postcode || '—'}</span> },
        { title: 'Status', dataIndex: 'deliveryStatus', key: 'status', render: (s) => <Tag color={deliveryStatusColor(s)}>{deliveryStatusLabel(s)}</Tag> },
        { title: 'Dispatch Date', dataIndex: 'dispatchDate', key: 'date', render: (v) => formatDate(v) || '—' },
        {
            title: 'Actions',
            key: 'act',
            render: (_, r) => (
                <Space size="small">
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewClick(r)} title="View" />
                    <Button type="text" icon={<PrinterOutlined className="text-blue-500" />} onClick={() => handlePrint(r)} title="Print" />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-8 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Shipments</h1>
                        <p className="text-gray-500 text-sm mt-1">Logistics oversight and carrier manifest management</p>
                    </div>
                    <Space size="middle" wrap>
                        <Button icon={<SettingOutlined />} className="rounded-xl">Carrier APIs</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="rounded-xl" onClick={() => setBatchModalOpen(true)}>
                            Batch Dispatch
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-blue-600 text-xs font-medium mb-1">In Transit</div>
                        <div className="text-xl font-bold text-slate-800">{shipments.filter(x => (x.deliveryStatus || '').toUpperCase() === 'IN_TRANSIT').length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-green-600 text-xs font-medium mb-1">Delivered</div>
                        <div className="text-xl font-bold text-slate-800">{shipments.filter(x => (x.deliveryStatus || '').toUpperCase() === 'DELIVERED').length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-orange-500 text-xs font-medium mb-1">Awaiting Pickup</div>
                        <div className="text-xl font-bold text-slate-800">{shipments.filter(x => (x.deliveryStatus || '').toUpperCase() === 'READY_TO_SHIP').length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm" bodyStyle={{ padding: '16px' }}>
                        <div className="text-slate-600 text-xs font-medium mb-1">Total</div>
                        <div className="text-xl font-bold text-slate-800">{shipments.length}</div>
                    </Card>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-3">
                        <Search placeholder="Search by waybill, tracking or postcode..." className="max-w-md" prefix={<SearchOutlined />} allowClear />
                        <Button icon={<ReloadOutlined />} onClick={fetchShipments}>Refresh</Button>
                    </div>
                    <Table columns={columns} dataSource={shipments} rowKey="id" loading={loading} className="px-4" />
                </Card>

                <Modal title="Generate Batch Dispatch Manifest" open={batchModalOpen} onCancel={() => setBatchModalOpen(false)} onOk={() => batchForm.submit()} width={1000} className="dispatch-modal">
                    <Form form={batchForm} layout="vertical" onFinish={handleCreateBatch} className="pt-6">
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <Form.Item label="Primary Carrier" name="carrier" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="royal_mail">Royal Mail</Option><Option value="dpd">DPD UK</Option><Option value="dhl">DHL Express</Option></Select></Form.Item>
                            <Form.Item label="Service Class" name="serviceType" initialValue="standard"><Select className="h-11 rounded-xl"><Option value="standard">Standard (48h)</Option><Option value="express">Next Day (24h)</Option><Option value="tracked">Tracked & Signed</Option></Select></Form.Item>
                            <Form.Item label="Operational Notes" name="notes"><Input placeholder="Gate 4 pickup" className="h-11 rounded-xl" /></Form.Item>
                        </div>
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ready for Dispatch ({readyOrders.length}) {ordersAvailableForDispatch.length < readyOrders.length && <span className="text-gray-500 font-normal normal-case">— {ordersAvailableForDispatch.length} selectable</span>}</h4>
                            {ordersAvailableForDispatch.length > 0 && <span className="text-[10px] font-bold text-gray-400 capitalize underline cursor-pointer" onClick={() => setSelectedOrderIds(ordersAvailableForDispatch.map(o => o.id))}>Select All (selectable only)</span>}
                        </div>
                        <Table
                            className="ready-table"
                            pagination={false}
                            scroll={{ y: 320 }}
                            locale={{ emptyText: 'No PACKED orders. Pack orders from Sales Orders first.' }}
                            rowSelection={{
                                selectedRowKeys: selectedOrderIds,
                                onChange: setSelectedOrderIds,
                                getCheckboxProps: (record) => ({ disabled: isOrderShipped(record) }),
                            }}
                            dataSource={readyOrders}
                            rowKey="id"
                            rowClassName={(record) => (isOrderShipped(record) ? 'opacity-70 bg-gray-50' : '')}
                            columns={[
                            { title: 'Order', dataIndex: 'orderNumber', render: (v, r) => {
                                if (!r.Shipment) return <b className="text-indigo-600">{shortenOrderNumber(v) || '—'}</b>;
                                const st = (r.Shipment.deliveryStatus || '').toUpperCase();
                                const isShipped = ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(st);
                                return <span><b className="text-indigo-600">{shortenOrderNumber(v) || '—'}</b><Tag color={isShipped ? 'default' : 'orange'} className="ml-2 text-xs">{isShipped ? 'Already dispatched' : 'Ready to Ship'}</Tag></span>;
                            }},
                            { title: 'Customer', render: (_, r) => r?.Customer?.name || '—' },
                            { title: 'Destination', render: (_, r) => {
                                const c = r?.Customer;
                                if (!c) return '—';
                                const addr = c.address || [c.city, c.state, c.country].filter(Boolean).join(', ');
                                const pc = c.postcode ?? c.post_code ?? '';
                                const postcode = pc ? `, ${pc}` : '';
                                return (addr ? addr + postcode : (pc || '—')).trim() || '—';
                            }},
                            { title: 'Postcode', key: 'postcode', render: (_, r) => {
                                const c = r?.Customer;
                                const pc = c?.postcode ?? c?.post_code ?? '';
                                const display = pc || '—';
                                return display === '—' ? (
                                    <Tooltip title="Add postcode in Customers → Edit customer">
                                        <span className="font-mono text-slate-400">{display}</span>
                                    </Tooltip>
                                ) : (
                                    <span className="font-mono text-slate-600">{display}</span>
                                );
                            }},
                            { title: 'Package Weight', render: (_, r) => {
                                const items = r?.OrderItems || [];
                                let total = 0;
                                let unit = 'kg';
                                items.forEach((oi) => {
                                    const qty = Number(oi.quantity) || 0;
                                    const w = Number(oi.Product?.weight) || 0;
                                    total += qty * w;
                                    if (oi.Product?.weightUnit) unit = oi.Product.weightUnit;
                                });
                                return total > 0 ? `${total} ${unit}` : '—';
                            }}
                        ]} />
                    </Form>
                </Modal>

                <Modal title="Print Label Preview" open={printModalOpen} onCancel={() => setPrintModalOpen(false)} footer={null} width={400}>
                    {selectedShipment && (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="border-2 border-dashed border-gray-300 p-6 w-full rounded-lg bg-white relative">
                                <div className="absolute top-2 right-2 font-bold text-xs text-gray-400">STANDARD</div>
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">{selectedShipment.courierName || 'POST'}</h3>
                                    <div className="h-12 bg-slate-900 w-full my-2 rounded-sm" />
                                    <p className="font-mono text-xs">{selectedShipment.trackingNumber || 'TRK-PENDING-001'}</p>
                                </div>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">TO:</p>
                                        <p className="font-bold">{selectedShipment.SalesOrder?.Customer?.name || 'Customer'}</p>
                                        <p className="text-gray-500">123 Shipping Lane, Warehouse City, UK</p>
                                    </div>
                                    <Divider className="my-2" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">REF:</p>
                                        <p className="font-mono">{shortenOrderNumber(selectedShipment.SalesOrder?.orderNumber)}</p>
                                    </div>
                                </div>
                            </div>
                            <Button type="primary" size="large" icon={<PrinterOutlined />} className="w-full h-12 rounded-xl font-bold" onClick={confirmPrint}>
                                Print Label
                            </Button>
                        </div>
                    )}
                </Modal>

                <Modal title="Shipment Details" open={viewModalOpen} onCancel={() => setViewModalOpen(false)} footer={<Button onClick={() => setViewModalOpen(false)}>Close</Button>} width={560}>
                    {selectedShipment && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Shipment ID</p>
                                        <p className="font-mono font-semibold text-lg text-slate-800">SHI-{String(selectedShipment.id).padStart(3, '0')}</p>
                                    </div>
                                    <div className="text-right">
                                        <Tag color={deliveryStatusColor(selectedShipment.deliveryStatus)}>{deliveryStatusLabel(selectedShipment.deliveryStatus)}</Tag>
                                    </div>
                                    <div className="col-span-2">
                                        <Divider className="my-2" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Sales Order</p>
                                        <p className="font-semibold text-slate-800">{shortenOrderNumber(selectedShipment.SalesOrder?.orderNumber) || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Customer</p>
                                        <p className="font-semibold text-slate-800">{selectedShipment.SalesOrder?.Customer?.name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Courier</p>
                                        <p>{selectedShipment.courierName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Tracking #</p>
                                        <p className="font-mono bg-white p-1 rounded border border-gray-200 inline-block text-sm">{selectedShipment.trackingNumber || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Dispatch Date</p>
                                        <p>{selectedShipment.dispatchDate ? formatDate(selectedShipment.dispatchDate) : '—'}</p>
                                    </div>
                                    {['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes((selectedShipment.deliveryStatus || '').toUpperCase()) && (
                                        <>
                                            <div className="col-span-2"><Divider className="my-2" /></div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-500 font-medium mb-2">Inventory not updated?</p>
                                                <Button size="small" type="default" onClick={async () => {
                                                    try {
                                                        const res = await apiRequest(`/api/shipments/${selectedShipment.id}/deduct-stock`, { method: 'POST' }, token);
                                                    const msg = res?.message || 'Stock deducted. Refresh Inventory / Products page.';
                                                    if (res?.deducted > 0) message.success(msg); else message.warning(msg);
                                                    setViewModalOpen(false);
                                                    fetchShipments();
                                                } catch (e) {
                                                    message.error(e?.message || 'Deduct failed');
                                                }
                                            }} disabled={selectedShipment.stockDeducted}>
                                                {selectedShipment.stockDeducted ? 'Inventory Deducted' : 'Deduct inventory for this shipment'}
                                            </Button>
                                            </div>
                                        </>
                                    )}
                                    {['READY_TO_SHIP', 'PENDING'].includes((selectedShipment.deliveryStatus || '').toUpperCase()) && (
                                        <>
                                            <div className="col-span-2"><Divider className="my-2" /></div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-gray-500 font-medium mb-2">Mark order as dispatched</p>
                                                <Space size="small">
                                                    <Button type="primary" size="small" className="bg-blue-600" onClick={async () => {
                                                        try {
                                                            await apiRequest(`/api/shipments/${selectedShipment.id}`, { method: 'PUT', body: JSON.stringify({ deliveryStatus: 'SHIPPED' }) }, token);
                                                            message.success('Marked as Shipped');
                                                            setViewModalOpen(false);
                                                            fetchShipments();
                                                        } catch (e) {
                                                            message.error(e?.message || 'Update failed');
                                                        }
                                                    }} disabled={selectedShipment.stockDeducted}>Mark as Shipped</Button>
                                                    <Button size="small" onClick={async () => {
                                                        try {
                                                            await apiRequest(`/api/shipments/${selectedShipment.id}`, { method: 'PUT', body: JSON.stringify({ deliveryStatus: 'DELIVERED' }) }, token);
                                                            message.success('Marked as Delivered');
                                                            setViewModalOpen(false);
                                                            fetchShipments();
                                                        } catch (e) {
                                                            message.error(e?.message || 'Update failed');
                                                        }
                                                    }}>Mark as Delivered</Button>
                                                </Space>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div >
        </MainLayout >
    );
}
