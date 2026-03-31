import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, message, Tag, Tabs, Select, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatDate, formatNumber } from '../../utils';

const { Search } = Input;

const ADJUSTMENT_TYPES = [
  { value: 'INCREASE', label: 'Increase' },
  { value: 'DECREASE', label: 'Decrease' },
];

const REASON_OPTIONS = [
  { value: 'Physical Count', label: 'Physical Count' },
  { value: 'Purchase Receipt', label: 'Purchase Receipt' },
  { value: 'Damaged', label: 'Damaged / Waste' },
  { value: 'Theft', label: 'Shrinkage / Theft' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Other', label: 'Other' },
];

export default function Adjustments() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
  const [viewingAdjustment, setViewingAdjustment] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();

  const fetchAdjustments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'INCREASE' || activeTab === 'DECREASE') params.set('type', activeTab);
      if (activeTab === 'PENDING' || activeTab === 'COMPLETED') params.set('status', activeTab);
      if (searchText) params.set('search', searchText);
      const res = await apiRequest(`/api/inventory/adjustments?${params.toString()}`, { method: 'GET' }, token);
      setAdjustments(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setAdjustments([]);
      message.error(err?.message || 'Failed to load adjustments.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, searchText]);

const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setProducts([]);
        }
    }, [token]);

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setWarehouses([]);
        }
    }, [token]);

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchWarehouses();
    }
  }, [token, fetchProducts, fetchWarehouses]);

  useEffect(() => {
    if (token) fetchAdjustments();
  }, [token, fetchAdjustments]);

  const handleProductChange = (productId) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (product && product.ProductStocks && product.ProductStocks.length > 0) {
      // Find the first warehouse that has this product
      const warehouseId = product.ProductStocks[0].warehouseId;
      if (warehouseId) {
        form.setFieldsValue({ warehouseId });
      }
    }
  };

  const handleSubmit = async (values) => {
    try {
      await apiRequest('/api/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          type: values.adjustmentType,
          productId: values.productId,
          quantity: values.quantity,
          warehouseId: values.warehouseId || undefined,
          reason: values.reason,
          notes: values.notes || undefined,
        }),
      }, token);
      message.success('Adjustment created and stock updated.');
      form.resetFields();
      setModalOpen(false);
      fetchAdjustments();
    } catch (err) {
      message.error(err?.message || err?.data?.message || 'Adjustment failed.');
    }
  };

  const columns = [
    {
      title: 'Reference',
      dataIndex: 'referenceNumber',
      key: 'ref',
      width: 140,
      render: (v, r) => (
        <span className="font-medium text-blue-600 cursor-pointer">
          {v || `ADJ-${(r.id || '').toString().slice(0, 8)}`}
        </span>
      ),
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', width: 120, render: (v) => formatDate(v) },
    {
      title: 'Product(s)',
      key: 'prod',
      width: 180,
      render: (_, r) => r.items?.[0]?.product?.name ?? r.Product?.name ?? '—',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => (v === 'INCREASE' ? <Tag color="green">Increase</Tag> : <Tag color="red">Decrease</Tag>),
    },
    {
      render: (_, r) => {
        const qty = parseFloat(r.quantity ?? r.items?.reduce((s, i) => s + parseFloat(i.quantity || 0), 0) ?? 0);
        const uom = r.items?.[0]?.product?.unitOfMeasure ?? r.Product?.unitOfMeasure ?? 'EACH';
        return <><span className="font-bold">{formatNumber(qty)}</span> <span className="text-[10px] text-gray-400 uppercase font-bold ml-1">{uom}</span></>;
      },
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 140, ellipsis: true },
    {
      title: 'Created By',
      key: 'user',
      width: 140,
      render: (_, r) => r.createdBy?.name ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) =>
        v === 'COMPLETED' ? <Tag color="green">Completed</Tag> : <Tag color="orange">Pending</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          className="text-blue-600 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setViewingAdjustment(r);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-blue-600">Inventory Adjustments</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage stock adjustments and corrections.</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-blue-600 border-blue-600 rounded-lg"
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
            New Adjustment
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Total Adjustments</div>
            <div className="text-xl font-medium text-blue-600">{adjustments.length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Increases</div>
            <div className="text-xl font-medium text-green-600">{adjustments.filter((a) => a.type === 'INCREASE').length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Decreases</div>
            <div className="text-xl font-medium text-red-600">{adjustments.filter((a) => a.type === 'DECREASE').length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Pending</div>
            <div className="text-xl font-medium text-orange-600">{adjustments.filter((a) => a.status === 'PENDING').length}</div>
          </Card>
        </div>

        <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="[&_.ant-tabs-nav]:mb-4"
            items={[
              { key: 'all', label: `All Adjustments (${adjustments.length})` },
              { key: 'INCREASE', label: `Increases (${adjustments.filter((a) => a.type === 'INCREASE').length})` },
              { key: 'DECREASE', label: `Decreases (${adjustments.filter((a) => a.type === 'DECREASE').length})` },
              { key: 'COMPLETED', label: `Completed (${adjustments.filter((a) => a.status === 'COMPLETED').length})` },
              { key: 'PENDING', label: `Pending (${adjustments.filter((a) => a.status === 'PENDING').length})` },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Search
              placeholder="Search adjustments..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => fetchAdjustments()}
              className="max-w-xs rounded-lg"
              prefix={<SearchOutlined className="text-gray-400" />}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchAdjustments} loading={loading} className="rounded-lg">
              Refresh
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={adjustments}
            rowKey="id"
            loading={loading}
            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} adjustments`, pageSize: 10 }}
            className="[&_.ant-table-thead_th]:font-normal"
            scroll={{ x: 900 }}
          />
        </Card>

        <Modal
          title="View Adjustment"
          open={!!viewingAdjustment}
          onCancel={() => setViewingAdjustment(null)}
          footer={
            <Button type="primary" className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => setViewingAdjustment(null)}>
              Close
            </Button>
          }
          width={520}
          className="rounded-xl"
        >
          {viewingAdjustment && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">Reference</div>
                <div className="font-medium">{viewingAdjustment.referenceNumber || `ADJ-${(viewingAdjustment.id || '').toString().slice(0, 8)}`}</div>
                <div className="text-gray-500">Date</div>
                <div>{formatDate(viewingAdjustment.createdAt)}</div>
                <div className="text-gray-500">Product</div>
                <div>{viewingAdjustment.items?.[0]?.product?.name ?? viewingAdjustment.Product?.name ?? '—'}</div>
                <div className="text-gray-500">Warehouse</div>
                <div>{viewingAdjustment.Warehouse?.name ?? viewingAdjustment.warehouseId ? `#${viewingAdjustment.warehouseId}` : '—'}</div>
                <div className="text-gray-500">Type</div>
                <div>{viewingAdjustment.type === 'INCREASE' ? <Tag color="green">Increase</Tag> : <Tag color="red">Decrease</Tag>}</div>
                <div className="text-gray-500">Quantity</div>
                <div>{formatNumber(viewingAdjustment.quantity ?? 0)} <span className="text-[10px] text-gray-400 uppercase">{viewingAdjustment.items?.[0]?.product?.unitOfMeasure ?? viewingAdjustment.Product?.unitOfMeasure ?? 'EACH'}</span></div>
                <div className="text-gray-500">Reason</div>
                <div>{viewingAdjustment.reason ?? '—'}</div>
                <div className="text-gray-500">Created By</div>
                <div>{viewingAdjustment.createdBy?.name ?? '—'}</div>
                <div className="text-gray-500">Status</div>
                <div>{viewingAdjustment.status === 'COMPLETED' ? <Tag color="green">Completed</Tag> : <Tag color="orange">Pending</Tag>}</div>
              </div>
              {viewingAdjustment.notes && (
                <>
                  <div className="text-gray-500 text-sm">Notes</div>
                  <div className="text-sm bg-gray-50 rounded-lg p-3">{viewingAdjustment.notes}</div>
                </>
              )}
            </div>
          )}
        </Modal>

        <Modal
          title="New Inventory Adjustment"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={520}
          className="rounded-xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
            <Form.Item
              label="Adjustment Type"
              name="adjustmentType"
              rules={[{ required: true, message: 'Select type' }]}
            >
              <Select placeholder="Select type" allowClear className="rounded-lg" options={ADJUSTMENT_TYPES} />
            </Form.Item>
            <Form.Item
              label="Product"
              name="productId"
              rules={[{ required: true, message: 'Search and select product' }]}
            >
              <Select
                showSearch
                placeholder="Search and select product"
                allowClear
                className="rounded-lg"
                optionFilterProp="label"
                onChange={handleProductChange}
                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku || p.id})` }))}
              />
            </Form.Item>
            <Form.Item label="Warehouse (Optional)" name="warehouseId">
              <Select
                placeholder="Select warehouse (optional)"
                allowClear
                className="rounded-lg"
                options={warehouses.map((w) => ({ value: w.id, label: w.name || w.code || `Warehouse #${w.id}` }))}
              />
            </Form.Item>
            <Form.Item
              label="Quantity"
              name="quantity"
              rules={[{ required: true, message: 'Enter quantity' }]}
            >
              <InputNumber min={0.0001} step={0.0001} className="w-full rounded-lg" placeholder="Quantity" />
            </Form.Item>
            <Form.Item
              label="Reason"
              name="reason"
              rules={[{ required: true, message: 'Select reason' }]}
            >
              <Select placeholder="Select reason" allowClear className="rounded-lg" options={REASON_OPTIONS} />
            </Form.Item>
            <Form.Item label="Notes (Optional)" name="notes">
              <Input.TextArea rows={3} className="rounded-lg" placeholder="Notes (Optional)" />
            </Form.Item>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setModalOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">
                Create Adjustment
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
