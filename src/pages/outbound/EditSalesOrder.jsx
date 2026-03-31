import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Form, InputNumber, Select, DatePicker, Table, message } from 'antd';
import { ArrowLeftOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const PRIORITY_OPTIONS = [{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }];
const CHANNEL_OPTIONS = [{ value: 'DIRECT', label: 'Direct' }, { value: 'AMAZON_FBA', label: 'Amazon FBA' }, { value: 'SHOPIFY', label: 'Shopify' }, { value: 'EBAY', label: 'eBay' }];
const ORDER_TYPE_OPTIONS = [{ value: 'RETAIL_B2C', label: 'Retail (B2C)' }, { value: 'WHOLESALE_B2B', label: 'Wholesale (B2B)' }];

export default function EditSalesOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [orderNumber, setOrderNumber] = useState('');

    const fetchOrder = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await apiRequest(`/api/orders/sales/${id}`, { method: 'GET' }, token);
            const o = res?.data ?? res;
            setOrderNumber(o.orderNumber || '');
            const items = (o.OrderItems || o.orderItems || []).map((i) => ({
                productId: i.productId || i.Product?.id,
                productName: (i.Product?.name || i.product?.name) || 'Product',
                productSku: (i.Product?.sku || i.product?.sku) || '',
                quantity: i.quantity || 1,
                unitPrice: Number(i.unitPrice) || 0,
                available: 0,
            }));
            setOrderItems(items);
            form.setFieldsValue({
                customerId: o.customerId ?? undefined,
                orderDate: o.orderDate ? dayjs(o.orderDate) : dayjs(),
                requiredDate: o.requiredDate ? dayjs(o.requiredDate) : undefined,
                priority: o.priority || 'MEDIUM',
                salesChannel: o.salesChannel || 'DIRECT',
                orderType: o.orderType ?? undefined,
                referenceNumber: o.referenceNumber ?? undefined,
                notes: o.notes ?? undefined,
            });
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load order');
            navigate('/sales-orders');
        } finally {
            setLoading(false);
        }
    }, [token, id, form, navigate]);

    const fetchCustomersAndProducts = useCallback(async () => {
        if (!token) return;
        try {
            const [custRes, prodRes] = await Promise.all([
                apiRequest('/api/orders/customers', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/inventory/products', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            setCustomers(Array.isArray(custRes?.data) ? custRes.data : []);
            setProducts(Array.isArray(prodRes?.data) ? prodRes.data : []);
        } catch (_) {
            setCustomers([]);
            setProducts([]);
        }
    }, [token]);

    useEffect(() => {
        fetchOrder();
        fetchCustomersAndProducts();
    }, [fetchOrder, fetchCustomersAndProducts]);

    const addOrderItem = (productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return;
        const existing = orderItems.find((i) => i.productId === product.id);
        if (existing) {
            setOrderItems(orderItems.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
        } else {
            setOrderItems([
                ...orderItems,
                {
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    quantity: 1,
                    unitPrice: product.price ?? product.costPrice ?? 0,
                    available: 0,
                },
            ]);
        }
    };

    const removeOrderItem = (productId) => setOrderItems(orderItems.filter((i) => i.productId !== productId));
    const updateOrderItemQty = (productId, quantity) =>
        setOrderItems(orderItems.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    const updateOrderItemPrice = (productId, unitPrice) =>
        setOrderItems(orderItems.map((i) => (i.productId === productId ? { ...i, unitPrice } : i)));

    const totalAmount = orderItems.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (i.quantity || 0), 0);

    const handleSubmit = async (values) => {
        if (!token || !id) return;
        if (!orderItems.length) {
            message.error('Add at least one product');
            return;
        }
        try {
            setSaving(true);
            const payload = {
                customerId: values.customerId ? Number(values.customerId) : null,
                orderDate: values.orderDate ? values.orderDate.format('YYYY-MM-DD') : null,
                requiredDate: values.requiredDate ? values.requiredDate.format('YYYY-MM-DD') : null,
                priority: values.priority || 'MEDIUM',
                salesChannel: values.salesChannel || 'DIRECT',
                orderType: values.orderType || null,
                referenceNumber: values.referenceNumber || null,
                notes: values.notes || null,
                items: orderItems.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
            };
            await apiRequest(`/api/orders/sales/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
            message.success('Order updated');
            navigate('/sales-orders');
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    const itemColumns = [
        { title: 'Product', dataIndex: 'productName', key: 'productName', render: (v) => <span className="font-medium">{v}</span> },
        { title: 'SKU', dataIndex: 'productSku', key: 'productSku', render: (v) => <span className="text-gray-500 font-mono text-sm">{v}</span> },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (_, record) => (
                <InputNumber min={1} value={record.quantity} onChange={(v) => updateOrderItemQty(record.productId, v || 1)} className="w-24" />
            ),
        },
        {
            title: 'Unit Price',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            render: (v, record) => (
                <InputNumber min={0} step={0.01} value={v} onChange={(val) => updateOrderItemPrice(record.productId, val)} className="w-28" prefix="£" />
            ),
        },
        {
            title: 'Total',
            key: 'total',
            render: (_, record) => formatCurrency((Number(record.unitPrice) || 0) * (record.quantity || 0)),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeOrderItem(record.productId)} />
            ),
        },
    ];

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <span className="animate-spin text-4xl">⏳</span>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center gap-4">
                    <Link to="/sales-orders" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                        <ArrowLeftOutlined /> Back
                    </Link>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Edit Sales Order</h1>
                    <p className="text-gray-500 mt-1">Order # {orderNumber}</p>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Card title="Order Information" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Form.Item label="Customer" name="customerId" rules={[{ required: true, message: 'Select customer' }]}>
                                <Select placeholder="Select customer" allowClear className="w-full" size="large">
                                    {customers.map((c) => (
                                        <Option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Order Number">
                                <Input value={orderNumber} disabled size="large" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Order Date" name="orderDate" rules={[{ required: true }]}>
                                <DatePicker className="w-full" format="YYYY-MM-DD" size="large" />
                            </Form.Item>
                            <Form.Item label="Required Date" name="requiredDate">
                                <DatePicker className="w-full" format="YYYY-MM-DD" size="large" />
                            </Form.Item>
                            <Form.Item label="Priority" name="priority">
                                <Select options={PRIORITY_OPTIONS} className="w-full" size="large" />
                            </Form.Item>
                            <Form.Item label="Sales Channel" name="salesChannel">
                                <Select options={CHANNEL_OPTIONS} className="w-full" size="large" />
                            </Form.Item>
                            <Form.Item label="Order Type" name="orderType">
                                <Select allowClear placeholder="Select" options={ORDER_TYPE_OPTIONS} className="w-full" size="large" />
                            </Form.Item>
                            <Form.Item label="Reference Number" name="referenceNumber">
                                <Input placeholder="Customer PO or reference" size="large" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <Form.Item label="Notes" name="notes">
                            <TextArea rows={3} placeholder="Notes..." className="rounded-lg" />
                        </Form.Item>
                    </Card>

                    <Card title="Order Items" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <div className="mb-4">
                            <Select
                                showSearch
                                placeholder="Search product to add..."
                                className="w-full max-w-md"
                                size="large"
                                onChange={addOrderItem}
                                value={null}
                                optionFilterProp="label"
                                options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                            />
                        </div>
                        {orderItems.length === 0 ? (
                            <p className="text-gray-500 py-6 text-center">No items. Add products above.</p>
                        ) : (
                            <>
                                <Table columns={itemColumns} dataSource={orderItems} rowKey="productId" pagination={false} size="small" className="mb-4" />
                                <div className="text-right text-lg font-bold border-t pt-4">Total: {formatCurrency(totalAmount)}</div>
                            </>
                        )}
                    </Card>

                    <div className="flex gap-4">
                        <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={saving} className="rounded-xl px-8 h-12 font-bold">
                            Save Changes
                        </Button>
                        <Button size="large" className="rounded-xl h-12" onClick={() => navigate('/sales-orders')}>Cancel</Button>
                    </div>
                </Form>
            </div>
        </MainLayout>
    );
}
