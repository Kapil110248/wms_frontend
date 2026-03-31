import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Tag, Progress, message, InputNumber, Space, Input } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

export default function PickingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [pickList, setPickList] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const data = await apiRequest(`/api/picking/${id}`, { method: 'GET' }, token);
            setPickList(data?.data ?? data);
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Pick list not found');
            setPickList(null);
        } finally {
            setLoading(false);
        }
    }, [token, id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const handleStart = async () => {
        try {
            setSubmitting(true);
            await apiRequest(`/api/picking/${id}/start`, { method: 'POST' }, token);
            message.success('Picking started');
            fetchDetail();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to start');
        } finally {
            setSubmitting(false);
        }
    };

    const handleComplete = async () => {
        try {
            setSubmitting(true);
            await apiRequest(`/api/picking/${id}/complete`, { method: 'POST' }, token);
            message.success('Picking completed – order moved to packing');
            fetchDetail();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to complete');
        } finally {
            setSubmitting(false);
        }
    };

    const handleQtyChange = async (itemId, qty) => {
        try {
            await apiRequest(`/api/picking/${id}/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantityPicked: qty }),
                headers: { 'Content-Type': 'application/json' },
            }, token);
            fetchDetail();
        } catch (err) {
            message.error('Failed to update quantity');
        }
    };

    if (loading && !pickList) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-gray-500">Loading...</div>
            </MainLayout>
        );
    }
    if (!pickList) {
        return (
            <MainLayout>
                <div className="p-8">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/picking')}>Back to Picking</Button>
                    <p className="mt-4 text-gray-500">Pick list not found.</p>
                </div>
            </MainLayout>
        );
    }

    const items = pickList.PickListItems || pickList.pickItems || [];
    const totalReq = items.reduce((s, i) => s + parseFloat(i.quantityRequired || 0), 0);
    const totalPicked = items.reduce((s, i) => s + parseFloat(i.quantityPicked || 0), 0);
    const percent = totalReq ? Math.round((totalPicked / totalReq) * 100) : 0;
    const status = (pickList.status || '').toLowerCase();
    const isPending = status === 'pending';
    const isInProgress = status === 'in_progress';
    const isCompleted = status === 'completed';
    const orderNumber = pickList.SalesOrder?.orderNumber || pickList.salesOrderId || '—';
    const customerName = pickList.SalesOrder?.Customer?.name || pickList.SalesOrder?.customer?.name || '—';

    const columns = [
        { title: 'Product', key: 'product', render: (_, r) => (r.Product?.name || r.product?.name) || (r.Product?.sku || r.product?.sku) || '—' },
        { title: 'SKU', key: 'sku', render: (_, r) => (r.Product?.sku || r.product?.sku) || '—' },
        { title: 'Required', dataIndex: 'quantityRequired', key: 'req', width: 100, render: (v) => v ?? '—' },
        {
            title: 'Picked',
            key: 'picked',
            width: 140,
            render: (_, r) => (
                isInProgress ? (
                    <InputNumber
                        min={0}
                        max={r.quantityRequired || 999}
                        value={r.quantityPicked ?? 0}
                        onChange={(v) => handleQtyChange(r.id, v ?? 0)}
                        size="small"
                        className="w-20"
                    />
                ) : (
                    <span className="font-medium">{r.quantityPicked ?? 0}</span>
                )
            ),
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center justify-between">
                    <Space>
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/picking')}>Back</Button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Pick List PL-{id}</h1>
                            <p className="text-gray-500 text-sm">Order {orderNumber} · {customerName}</p>
                        </div>
                    </Space>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchDetail}>Refresh</Button>
                        {isPending && (
                            <Button type="primary" icon={<PlayCircleOutlined />} loading={submitting} onClick={handleStart} className="bg-indigo-600 border-indigo-600">
                                Start Picking
                            </Button>
                        )}
                        {isInProgress && (
                            <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting} onClick={handleComplete} className="bg-green-600 border-green-600">
                                Complete Picking
                            </Button>
                        )}
                    </Space>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                        <Tag color={isCompleted ? 'green' : isInProgress ? 'blue' : 'orange'} className="text-sm font-bold">
                            {(pickList.status || 'PENDING').toUpperCase()}
                        </Tag>
                        <Progress percent={percent} size="small" strokeColor="#6366f1" className="flex-1 max-w-xs" />
                        <span className="text-gray-500 text-sm">{totalPicked} / {totalReq} units</span>
                    </div>

                    {isInProgress && (
                        <div className="mb-4">
                            <Input
                                placeholder="Scan Barcode / SKU to pick..."
                                className="max-w-md"
                                autoFocus
                                onPressEnter={(e) => {
                                    e.preventDefault();
                                    const val = e.target.value.trim().toUpperCase();
                                    if (!val) return;
                                    
                                    const item = items.find(i => {
                                        const pName = (i.Product?.name || i.product?.name || '').toUpperCase();
                                        const pSku = (i.Product?.sku || i.product?.sku || '').toUpperCase();
                                        return pSku === val || pName === val || pSku.includes(val);
                                    });

                                    if (item) {
                                        const current = item.quantityPicked || 0;
                                        const req = item.quantityRequired || 0;
                                        if (current >= req) {
                                            message.warning('Item already fully picked');
                                        } else {
                                            handleQtyChange(item.id, current + 1);
                                            message.success(`Picked: ${item.Product?.sku || 'Item'} (+1)`);
                                            e.target.value = '';
                                        }
                                    } else {
                                        message.error('Item not found in pick list');
                                    }
                                }}
                            />
                        </div>
                    )}

                    <Table columns={columns} dataSource={items} rowKey="id" pagination={false} size="small" />
                </Card>
            </div>
        </MainLayout>
    );
}
