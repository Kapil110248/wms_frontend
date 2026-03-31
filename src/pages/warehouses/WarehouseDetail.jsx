import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Table, Button, Tag, Tabs, Card, Space, Typography, 
    Descriptions, message, Spin, Empty, Modal, List, Avatar, Divider,
    Form, InputNumber, Select
} from 'antd';
import { 
    HomeOutlined, InboxOutlined, ThunderboltOutlined, EnvironmentOutlined, 
    ArrowLeftOutlined, ReloadOutlined, DatabaseOutlined, CheckCircleOutlined,
    PlayCircleOutlined, AuditOutlined, InfoCircleOutlined, WarningOutlined,
    PlusOutlined, ShoppingCartOutlined
} from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatNumber } from '../../utils';

const { Title, Text } = Typography;

export default function WarehouseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [warehouse, setWarehouse] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [productionOrders, setProductionOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [formulas, setFormulas] = useState([]);
    const [activeTab, setActiveTab] = useState('info');

    // Production Lifecycle States
    const [isStockModalVisible, setIsStockModalVisible] = useState(false);
    const [stockCheckResult, setStockCheckResult] = useState(null);
    const [validatingOrderId, setValidatingOrderId] = useState(null);
    const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
    const [completingOrder, setCompletingOrder] = useState(null);

    const fetchData = useCallback(async () => {
        if (!token || !id) return;
        setLoading(true);
        try {
            const [whRes, invRes, prodRes, allProductsRes, formulaRes] = await Promise.all([
                apiRequest(`/api/warehouses/${id}`, { method: 'GET' }, token),
                apiRequest('/api/inventory/stock', { method: 'GET' }, token),
                apiRequest('/api/production', { method: 'GET' }, token),
                apiRequest('/api/inventory/products', { method: 'GET' }, token),
                apiRequest('/api/production/formulas', { method: 'GET' }, token)
            ]);

            setWarehouse(whRes.data);
            setProducts(allProductsRes.data || []);
            setFormulas(formulaRes.data || []);

            // Filter Inventory
            const whInventory = (Array.isArray(invRes.data) ? invRes.data : [])
                .filter(item => (item.warehouseId || item.Warehouse?.id) == id);
            setInventory(whInventory);

            // Filter Production Orders
            const whProduction = (Array.isArray(prodRes.data) ? prodRes.data : [])
                .filter(order => {
                    const whId = order.warehouseId || order.warehouse_id;
                    const targetWhId = order.targetWarehouseId || order.target_warehouse_id;
                    return whId == id || targetWhId == id;
                })
                .sort((a, b) => b.id - a.id);
            setProductionOrders(whProduction);

        } catch (err) {
            message.error(err.message || 'Failed to load details');
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleValidateStock = async (orderId) => {
        setActionLoading(true);
        try {
            const res = await apiRequest(`/api/production/${orderId}/validate-stock`, { method: 'POST' }, token);
            setStockCheckResult(res.data);
            setValidatingOrderId(orderId);
            setIsStockModalVisible(true);
            fetchData();
        } catch (err) {
            message.error('Stock validation failed: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartProduction = async (orderId) => {
        setActionLoading(true);
        try {
            await apiRequest(`/api/production/${orderId}/start`, { method: 'POST' }, token);
            message.success('Production started! Raw materials deducted.');
            setIsStockModalVisible(false);
            fetchData();
        } catch (err) {
            message.error('Start failed: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async (orderId) => {
        setActionLoading(true);
        try {
            await apiRequest(`/api/production/${orderId}/complete`, { method: 'POST' }, token);
            message.success('Production completed! Finished goods added to stock.');
            setIsCompleteModalVisible(false);
            fetchData();
        } catch (err) {
            message.error('Completion failed: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateReorder = async (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const qty = product.reorderQty || 50;
        
        Modal.confirm({
            title: 'Confirm Reorder',
            content: `Create a production order for ${qty} units of ${product.name}?`,
            onOk: async () => {
                try {
                    await apiRequest('/api/production', {
                        method: 'POST',
                        body: JSON.stringify({
                            productId,
                            quantityGoal: qty,
                            warehouseId: id,
                            targetWarehouseId: id,
                            productionAreaId: 1 // General
                        })
                    }, token);
                    message.success('Reorder created successfully.');
                    fetchData();
                    setActiveTab('production');
                } catch (err) {
                    message.error('Failed to create reorder: ' + err.message);
                }
            }
        });
    };

    const inventoryColumns = [
        { 
            title: 'Product', 
            key: 'product', 
            render: (_, r) => {
                const name = r.Product?.name || r.product?.name || '—';
                const isLow = r.Product?.reorderLevel > 0 && r.quantity < r.Product.reorderLevel;
                return (
                    <Space size="small">
                        <Text strong>{name}</Text>
                        {isLow && <Tag color="error" className="animate-pulse">LOW STOCK</Tag>}
                    </Space>
                );
            }
        },
        { title: 'SKU', dataIndex: ['Product', 'sku'], key: 'sku', render: (v, r) => <Tag color="blue">{v || r.product?.sku || '—'}</Tag> },
        { 
            title: 'In Stock', 
            dataIndex: 'quantity', 
            key: 'quantity', 
            align: 'right', 
            render: (v, r) => (
                <Space size={4}>
                    <Text strong>{formatNumber(v)}</Text>
                    <Text type="secondary" style={{ fontSize: '10px' }} className="uppercase font-bold">
                        {r.Product?.unitOfMeasure || r.product?.unitOfMeasure || 'pcs'}
                    </Text>
                </Space>
            )
        },
        { 
            title: 'Available', 
            key: 'available', 
            align: 'right',
            render: (_, r) => (
                <Space size={4}>
                    <Text strong className="text-blue-600">{formatNumber((r.quantity || 0) - (r.reserved || 0))}</Text>
                    <Text type="secondary" style={{ fontSize: '10px' }} className="uppercase font-bold">
                        {r.Product?.unitOfMeasure || r.product?.unitOfMeasure || 'pcs'}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'center',
            render: (_, r) => {
                const hasFormula = formulas.some(f => f.productId === r.productId);
                const isLow = r.Product?.reorderLevel > 0 && r.quantity < r.Product.reorderLevel;
                
                if (isLow && hasFormula) {
                    return (
                        <Button 
                            type="primary" 
                            size="small" 
                            icon={<ShoppingCartOutlined />} 
                            className="bg-amber-500 hover:bg-amber-600 border-none"
                            onClick={() => handleCreateReorder(r.productId)}
                        >
                            Quick Reorder
                        </Button>
                    );
                }
                return null;
            }
        }
    ];

    const productionColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, render: (v) => <Text strong>#P-{v}</Text> },
        { title: 'Product', dataIndex: ['Product', 'name'], key: 'product', render: (v) => <Text strong>{v}</Text> },
        { title: 'Goal', dataIndex: 'quantityGoal', key: 'goal', align: 'right', render: (v) => <Text strong>{formatNumber(v)} pcs</Text> },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (s) => {
                const map = {
                    'DRAFT':         { color: 'default',    label: '📝 Draft' },
                    'VALIDATED':     { color: 'blue',       label: '✅ Validated' },
                    'IN_PRODUCTION': { color: 'processing', label: '⚙️ In Progress' },
                    'COMPLETED':     { color: 'success',    label: '🏁 Completed' },
                };
                const s_obj = map[(s || 'DRAFT').toUpperCase()] || { color: 'default', label: s };
                return <Tag color={s_obj.color} className="font-bold">{s_obj.label}</Tag>;
            }
        },
        { 
            title: 'Actions', 
            key: 'actions',
            render: (_, record) => {
                const status = (record.status || 'DRAFT').toUpperCase();
                return (
                    <Space>
                        {status === 'DRAFT' && (
                            <Button size="small" icon={<AuditOutlined />} onClick={() => handleValidateStock(record.id)}>Validate</Button>
                        )}
                        {status === 'VALIDATED' && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartProduction(record.id)}>Start</Button>
                        )}
                        {status === 'IN_PRODUCTION' && (
                            <Button 
                                size="small" 
                                type="primary" 
                                className="bg-green-600 border-green-600" 
                                icon={<CheckCircleOutlined />}
                                onClick={() => {
                                    setCompletingOrder(record);
                                    setIsCompleteModalVisible(true);
                                }}
                            >
                                Complete
                            </Button>
                        )}
                    </Space>
                );
            }
        }
    ];

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" tip="Loading warehouse data..." />
                </div>
            </MainLayout>
        );
    }

    if (!warehouse) {
        return (
            <MainLayout>
                <Empty description="Warehouse not found" />
            </MainLayout>
        );
    }

    const tabItems = [
        {
            key: 'info',
            label: (<span><DatabaseOutlined /> General Info</span>),
            children: (
                <Card className="rounded-xl border-gray-100 shadow-sm">
                    <Descriptions title="Facility Details" bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                        <Descriptions.Item label="Code">{warehouse.code}</Descriptions.Item>
                        <Descriptions.Item label="Name">{warehouse.name}</Descriptions.Item>
                        <Descriptions.Item label="Type"><Tag color="blue">{warehouse.warehouseType || 'STANDARD'}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={warehouse.status === 'ACTIVE' ? 'green' : 'red'}>{warehouse.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Capacity">{warehouse.capacity ? `${warehouse.capacity} units` : 'Unlimited'}</Descriptions.Item>
                        <Descriptions.Item label="Production Area">{warehouse.isProduction ? <Tag color="gold">YES</Tag> : 'No'}</Descriptions.Item>
                        <Descriptions.Item label="Phone" span={2}>{warehouse.phone || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Address" span={2}>{warehouse.address || '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>
            )
        },
        {
            key: 'inventory',
            label: (<span><InboxOutlined /> Inventory & Stock</span>),
            children: (
                <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
                    <Table 
                        dataSource={inventory} 
                        columns={inventoryColumns} 
                        rowKey="id" 
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            )
        },
        {
            key: 'production',
            label: (
                <span>
                    <ThunderboltOutlined /> Production 
                    {productionOrders.length > 0 && <Tag color="gold" className="ml-2 border-none rounded-full px-2" style={{ fontSize: '10px' }}>{productionOrders.length}</Tag>}
                </span>
            ),
            children: (
                <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
                    <div className="mb-4 flex justify-between items-center">
                        <div>
                            <Title level={5}>Production Monitoring</Title>
                            <Text type="secondary">Manage manufacturing orders for this facility.</Text>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/production')}>New Order</Button>
                    </div>
                    <Table 
                        dataSource={productionOrders} 
                        columns={productionColumns} 
                        rowKey="id" 
                        pagination={{ pageSize: 10 }}
                        loading={actionLoading}
                    />
                </Card>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center gap-4">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/warehouses')} />
                    <div>
                        <div className="flex items-center gap-2">
                            <Title level={3} className="m-0 text-blue-600">{warehouse.name}</Title>
                            <Tag color="cyan">{warehouse.code}</Tag>
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1">
                            <EnvironmentOutlined /> {warehouse.address || 'No address provided'}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh Data</Button>
                    </div>
                </div>

                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab} 
                    className="custom-tabs"
                    items={tabItems}
                />

                {/* Production Lifecycle Modals */}
                <Modal
                    title="Stock Availability Check"
                    open={isStockModalVisible}
                    onCancel={() => setIsStockModalVisible(false)}
                    footer={[
                        <Button key="close" onClick={() => setIsStockModalVisible(false)}>Close</Button>,
                        stockCheckResult?.allAvailable && (
                            <Button 
                                key="start" 
                                type="primary" 
                                icon={<PlayCircleOutlined />}
                                loading={actionLoading}
                                onClick={() => handleStartProduction(validatingOrderId)}
                            >
                                Deduct Stock & Start Production
                            </Button>
                        )
                    ]}
                >
                    {stockCheckResult && (
                        <List
                            dataSource={stockCheckResult.stockChecks}
                            renderItem={item => (
                                <List.Item className="py-2">
                                    <List.Item.Meta
                                        avatar={<Avatar size="small" icon={<DatabaseOutlined />} className={item.isAvailable ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"} />}
                                        title={products.find(p => p.id === item.productId)?.name}
                                        description={`Required: ${formatNumber(item.required)} | Available: ${formatNumber(item.available)}`}
                                    />
                                    {item.isAvailable ? <Tag color="success">OK</Tag> : <Tag color="error">MISSING</Tag>}
                                </List.Item>
                            )}
                        />
                    )}
                </Modal>

                <Modal
                    title={<Space><CheckCircleOutlined className="text-green-500"/> Complete Production</Space>}
                    open={isCompleteModalVisible}
                    onCancel={() => setIsCompleteModalVisible(false)}
                    footer={[
                        <Button key="no" onClick={() => setIsCompleteModalVisible(false)}>Cancel</Button>,
                        <Button key="yes" type="primary" loading={actionLoading} onClick={() => handleComplete(completingOrder?.id)}>Confirm & Add Stock</Button>
                    ]}
                >
                    {completingOrder && (
                        <div className="text-center py-4">
                            <Title level={4} className="!mb-1">{formatNumber(completingOrder.quantityGoal)} Units</Title>
                            <Text type="secondary">{completingOrder.Product?.name}</Text>
                            <Divider />
                            <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                                <InfoCircleOutlined className="mr-2" />
                                This will add the finished goods to **{warehouse.name}** stock.
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
