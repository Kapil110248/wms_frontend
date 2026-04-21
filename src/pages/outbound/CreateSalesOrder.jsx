import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Form, InputNumber, Select, DatePicker, Table, message, Space } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils';
import dayjs from 'dayjs';
import CustomerModal from '../../components/modals/CustomerModal';

const { Option } = Select;
const { TextArea } = Input;

const PRIORITY_OPTIONS = [{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }];
const CHANNEL_OPTIONS = [{ value: 'DIRECT', label: 'Direct' }, { value: 'AMAZON_FBA', label: 'Amazon FBA' }, { value: 'SHOPIFY', label: 'Shopify' }, { value: 'EBAY', label: 'eBay' }];
const ORDER_TYPE_OPTIONS = [{ value: 'RETAIL_B2C', label: 'Retail (B2C)' }, { value: 'WHOLESALE_B2B', label: 'Wholesale (B2B)' }];

export default function CreateSalesOrder() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [customerModalOpen, setCustomerModalOpen] = useState(false);

    const handleCustomerAdded = (newCustomer) => {
        setCustomers((prev) => [...prev, newCustomer]);
        form.setFieldValue('customerId', newCustomer.id);
    };

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
        fetchCustomersAndProducts();
    }, [fetchCustomersAndProducts]);

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
                    available: (product.ProductStocks || product.inventory || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0),
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
        if (!token) return;
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
            await apiRequest('/api/orders/sales', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Order created successfully!');
            navigate('/sales-orders');
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create order');
        } finally {
            setSaving(false);
        }
    };

    const itemColumns = [
        { title: 'Product', dataIndex: 'productName', key: 'productName', render: (v) => <span className="font-medium">{v}</span> },
        { title: 'SKU', dataIndex: 'productSku', key: 'productSku', render: (v) => <span className="text-gray-500 font-mono text-sm">{v}</span> },
        { title: 'Available', dataIndex: 'available', key: 'available', render: (v) => v ?? '-' },
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
                <InputNumber min={0} step={0.01} value={v} onChange={(val) => updateOrderItemPrice(record.productId, val)} className="w-28" prefix="€" />
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

    return (
        <MainLayout>
            <div className="w-full max-w-6xl mx-auto space-y-4 pb-6">
                <div className="flex items-center gap-3">
                    <Link to="/sales-orders" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-sm font-medium">
                        <ArrowLeftOutlined /> Back
                    </Link>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Create New Sales Order</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Add a new customer sales order</p>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ orderDate: dayjs(), priority: 'MEDIUM', salesChannel: 'DIRECT' }}>
                    <Card title="Order Information" className="rounded-xl border border-gray-100 shadow-sm mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                            <Form.Item label="Customer">
                                <div className="flex gap-2">
                                    <Form.Item name="customerId" noStyle rules={[{ required: true, message: 'Select customer' }]}>
                                        <Select placeholder="Select customer" allowClear className="w-full" showSearch optionFilterProp="children">
                                            {customers.map((c) => (
                                                <Option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Button icon={<PlusOutlined />} onClick={() => setCustomerModalOpen(true)} />
                                </div>
                            </Form.Item>
                            <Form.Item label="Order Number">
                                <Input value="Auto-generated" disabled className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Order Date" name="orderDate" rules={[{ required: true, message: 'Required' }]}>
                                <DatePicker className="w-full" format="YYYY-MM-DD" />
                            </Form.Item>
                            <Form.Item label="Required Date" name="requiredDate">
                                <DatePicker className="w-full" format="YYYY-MM-DD" />
                            </Form.Item>
                            <Form.Item label="Priority" name="priority" rules={[{ required: true }]}>
                                <Select options={PRIORITY_OPTIONS} className="w-full" />
                            </Form.Item>
                            <Form.Item label="Sales Channel" name="salesChannel" rules={[{ required: true }]}>
                                <Select options={CHANNEL_OPTIONS} className="w-full" />
                            </Form.Item>
                            <Form.Item label="Order Type" name="orderType">
                                <Select allowClear placeholder="Select" options={ORDER_TYPE_OPTIONS} className="w-full" />
                            </Form.Item>
                            <Form.Item label="Reference Number" name="referenceNumber">
                                <Input placeholder="Customer PO or reference" className="rounded-lg" />
                            </Form.Item>
                        </div>
                        <Form.Item label="Notes" name="notes">
                            <TextArea rows={2} placeholder="Add any notes or special instructions..." className="rounded-lg" />
                        </Form.Item>
                    </Card>

                    <Card title="Order Items" className="rounded-xl border border-gray-100 shadow-sm mb-4">
                        <div className="mb-3">
                            <Select
                                showSearch
                                placeholder="Search product to add..."
                                className="w-full max-w-md"
                                onChange={addOrderItem}
                                value={null}
                                optionFilterProp="label"
                                options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                                popupRender={(menu) => (
                                    <>
                                        <div className="p-2 border-b border-gray-100 flex items-center gap-2 text-sm">
                                            <PlusOutlined /> Add Item
                                        </div>
                                        {menu}
                                    </>
                                )}
                            />
                        </div>
                        {orderItems.length === 0 ? (
                            <p className="text-gray-500 py-4 text-center text-sm">No items added yet. Select a product above to begin.</p>
                        ) : (
                            <>
                                <Table columns={itemColumns} dataSource={orderItems} rowKey="productId" pagination={false} size="small" className="mb-3" />
                                <div className="text-right font-semibold border-t pt-3">
                                    Total: {formatCurrency(totalAmount)}
                                </div>
                            </>
                        )}
                    </Card>

                    <div className="flex gap-3">
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} className="rounded-xl px-6">
                            Create Order
                        </Button>
                        <Button className="rounded-xl" onClick={() => navigate('/sales-orders')}>
                            Cancel
                        </Button>
                    </div>
                </Form>

                <CustomerModal
                    open={customerModalOpen}
                    onCancel={() => setCustomerModalOpen(false)}
                    onSuccess={handleCustomerAdded}
                />
            </div>
        </MainLayout>
    );
}
