import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, InputNumber, Button, Space, Divider, Statistic, Row, Col, Tag, message, Typography } from 'antd';
import { CalculatorOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { formatNumber } from '../../utils';

const { Title, Text } = Typography;
const { Option } = Select;

// OnBuy, TEMU, TikTok removed per client – Alternative SKUs / channels list
const CHANNELS = [
    { value: 'Amazon_FBA', label: 'Amazon FBA', feePercent: 15, fulfillment: 3.50 },
    { value: 'Amazon_UK_FBA', label: 'Amazon UK FBA', feePercent: 15.3, fulfillment: 3.25 },
    { value: 'Amazon_UK_MFN', label: 'Amazon UK MFN', feePercent: 13.5, fulfillment: 0 },
    { value: 'Shopify', label: 'Shopify', feePercent: 2.9, fulfillment: 0 },
    { value: 'eBay', label: 'eBay', feePercent: 12.8, fulfillment: 0 },
    { value: 'Direct', label: 'Direct / Website', feePercent: 0, fulfillment: 0 },
];

export default function PricingCalculator() {
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            const list = Array.isArray(res?.data) ? res.data : [];
            const productList = list.map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || p.id,
                costPrice: Number(p.costPrice) || 0,
                price: Number(p.price) || 0,
                sellingPrice: Number(p.price) || 0,
            }));
            setProducts(productList);
            if (productList.length > 0) {
                const first = productList[0];
                setSelectedProduct(first);
                form.setFieldsValue({
                    productId: first.id,
                    productCost: first.costPrice || 0,
                    packagingCost: 0.25,
                    shippingCost: 3.50,
                    laborCost: 0.50,
                    desiredMargin: 0.20,
                });
            }
        } catch (_) {
            setProducts([]);
        }
    }, [token, form]);

    useEffect(() => {
        if (token) fetchProducts();
    }, [token, fetchProducts]);

    const handleProductChange = (productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setSelectedProduct(product);
            form.setFieldsValue({
                productCost: product.costPrice || 0,
                sellingPrice: product.sellingPrice || 0,
            });
        }
    };

    const handleCalculate = async (values) => {
        if (!token) return;
        setLoading(true);
        try {
            const payload = {
                productId: values.productId,
                productCost: Number(values.productCost) || 0,
                packagingCost: Number(values.packagingCost) || 0,
                shippingCost: Number(values.shippingCost) || 0,
                laborCost: Number(values.laborCost) || 0,
                desiredMargin: Number(values.desiredMargin) ?? 0.20,
            };
            const res = await apiRequest('/api/analytics/pricing-calculate', {
                method: 'POST',
                body: JSON.stringify(payload),
            }, token);
            const data = res?.data;
            if (data) {
                setResult(data);
                message.success('Price calculated successfully!');
                return;
            }
            throw new Error('Invalid response');
        } catch (err) {
            // Fallback: calculate locally if API fails
            const productCost = Number(values.productCost) || 0;
            const packagingCost = Number(values.packagingCost) || 0;
            const shippingCost = Number(values.shippingCost) || 0;
            const laborCost = Number(values.laborCost) || 0;
            const desiredMargin = Number(values.desiredMargin) ?? 0.20;
            const channelConfig = CHANNELS[1];
            const feePercent = channelConfig.feePercent / 100;
            const fulfillmentFee = channelConfig.fulfillment;
            const baseCost = productCost + packagingCost + shippingCost + laborCost + fulfillmentFee;
            const recommendedSellingPrice = baseCost / (1 - desiredMargin - feePercent);
            const channelFee = recommendedSellingPrice * feePercent;
            const totalCost = baseCost + channelFee;
            const profit = recommendedSellingPrice - totalCost;
            const actualMargin = recommendedSellingPrice > 0 ? profit / recommendedSellingPrice : 0;
            setResult({
                productCost,
                consumablesCost: packagingCost,
                shippingCost,
                laborCost,
                fulfillmentFee,
                fees: channelFee + fulfillmentFee,
                totalCost,
                recommendedSellingPrice,
                profit,
                margin: actualMargin,
                breakdown: { channelFeePercent: channelConfig.feePercent, fulfillmentFee: channelConfig.fulfillment },
            });
            message.success('Price calculated (offline).');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-blue-600">Marketplace Price Calculator</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Calculate optimal selling prices with full cost breakdown</p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchProducts} className="rounded-lg">Refresh</Button>
                </div>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-semibold text-gray-800">Cost Configuration</span>} extra={<Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchProducts} />} className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleCalculate}
                                initialValues={{
                                    desiredMargin: 0.20,
                                    shippingCost: 3.50,
                                    laborCost: 0.50,
                                    packagingCost: 0.25,
                                }}
                            >
                                <Form.Item
                                    name="productId"
                                    label={<span className="font-bold text-gray-700">* Product</span>}
                                    rules={[{ required: true, message: 'Please select a product' }]}
                                >
                                    <Select
                                        className="h-12 rounded-xl"
                                        placeholder="Select product"
                                        showSearch
                                        optionFilterProp="children"
                                        onChange={handleProductChange}
                                    >
                                        {products.map(p => (
                                            <Option key={p.id} value={p.id}>
                                                {p.sku} - {p.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>

                                <Divider><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Editable Costs</span></Divider>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="productCost" label={<span className="text-xs font-bold text-gray-500">UNIT COST (£)</span>} rules={[{ required: true, message: 'Required' }]}>
                                            <InputNumber min={0} step={0.0001} className="w-full h-11 rounded-xl" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="packagingCost" label={<span className="text-xs font-bold text-gray-500">PACKAGING (£)</span>}>
                                            <InputNumber min={0} step={0.0001} className="w-full h-11 rounded-xl" />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="shippingCost" label={<span className="text-xs font-bold text-gray-500">SHIPMENT (£)</span>}>
                                            <InputNumber min={0} step={0.0001} className="w-full h-11 rounded-xl" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="laborCost" label={<span className="text-xs font-bold text-gray-500">PICK/LABOR (£)</span>}>
                                            <InputNumber min={0} step={0.0001} className="w-full h-11 rounded-xl" />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    name="desiredMargin"
                                    label={<span className="font-bold text-gray-700">Target Profit Margin</span>}
                                >
                                    <Select className="h-12 rounded-xl">
                                        <Option value={0.10}>10% - Low Margin</Option>
                                        <Option value={0.15}>15% - Budget</Option>
                                        <Option value={0.20}>20% - Standard</Option>
                                        <Option value={0.30}>30% - Premium</Option>
                                        <Option value={0.40}>40% - Luxury</Option>
                                    </Select>
                                </Form.Item>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    block
                                    size="large"
                                    className="h-14 rounded-2xl bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 font-bold uppercase mt-4"
                                    icon={<CalculatorOutlined />}
                                >
                                    Calculate Optimal Price
                                </Button>
                            </Form>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        {result ? (
                            <Card className="rounded-[2rem] shadow-sm border-gray-100 bg-slate-50 overflow-hidden p-4">
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Cost Distribution</h3>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Statistic title="Product Cost" value={result.productCost} formatter={v => `£${formatNumber(v)}`} valueStyle={{ fontWeight: 900 }} />
                                            </Col>
                                            <Col span={12}>
                                                <Statistic title="Logistics & Pack" value={result.consumablesCost + result.shippingCost + result.laborCost} formatter={v => `£${formatNumber(v)}`} valueStyle={{ fontWeight: 900 }} />
                                            </Col>
                                        </Row>
                                        <Divider className="my-4" />
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Statistic title="Total Operating Cost" value={result.totalCost} formatter={v => `£${formatNumber(v)}`} valueStyle={{ color: '#ef4444', fontWeight: 900 }} />
                                            </Col>
                                            <Col span={12}>
                                                <Statistic title="Channel Ecosystem Fees" value={result.fees} formatter={v => `£${formatNumber(v)}`} valueStyle={{ color: '#f59e0b', fontWeight: 900 }} />
                                            </Col>
                                        </Row>
                                    </div>

                                    <Card className="rounded-3xl bg-blue-600 border-none shadow-2xl shadow-blue-200 p-2">
                                        <Statistic
                                            title={<span className="text-blue-100 font-bold text-xs uppercase tracking-widest">Recommended Selling Price</span>}
                                            value={result.recommendedSellingPrice}
                                            formatter={v => `£${formatNumber(v)}`}
                                            valueStyle={{ color: 'white', fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.05em' }}
                                        />
                                    </Card>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                                            <Statistic
                                                title={<span className="text-[10px] font-bold text-gray-400 uppercase">Unit Net Profit</span>}
                                                value={result.profit}
                                                formatter={v => `£${formatNumber(v)}`}
                                                valueStyle={{ color: '#10b981', fontWeight: 900 }}
                                            />
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm">
                                            <Statistic
                                                title={<span className="text-[10px] font-bold text-gray-400 uppercase">Profit Margin</span>}
                                                value={result.margin * 100}
                                                formatter={v => `${formatNumber(v)}%`}
                                                valueStyle={{ color: '#10b981', fontWeight: 900 }}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Margin Analysis</div>
                                            <div className="mt-2">
                                                {result.margin < 0.1 && <Tag color="red" className="rounded-full px-4 font-bold border-none uppercase">High Risk / Low Margin</Tag>}
                                                {result.margin >= 0.1 && result.margin < 0.2 && <Tag color="orange" className="rounded-full px-4 font-bold border-none uppercase">Moderate Efficiency</Tag>}
                                                {result.margin >= 0.2 && <Tag color="green" className="rounded-full px-4 font-bold border-none uppercase">Optimal Performance</Tag>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400 font-bold uppercase">Estimated ROI</div>
                                            <div className="text-2xl font-black text-slate-800 tracking-tighter">{formatNumber((result.profit / result.totalCost) * 100)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="rounded-[2rem] border-dashed border-2 border-gray-200 flex items-center justify-center p-20 min-h-[500px]">
                                <div className="text-center">
                                    <CalculatorOutlined style={{ fontSize: 64, color: '#d1d5db' }} />
                                    <p className="mt-4 text-gray-500 text-sm">Fill in the form and click Calculate to see pricing results.</p>
                                </div>
                            </Card>
                        )}
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
}
