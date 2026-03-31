import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select, message, Tabs, DatePicker, Popconfirm } from 'antd';
import { PlusOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined, CarOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatDate } from '../../utils';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const MOVEMENT_TYPES = [
  { value: 'RECEIVE', label: 'Receive' },
  { value: 'PICK', label: 'Pick' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'ADJUST', label: 'Adjustment' },
  { value: 'RETURN', label: 'Return' },
];

const getTypeColor = (t) => {
  const colors = { RECEIVE: 'green', PICK: 'red', TRANSFER: 'blue', ADJUST: 'orange', RETURN: 'purple' };
  return colors[t] || 'default';
};

const locationLabel = (loc) => {
  if (!loc) return '—';
  if (loc.code) return loc.code;
  const parts = [loc.aisle, loc.rack, loc.shelf, loc.bin].filter(Boolean);
  return parts.length ? parts.join('-') : loc.name || '—';
};

export default function Movements() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingMovement, setViewingMovement] = useState(null);
  const [editingMovement, setEditingMovement] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();
  const selectedProductId = Form.useWatch('productId', form);

  const fetchMovements = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const tabType = activeTab !== 'all' ? activeTab : typeFilter !== 'all' ? typeFilter : null;
      if (tabType) params.set('type', tabType);
      if (dateRange?.[0]) params.set('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange?.[1]) params.set('endDate', dateRange[1].format('YYYY-MM-DD'));
      const res = await apiRequest(`/api/inventory/movements?${params.toString()}`, { method: 'GET' }, token);
      setMovements(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setMovements([]);
      message.error(err?.message || 'Failed to load movements.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, typeFilter, dateRange]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
      setProducts(Array.isArray(res?.data) ? res.data : []);
    } catch (_) {
      setProducts([]);
    }
  }, [token]);

  const fetchBatches = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/api/inventory/batches', { method: 'GET' }, token);
      setBatches(Array.isArray(res?.data) ? res.data : []);
    } catch (_) {
      setBatches([]);
    }
  }, [token]);

  const fetchLocations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/api/locations', { method: 'GET' }, token);
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch (_) {
      setLocations([]);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchBatches();
      fetchLocations();
    }
  }, [token, fetchProducts, fetchBatches, fetchLocations]);

  useEffect(() => {
    if (token) fetchMovements();
  }, [token, fetchMovements]);

  const batchesForProduct = selectedProductId ? batches.filter((b) => b.productId === selectedProductId) : batches;

  const openCreate = () => {
    setEditingMovement(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingMovement(r);
    form.setFieldsValue({
      type: r.type,
      productId: r.productId,
      batchId: r.batchId || undefined,
      fromLocationId: r.fromLocationId || undefined,
      toLocationId: r.toLocationId || undefined,
      quantity: r.quantity,
      reason: r.reason || undefined,
      notes: r.notes || undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        type: values.type,
        productId: values.productId,
        batchId: values.batchId || undefined,
        fromLocationId: values.fromLocationId || undefined,
        toLocationId: values.toLocationId || undefined,
        quantity: values.quantity,
        reason: values.reason || undefined,
        notes: values.notes || undefined,
      };
      if (editingMovement) {
        await apiRequest(`/api/inventory/movements/${editingMovement.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        message.success('Movement updated.');
      } else {
        await apiRequest('/api/inventory/movements', { method: 'POST', body: JSON.stringify(payload) }, token);
        message.success('Movement created.');
      }
      form.resetFields();
      setModalOpen(false);
      setEditingMovement(null);
      fetchMovements();
    } catch (err) {
      message.error(err?.message || err?.data?.message || (editingMovement ? 'Update failed.' : 'Create failed.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/inventory/movements/${id}`, { method: 'DELETE' }, token);
      message.success('Movement deleted.');
      fetchMovements();
      if (viewingMovement?.id === id) setViewingMovement(null);
    } catch (err) {
      message.error(err?.message || 'Delete failed.');
    }
  };

  const totalQty = movements.reduce((s, m) => s + parseFloat(m.quantity || 0), 0);
  const receiveCount = movements.filter((m) => m.type === 'RECEIVE').length;
  const transferCount = movements.filter((m) => m.type === 'TRANSFER').length;
  const pickCount = movements.filter((m) => m.type === 'PICK').length;
  const adjustCount = movements.filter((m) => m.type === 'ADJUST').length;

  const filteredMovements = activeTab === 'all' ? movements : movements.filter((m) => m.type === activeTab);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 120,
      render: (v) => (
        <div>
          <div>{formatDate(v)}</div>
          <div className="text-gray-400 text-xs">{dayjs(v).format('HH:mm')}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t) => <Tag color={getTypeColor(t)}>{t}</Tag>,
    },
    {
      title: 'Product',
      key: 'product',
      width: 220,
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.Product?.name ?? '—'}</div>
          {r.Product?.sku && <div className="text-gray-500 text-sm">SKU: {r.Product.sku}</div>}
          {r.Batch?.batchNumber && <div className="text-gray-500 text-sm">Batch: {r.Batch.batchNumber}</div>}
        </div>
      ),
    },
    {
      title: 'From Location',
      key: 'from',
      width: 120,
      render: (_, r) => (r.fromLocation ? <Tag color="orange">{locationLabel(r.fromLocation)}</Tag> : '—'),
    },
    {
      title: 'To Location',
      key: 'to',
      width: 120,
      render: (_, r) => (r.toLocation ? <Tag color="green">{locationLabel(r.toLocation)}</Tag> : '—'),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'qty',
      width: 100,
      render: (v, r) => <>{v ?? 0} <span className="text-[10px] text-gray-400 uppercase font-bold">{r.Product?.unitOfMeasure || 'units'}</span></>,
    },
    {
      title: 'User',
      key: 'user',
      width: 180,
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.user?.name ?? '—'}</div>
          {r.user?.email && <div className="text-gray-500 text-xs">{r.user.email}</div>}
        </div>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0" onClick={() => setViewingMovement(r)}>View</Button>
          <Button type="link" size="small" icon={<EditOutlined />} className="text-blue-600 p-0" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title="Delete this movement?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CarOutlined className="text-2xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-medium text-blue-600">Inventory Movements</h1>
              <p className="text-gray-500 text-sm mt-0.5">Track all inventory movements and transfers.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<ReloadOutlined />} onClick={fetchMovements} loading={loading} className="rounded-lg">Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={openCreate}>Create Movement</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Total Movements</div>
            <div className="text-xl font-medium text-blue-600">{movements.length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Receive</div>
            <div className="text-xl font-medium text-green-600">{receiveCount}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Transfers</div>
            <div className="text-xl font-medium text-blue-600">{transferCount}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Total Quantity Moved</div>
            <div className="text-xl font-medium">{totalQty} units</div>
          </Card>
        </div>

        <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
            <RangePicker value={dateRange} onChange={setDateRange} className="rounded-lg" />
            <Select value={typeFilter} onChange={setTypeFilter} className="w-36 rounded-lg" options={[{ value: 'all', label: 'All Types' }, ...MOVEMENT_TYPES]} />
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="[&_.ant-tabs-nav]:mb-4"
            items={[
              { key: 'all', label: `All Movements (${movements.length})` },
              { key: 'RECEIVE', label: `Receive (${receiveCount})` },
              { key: 'PICK', label: `Pick (${pickCount})` },
              { key: 'TRANSFER', label: `Transfers (${transferCount})` },
              { key: 'ADJUST', label: `Adjustments (${adjustCount})` },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
            <Button icon={<ReloadOutlined />} onClick={fetchMovements} loading={loading} className="rounded-lg">Refresh</Button>
          </div>
          <Table
            columns={columns}
            dataSource={filteredMovements}
            rowKey="id"
            loading={loading}
            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} movements`, pageSize: 20 }}
            className="[&_.ant-table-thead_th]:font-normal"
            scroll={{ x: 1000 }}
          />
        </Card>

        <Modal title="View Movement" open={!!viewingMovement} onCancel={() => setViewingMovement(null)} footer={<Button type="primary" className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => setViewingMovement(null)}>Close</Button>} width={520} className="rounded-xl">
          {viewingMovement && (
            <div className="grid grid-cols-2 gap-3 text-sm pt-2">
              <div className="text-gray-500">Date</div>
              <div>{formatDate(viewingMovement.createdAt)} {dayjs(viewingMovement.createdAt).format('HH:mm')}</div>
              <div className="text-gray-500">Type</div>
              <div><Tag color={getTypeColor(viewingMovement.type)}>{viewingMovement.type}</Tag></div>
              <div className="text-gray-500">Product</div>
              <div>{viewingMovement.Product?.name ?? '—'} {viewingMovement.Product?.sku && `(${viewingMovement.Product.sku})`}</div>
              <div className="text-gray-500">Batch</div>
              <div>{viewingMovement.Batch?.batchNumber ?? '—'}</div>
              <div className="text-gray-500">From Location</div>
              <div>{locationLabel(viewingMovement.fromLocation)}</div>
              <div className="text-gray-500">To Location</div>
              <div>{locationLabel(viewingMovement.toLocation)}</div>
              <div className="text-gray-500">Quantity</div>
              <div>{viewingMovement.quantity ?? 0} <span className="text-xs text-gray-400 uppercase">{viewingMovement.Product?.unitOfMeasure || 'units'}</span></div>
              <div className="text-gray-500">User</div>
              <div>{viewingMovement.user?.name ?? '—'}</div>
              <div className="text-gray-500">Reason</div>
              <div>{viewingMovement.reason ?? '—'}</div>
              {viewingMovement.notes && (
                <>
                  <div className="text-gray-500">Notes</div>
                  <div className="col-span-2 text-sm bg-gray-50 rounded-lg p-2">{viewingMovement.notes}</div>
                </>
              )}
            </div>
          )}
        </Modal>

        <Modal
          title={editingMovement ? 'Edit Movement' : 'Create Movement'}
          open={modalOpen}
          onCancel={() => { setModalOpen(false); setEditingMovement(null); }}
          footer={null}
          width={560}
          className="rounded-xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
            <Form.Item label="Movement Type" name="type" rules={[{ required: true, message: 'Select type' }]}>
              <Select placeholder="Select type" allowClear className="rounded-lg" options={MOVEMENT_TYPES} />
            </Form.Item>
            <Form.Item label="Product" name="productId" rules={[{ required: true, message: 'Select a product' }]}>
              <Select showSearch placeholder="Select a product" allowClear className="rounded-lg" optionFilterProp="label" filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku || p.id})` }))} />
            </Form.Item>
            <Form.Item label="Batch (Optional)" name="batchId">
              <Select placeholder="Select a batch (optional)" allowClear className="rounded-lg" options={batchesForProduct.map((b) => ({ value: b.id, label: b.batchNumber }))} />
            </Form.Item>
            <Form.Item label="From Location" name="fromLocationId">
              <Select placeholder="Select source location" allowClear className="rounded-lg" options={locations.map((l) => ({ value: l.id, label: locationLabel(l) || l.name || `Location ${l.id}` }))} />
            </Form.Item>
            <Form.Item label="To Location" name="toLocationId">
              <Select placeholder="Select destination location" allowClear className="rounded-lg" options={locations.map((l) => ({ value: l.id, label: locationLabel(l) || l.name || `Location ${l.id}` }))} />
            </Form.Item>
            <Form.Item label="Quantity" name="quantity" rules={[{ required: true, message: 'Enter quantity' }]}>
              <InputNumber min={1} className="w-full rounded-lg" placeholder="Quantity" />
            </Form.Item>
            <Form.Item label="Reason" name="reason">
              <Input className="rounded-lg" placeholder="Reason" />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea rows={3} className="rounded-lg" placeholder="Notes" />
            </Form.Item>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => { setModalOpen(false); setEditingMovement(null); }} className="rounded-lg">Cancel</Button>
              <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">{editingMovement ? 'Update' : 'Create'}</Button>
            </div>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
