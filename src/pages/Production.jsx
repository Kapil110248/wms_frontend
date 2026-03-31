import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Space, Typography, 
  Modal, Form, Select, Input, InputNumber, message, 
  Progress, Divider, List, Avatar, Tag, Tooltip, Tabs, Empty,
  Popconfirm
} from 'antd';
import { 
  Factory, Play, CircleCheckBig, 
  Plus, History, Clock, TriangleAlert, Package, 
  ClipboardCheck, Boxes, AlertCircle, Trash2,
  Filter, Info, ChevronDown, CheckCircle2, Printer, Calculator
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { formatNumber } from '../utils';

const { Title, Text } = Typography;

export default function Production() {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [stockCheckResult, setStockCheckResult] = useState(null);
  const [validatingOrderId, setValidatingOrderId] = useState(null);
  const [activeArea, setActiveArea] = useState('ALL');
  const [formulas, setFormulas] = useState([]);
  const [previewItems, setPreviewItems] = useState(null);
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(null);
  const [form] = Form.useForm();
  const productId = Form.useWatch('productId', form);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/production', { method: 'GET' }, token);
      setOrders(res.data || []);
    } catch (err) {
      message.error('Failed to load production orders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchDeps = useCallback(async () => {
    try {
      const [prodRes, whRes, formulaRes] = await Promise.all([
        apiRequest('/api/inventory/products', { method: 'GET' }, token),
        apiRequest('/api/warehouses', { method: 'GET' }, token),
        apiRequest('/api/production/formulas', { method: 'GET' }, token),
      ]);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
      setFormulas(formulaRes.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    fetchDeps();
  }, [fetchOrders, fetchDeps]);


  const handleCreateOrder = async (values) => {
    try {
      await apiRequest('/api/production', {
        method: 'POST',
        body: JSON.stringify(values)
      }, token);
      message.success('Production order created in DRAFT.');
      setIsModalVisible(false);
      setPreviewItems(null);
      form.resetFields();
      fetchOrders();
    } catch (err) {
      message.error(err.message || 'Creation failed');
    }
  };

  const handleValuesChange = (changedValues, allValues) => {
    const { productId, quantityGoal } = allValues;

    // Task 8: Auto-select warehouse from product
    if (changedValues.productId) {
      const prod = products.find(p => p.id === changedValues.productId);
      if (prod?.warehouseId) {
        form.setFieldValue('warehouseId', prod.warehouseId);
      }
      if (prod?.defaultProductionAreaId) {
        form.setFieldValue('productionAreaId', prod.defaultProductionAreaId);
      }

      // NEW: Also check formula for defaults
      const formula = formulas.find(f => f.productId === changedValues.productId && f.isDefault)
                   || formulas.find(f => f.productId === changedValues.productId);
      if (formula) {
        if (formula.productionAreaId) form.setFieldValue('productionAreaId', formula.productionAreaId);
        if (formula.warehouseId) form.setFieldValue('warehouseId', formula.warehouseId);
      }
    }

    if (productId && quantityGoal > 0) {
      const formula = formulas.find(f => f.productId === productId && f.isDefault)
                   || formulas.find(f => f.productId === productId);
      if (formula && formula.ProductionFormulaItems) {
        const calculated = formula.ProductionFormulaItems.map(item => ({
          name: item.RawMaterial?.name || 'Component',
          perUnit: parseFloat(item.quantityPerUnit),
          qty: formatNumber(parseFloat(item.quantityPerUnit) * parseFloat(quantityGoal)),
          unit: item.unit || 'g',
          rawMaterial: item.RawMaterial
        }));
        setPreviewItems({ items: calculated, formulaName: formula.name });
      } else {
        setPreviewItems(null);
      }
    } else {
      setPreviewItems(null);
    }
  };

  const handleValidateStock = async (id) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/production/${id}/validate-stock`, { method: 'POST' }, token);
      setStockCheckResult(res.data);
      setValidatingOrderId(id);
      setIsStockModalVisible(true);
      fetchOrders();
    } catch (err) {
      message.error('Stock validation failed');
    } finally {
      setLoading(false);
    }
  };
 
  const handleAcceptValidation = async (id) => {
    setLoading(true);
    try {
      await apiRequest(`/api/production/${id}/accept-validation`, { method: 'POST' }, token);
      message.success('✅ Stock validation accepted.');
      fetchOrders();
    } catch (err) {
      message.error(err.message || 'Acceptance failed');
    } finally {
      setLoading(false);
    }
  };
 
  const handleStartProduction = async (id) => {
    setLoading(true);
    try {
      await apiRequest(`/api/production/${id}/start`, { method: 'POST' }, token);
      message.success('▶ Production in progress (Stock Deducted)');
      setIsStockModalVisible(false);
      setStockCheckResult(null);
      await fetchOrders();
      await fetchDeps();
    } catch (err) {
      console.error('Start failed:', err);
      message.error(err.message || 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id) => {
    try {
        await apiRequest(`/api/production/${id}/complete`, { method: 'POST' }, token);
        message.success('✨ Production completed! Stock added to Finished Goods.');
        setIsCompleteModalVisible(false);
        setCompletingOrder(null);
        await fetchOrders();
        await fetchDeps();
    } catch (err) {
        message.error(err.message || 'Completion failed');
    }
  };

  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    const whName = warehouses.find(w => w.id === order.warehouseId)?.name || 'N/A';
    const areaNames = { 1: 'Painting', 2: 'Candle', 3: 'Lab' };
    const areaName = areaNames[order.productionAreaId] || 'General';
    
    const itemsHtml = order.ProductionOrderItems?.map(item => {
      const itemWhName = warehouses.find(w => w.id === item.warehouseId)?.name || 'N/A';
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.Product?.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.Product?.sku}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatNumber(item.quantityRequired)} ${item.unit || 'g'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${itemWhName}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="4">No items</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Production Order Recap - #P-${order.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f4f4f4; text-align: left; padding: 8px; border: 1px solid #ddd; font-size: 12px; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Production Order Recap</div>
              <div style="color: #666;">Order ID: #P-${order.id}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold;">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
              <div>Time: ${new Date(order.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Finished Product</div>
              <div class="value">${order.Product?.name} (${order.Product?.sku})</div>
            </div>
            <div class="info-item">
              <div class="label">Production Quantity</div>
              <div class="value">${formatNumber(order.quantityGoal)} EACH</div>
            </div>
            <div class="info-item">
              <div class="label">Production Area</div>
              <div class="value">${areaName}</div>
            </div>
            <div class="info-item">
              <div class="label">Warehouse</div>
              <div class="value">${whName}</div>
            </div>
          </div>

          <div class="label" style="margin-top: 20px;">Raw Materials Used (Bill of Materials)</div>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Quantity Required</th>
                <th>Source Warehouse</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="footer">
            Printed on ${new Date().toLocaleString()} | WMS Production Dashboard
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
              // Fallback for browsers that don't support onafterprint
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/production/${id}`, { method: 'DELETE' }, token);
      message.success('Order deleted successfully');
      fetchOrders();
    } catch (err) {
      message.error(err.message || 'Failed to delete order');
    }
  };

  const statusColors = {
    'DRAFT': 'default',
    'STOCK_READY': 'cyan',
    'ACCEPTED': 'blue',
    'IN_PRODUCTION': 'processing',
    'COMPLETED': 'success',
    'CANCELLED': 'error'
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderNumber',
      key: 'id',
      width: 110,
      render: (num, r) => <Text strong>{num || `#P-${r.id}`}</Text>
    },
    {
      title: 'Finished Product',
      dataIndex: 'Product',
      key: 'product',
      render: (p) => (
        <Space>
          <Avatar icon={<Package size={16} />} className="bg-blue-100 text-blue-600" />
          <div>
            <div className="font-bold">{p?.name}</div>
            <div className="text-xs text-slate-400">{p?.sku}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Area',
      dataIndex: 'productionAreaId',
      key: 'area',
      width: 110,
      render: (id) => {
        const areas = { 1: '🎨 Painting', 2: '🕯 Candle', 3: '🧪 Lab' };
        return <Tag bordered={false} className="bg-slate-100">{areas[id] || 'General'}</Tag>;
      }
    },
    {
      title: 'Goal',
      dataIndex: 'quantityGoal',
      key: 'goal',
      width: 80,
      render: (q) => <Text strong>{formatNumber(q)} EACH</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        // console.log('DEBUG: Order Status:', status);
        const map = {
          'DRAFT':         { color: 'default',    label: '📝 Draft' },
          'STOCK_READY':   { color: 'cyan',       label: '📋 Stock Ready' },
          'ACCEPTED':      { color: 'blue',       label: '✅ Accepted' },
          'IN_PRODUCTION': { color: 'processing', label: '⚙️ In Progress' },
          'COMPLETED':     { color: 'success',    label: '🏁 Completed' },
          'CANCELLED':     { color: 'error',      label: '❌ Cancelled' },
        };
        const upperStatus = (status || 'DRAFT').toUpperCase();
        const s = map[upperStatus] || { color: 'default', label: status || 'DRAFT' };
        return (
          <Tag color={s.color} bordered={false} className="rounded-lg font-bold text-xs px-3 py-1">
            {s.label}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const currentStatus = (record.status || 'DRAFT').toUpperCase();
        return (
          <Space wrap>
            {/* VALIDATION ACTION */}
            {currentStatus === 'DRAFT' && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ClipboardCheck size={14} />}
                onClick={() => handleValidateStock(record.id)}
              >
                Validate Stock
              </Button>
            )}
 
            {(['STOCK_READY', 'ACCEPTED', 'IN_PRODUCTION', 'COMPLETED'].includes(currentStatus)) && (
                <Tag bordered={false} className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg">
                    <ClipboardCheck size={12} className="inline mr-1" /> Stock Verified
                </Tag>
            )}

            {/* STOCK_READY → Accept Validation */}
            {currentStatus === 'STOCK_READY' && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<CheckCircle2 size={14} />}
                onClick={() => handleAcceptValidation(record.id)}
              >
                Accept Validation
              </Button>
            )}
 
            {/* ACCEPTED → Start Production */}
            {currentStatus === 'ACCEPTED' && (
              <Button
                size="small"
                type="primary"
                icon={<Play size={14} />}
                onClick={() => handleStartProduction(record.id)}
              >
                ▶ Start
              </Button>
            )}

            {/* IN_PRODUCTION → Complete */}
            {currentStatus === 'IN_PRODUCTION' && (
              <Button
                size="small"
                type="primary"
                className="bg-green-600 border-green-600 hover:bg-green-700"
                icon={<CircleCheckBig size={14} />}
                onClick={() => {
                  const order = orders.find(o => o.id === record.id);
                  setCompletingOrder(order);
                  setIsCompleteModalVisible(true);
                }}
              >
                Complete
              </Button>
            )}

            {/* COMPLETED */}
            {currentStatus === 'COMPLETED' && (
              <Tag bordered={false} color="success" className="rounded-lg font-bold">
                🏁 Done
              </Tag>
            )}

            {/* PRINT ACTION - For all orders except Cancelled */}
            {currentStatus !== 'CANCELLED' && (
              <Button 
                size="small" 
                icon={<Printer size={14} />} 
                onClick={() => handlePrint(record)}
                className="rounded-lg hover:text-blue-600 hover:border-blue-600"
              >
                Print Recap
              </Button>
            )}

            {/* CANCELLED */}
            {currentStatus === 'CANCELLED' && (
              <Tag bordered={false} color="error" className="rounded-lg font-bold">
                ❌ Cancelled
              </Tag>
            )}

            {/* DELETE ACTION - Only for non-completed orders */}
            {currentStatus !== 'COMPLETED' && (
              <Popconfirm
                title="Delete Order"
                description="Are you sure you want to delete this production order?"
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button 
                  size="small" 
                  type="text" 
                  danger 
                  icon={<Trash2 size={14} />} 
                  className="hover:bg-red-50"
                  tooltip="Delete Order"
                />
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <MainLayout>
      <div className="p-2 md:p-6 pb-20 md:pb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6 mb-6 md:mb-8 mt-2 md:mt-0">
          <div>
            <Title level={2} className="!mb-1 flex items-center gap-3 text-xl md:text-2xl">
              <Factory size={28} className="text-blue-600" />
              Production Dashboard
            </Title>
            <Text type="secondary" className="text-xs md:text-sm">Monitor and manage manufacturing status flows</Text>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
                icon={<Boxes size={18} />} 
                onClick={() => window.location.href = '/production/formulas'}
                className="h-10 md:h-11 rounded-lg w-full sm:w-auto"
            >
                Formulas
            </Button>
            <Button 
                type="primary" 
                size="large" 
                icon={<Plus size={18} />} 
                onClick={() => setIsModalVisible(true)}
                className="h-10 md:h-11 rounded-lg w-full lg:w-auto text-sm md:text-base order-first lg:order-last"
            >
                New Order
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <Card className="rounded-xl border-none shadow-sm" styles={{ body: { padding: '12px' } }}>
            <div className="text-slate-400 text-[10px] font-bold uppercase mb-1">In Draft</div>
            <div className="text-xl md:text-3xl font-black">{orders.filter(o => o.status === 'DRAFT').length}</div>
          </Card>
          <Card className="rounded-xl border-none shadow-sm" styles={{ body: { padding: '12px' } }}>
            <div className="text-cyan-500 text-[10px] font-black uppercase mb-1">Stock Ready</div>
            <div className="text-xl md:text-3xl font-black">{orders.filter(o => o.status === 'STOCK_READY').length}</div>
          </Card>
          <Card className="rounded-xl border-none shadow-sm" styles={{ body: { padding: '12px' } }}>
            <div className="text-blue-500 text-[10px] font-black uppercase mb-1">In Progress</div>
            <div className="text-xl md:text-3xl font-black">{orders.filter(o => o.status === 'IN_PRODUCTION').length}</div>
          </Card>
          <Card className="rounded-xl border-none shadow-sm" styles={{ body: { padding: '12px' } }}>
            <div className="text-green-500 text-[10px] font-black uppercase mb-1">Completed</div>
            <div className="text-xl md:text-3xl font-black">{orders.filter(o => o.status === 'COMPLETED').length}</div>
          </Card>
        </div>


        <div className="mb-6">
          <Tabs 
            activeKey={activeArea} 
            onChange={setActiveArea}
            items={[
              { key: 'ALL', label: 'All Orders' },
              { key: '1', label: '🎨 Painting' },
              { key: '2', label: '🕯 Candle' },
              { key: '3', label: '🧪 Lab' },
            ]}
            className="production-tabs"
          />
        </div>

        <Card className="rounded-xl shadow-sm overflow-hidden" bodyStyle={{ padding: 0 }}>
          <Table 
            columns={columns} 
            dataSource={activeArea === 'ALL' ? orders : orders.filter(o => String(o.productionAreaId) === activeArea)} 
            loading={loading}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            expandable={{
              expandedRowRender: (record) => (
                <div className="p-4 bg-slate-50 border-y border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Boxes size={16} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bill of Materials (Required for {record.quantityGoal} units)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {record.ProductionOrderItems?.map(item => (
                      <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm min-w-0">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-bold text-slate-700 m-0 break-words leading-tight">{item.Product?.name}</p>
                          <p className="text-[10px] text-slate-400 m-0 truncate">{item.Product?.sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-blue-600">{item.quantityRequired}</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-bold">{item.unit || 'g'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }}
          />
        </Card>

        {/* Modal: New Production */}
        <Modal
          title={<div className="flex items-center gap-2"><Factory size={20} className="text-blue-600"/> New Production Order</div>}
          open={isModalVisible}
          onCancel={() => { setIsModalVisible(false); setPreviewItems([]); }}
          footer={null}
          destroyOnHidden
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleCreateOrder} onValuesChange={handleValuesChange}>
            <Form.Item
              name="productId"
              label={<span className="font-bold">Finished Product to Manufacture</span>}
              rules={[{ required: true }]}
            >
              <Select
                placeholder="e.g. PLS Beige, 444 Candle"
                showSearch
                optionFilterProp="label"
                className="rounded-lg"
              >
                {products
                  .filter(p => formulas.some(f => f.productId === p.id))
                  .map(p => (
                    <Select.Option key={p.id} value={p.id} label={`${p.name} (${p.sku})`}>
                      {p.name} <span className="text-[10px] text-slate-400">({p.sku})</span>
                    </Select.Option>
                  ))
                }
              </Select>
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'none' }}>
              <Form.Item name="productionAreaId" label={<span className="font-bold">Production Area</span>}>
                <Select placeholder="Select Area">
                  <Select.Option value={1}>🎨 Painting Area</Select.Option>
                  <Select.Option value={2}>🕯 Candle Area</Select.Option>
                  <Select.Option value={3}>🧪 Lab Area</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="warehouseId" label={<span className="font-bold">Finished Goods Warehouse</span>}>
                <Select placeholder="Where will finished goods go?">
                  {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>)}
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              name="quantityGoal"
              label={<span className="font-bold">Quantity to Produce</span>}
              rules={[{ required: true }]}
              extra="Type the number → System auto-calculates raw materials below."
            >
              <InputNumber
                stringMode
                min={0}
                className="w-full"
                placeholder="0"
                size="large"
                formatter={value => value ? `${value}`.replace(/(\.\d+?)0+$/, '$1').replace(/\.$/, '') : value}
              />
            </Form.Item>

            {/* BOM PREVIEW — shown only when product + qty are filled */}
            {previewItems && previewItems.items?.length > 0 && (
              <div className="mb-5 rounded-2xl border border-emerald-200 overflow-hidden">
                <div className="bg-emerald-600 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Calculator size={16} />
                    <span className="font-black text-[10px] md:text-xs uppercase tracking-widest">
                      Formula: {previewItems.formulaName}
                    </span>
                  </div>
                  <Tag className="bg-white/20 border-none text-white text-[9px] font-black">
                    {previewItems.items.length} Materials
                  </Tag>
                </div>
                <div className="bg-emerald-50/50 p-2 md:p-0">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-1.5 border-b border-emerald-100">
                    <div className="col-span-5 text-[9px] font-black uppercase text-emerald-700">Raw Material</div>
                    <div className="col-span-3 text-[9px] font-black uppercase text-emerald-700 text-center">Per Unit</div>
                    <div className="col-span-1 text-[9px] font-black uppercase text-emerald-700 text-center">×</div>
                    <div className="col-span-3 text-[9px] font-black uppercase text-emerald-700 text-right">Total Required</div>
                  </div>
                  {previewItems.items.map((item, idx) => (
                    <div key={idx} className={`grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 md:py-2 items-center ${idx % 2 === 0 ? 'bg-white/60' : ''} rounded-xl md:rounded-none mb-2 md:mb-0 border border-emerald-100 md:border-none`}>
                      <div className="col-span-1 md:col-span-5 flex flex-col md:block">
                        <span className="md:hidden text-[9px] font-black uppercase text-emerald-700 mb-1">Material</span>
                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      </div>
                      <div className="col-span-1 md:col-span-3 flex justify-between md:justify-center items-center">
                        <span className="md:hidden text-[9px] font-black uppercase text-emerald-700">Per Unit</span>
                        <span className="text-slate-500 text-xs font-medium">{item.perUnit} {item.unit}</span>
                      </div>
                      <div className="hidden md:block col-span-1 text-center text-slate-300 font-black">×</div>
                      <div className="col-span-1 md:col-span-3 flex justify-between md:justify-end items-center md:pt-0 border-t md:border-none pt-2 mt-1 md:mt-0">
                        <span className="md:hidden text-[9px] font-black uppercase text-emerald-700 italic">Total Necessary</span>
                        <div>
                          <span className="text-base font-black text-emerald-700">{item.qty}</span>
                          <span className="text-[10px] text-emerald-500 ml-1 font-bold">{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No formula found warning */}
            {previewItems === null && form.getFieldsValue(['productId']).productId && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                ⚠️ <b>No formula found</b> for this product. Please go to <b>Manage Formulas</b> and create one first.
              </div>
            )}

            <Form.Item name="notes" label="Production Notes (optional)">
              <Input.TextArea rows={2} placeholder="Any special instructions..." />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              className="h-12 rounded-xl text-base font-bold shadow-lg shadow-blue-500/20"
              disabled={!previewItems || previewItems.items?.length === 0}
            >
              Create Production Order
            </Button>
          </Form>
        </Modal>

        {/* Modal: Stock Check Result */}
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
                        icon={<Play size={14} />}
                        onClick={() => {
                            handleStartProduction(validatingOrderId);
                            setIsStockModalVisible(false);
                        }}
                    >
                        Deduct Stock & Start Production
                    </Button>
                )
            ]}
        >
            {stockCheckResult && (
                <div>
                    <div className="mb-4">
                        {stockCheckResult.allAvailable ? (
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                                <CircleCheckBig size={32} className="text-emerald-500 mx-auto mb-2" />
                                <Title level={5} className="!text-emerald-700 !m-0">All Ingredients Ready</Title>
                                <Text className="text-emerald-600 block text-xs">You can safely start this production run.</Text>
                            </div>
                        ) : (
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
                                <TriangleAlert size={32} className="text-rose-500 mx-auto mb-2" />
                                <Title level={5} className="!text-rose-700 !m-0">Insufficient Ingredients</Title>
                                <Text className="text-rose-600 block text-xs">Check missing materials below.</Text>
                            </div>
                        )}
                    </div>
                    <List
                        dataSource={stockCheckResult.stockChecks}
                        renderItem={item => {
                            const p = products.find(prod => prod.id === item.productId);
                            const formulaItem = formulas.flatMap(f => f.ProductionFormulaItems).find(fi => fi.productId === item.productId);
                                return (
                                    <List.Item className="py-3 px-2 border-slate-50">
                                        <List.Item.Meta
                                            avatar={<Avatar icon={<Package size={16}/>} className={item.isAvailable ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"} />}
                                            title={<span className="font-bold text-slate-700">{item.name || p?.name}</span>}
                                            description={
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-1 gap-1">
                                                    <Text type="secondary" className="text-[10px] md:text-xs">Required: <span className="text-slate-900 font-bold">{formatNumber(item.required)} {item.unit}</span></Text>
                                                    <Text type="secondary" className="text-[10px] md:text-xs">
                                                        In Stock: <span className={item.isAvailable ? "text-emerald-600" : "text-rose-600"}>{formatNumber(item.available)} {item.unit}</span>
                                                        {item.unit !== item.productUnit && (
                                                            <span className="text-[9px] text-slate-400 ml-1">({formatNumber(item.availableOriginal)} {item.productUnit})</span>
                                                        )}
                                                    </Text>
                                                </div>
                                            }
                                        />
                                        <div className="ml-4">
                                            {item.isAvailable ? <Tag color="success" bordered={false}>Available</Tag> : <Tag color="error" bordered={false}>Missing</Tag>}
                                        </div>
                                    </List.Item>
                                );
                        }}
                    />
                </div>
            )}
        </Modal>


        {/* Modal: Completion Summary */}
        <Modal
            title={<div className="flex items-center gap-2 text-green-600"><CheckCircle2 size={24}/> Production Completion</div>}
            open={isCompleteModalVisible}
            onCancel={() => setIsCompleteModalVisible(false)}
            footer={[
                <Button key="cancel" onClick={() => setIsCompleteModalVisible(false)}>Go Back</Button>,
                <Button key="submit" type="primary" className="bg-green-600 border-green-600" onClick={() => handleComplete(completingOrder.id)}>
                    Confirm Completion & Add Stock
                </Button>
            ]}
            width={500}
        >
            {completingOrder && (
                <div className="py-4">
                    <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 mb-6 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Finalizing Output</div>
                        <Title level={2} className="!m-0 !text-slate-900">{formatNumber(completingOrder.quantityGoal)} Units</Title>
                        <Text className="text-slate-500 font-bold">{completingOrder.Product?.name}</Text>
                        <Divider className="my-4" />
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
                             <div className="w-full sm:w-auto">
                                <Text className="block text-[8px] uppercase font-black text-slate-400 mb-1">Target Warehouse</Text>
                                <Tag className="w-full sm:w-auto rounded-lg bg-blue-50 text-blue-600 border-blue-100 font-bold">{warehouses.find(w => w.id === completingOrder.warehouseId)?.name}</Tag>
                             </div>
                             <div className="w-full sm:w-auto">
                                <Text className="block text-[8px] uppercase font-black text-slate-400 mb-1">Status Shift</Text>
                                <Tag className="w-full sm:w-auto rounded-lg bg-green-50 text-green-600 border-green-100 font-bold">In Prod ➔ Completed</Tag>
                             </div>
                        </div>
                    </div>

                    <div className="px-2">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={16} className="text-blue-500" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Inventory Action</span>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                            <Plus size={20} className="text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-800">
                                This will automatically add **{formatNumber(completingOrder.quantityGoal)} units** to your finished goods stock.
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
      </div>
    </MainLayout>
  );
}
