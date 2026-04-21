import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, message, Tag, Tabs, Select, InputNumber, DatePicker, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, BoxPlotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatDate, formatNumber } from '../../utils';

const { Search } = Input;

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEPLETED', label: 'Depleted' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'QUARANTINED', label: 'Quarantined' },
];

export default function Batches() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingBatch, setViewingBatch] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();
  const selectedWarehouseId = Form.useWatch('warehouseId', form);

  const fetchBatches = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (['ACTIVE', 'DEPLETED', 'EXPIRED', 'QUARANTINED'].includes(activeTab)) params.set('status', activeTab);
      if (searchText) params.set('search', searchText);
      const res = await apiRequest(`/api/inventory/batches?${params.toString()}`, { method: 'GET' }, token);
      setBatches(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setBatches([]);
      message.error(err?.message || 'Failed to load batches.');
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

  const fetchLocations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/api/locations', { method: 'GET' }, token);
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch (_) {
      setLocations([]);
    }
  }, [token]);

  const fetchZones = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/api/zones', { method: 'GET' }, token);
      setZones(Array.isArray(res?.data) ? res.data : []);
    } catch (_) {
      setZones([]);
    }
  }, [token]);

  const fetchSuppliers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest('/api/suppliers', { method: 'GET' }, token);
      setSuppliers(Array.isArray(res?.data) ? res.data : []);
    } catch (_) {
      setSuppliers([]);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchWarehouses();
      fetchLocations();
      fetchZones();
      fetchSuppliers();
    }
  }, [token, fetchProducts, fetchWarehouses, fetchLocations, fetchZones, fetchSuppliers]);

  useEffect(() => {
    if (token) fetchBatches();
  }, [token, fetchBatches]);

  const zonesByWarehouse = selectedWarehouseId ? zones.filter((z) => z.warehouseId === selectedWarehouseId) : [];
  const locationIdsByZones = zonesByWarehouse.map((z) => z.id);
  const locationsForWarehouse = selectedWarehouseId ? locations.filter((l) => locationIdsByZones.includes(l.zoneId)) : locations;

  const openCreate = () => {
    setEditingBatch(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingBatch(r);
    form.setFieldsValue({
      batchNumber: r.batchNumber,
      productId: r.productId,
      warehouseId: r.warehouseId,
      locationId: r.locationId || undefined,
      quantity: r.quantity,
      unitCost: r.unitCost != null ? r.unitCost : undefined,
      receivedDate: r.receivedDate ? dayjs(r.receivedDate) : undefined,
      expiryDate: r.expiryDate ? dayjs(r.expiryDate) : undefined,
      manufacturingDate: r.manufacturingDate ? dayjs(r.manufacturingDate) : undefined,
      supplierId: r.supplierId || undefined,
      status: r.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        batchNumber: values.batchNumber,
        productId: values.productId,
        warehouseId: values.warehouseId,
        locationId: values.locationId || undefined,
        quantity: values.quantity,
        unitCost: values.unitCost != null ? Number(values.unitCost) : undefined,
        receivedDate: values.receivedDate ? dayjs(values.receivedDate).format('YYYY-MM-DD') : undefined,
        expiryDate: values.expiryDate ? dayjs(values.expiryDate).format('YYYY-MM-DD') : undefined,
        manufacturingDate: values.manufacturingDate ? dayjs(values.manufacturingDate).format('YYYY-MM-DD') : undefined,
        supplierId: values.supplierId || undefined,
      };
      if (editingBatch) {
        payload.status = values.status;
        await apiRequest(`/api/inventory/batches/${editingBatch.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
        message.success('Batch updated.');
      } else {
        await apiRequest('/api/inventory/batches', { method: 'POST', body: JSON.stringify(payload) }, token);
        message.success('Batch created.');
      }
      form.resetFields();
      setModalOpen(false);
      setEditingBatch(null);
      fetchBatches();
    } catch (err) {
      message.error(err?.message || err?.data?.message || (editingBatch ? 'Update failed.' : 'Create failed.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/inventory/batches/${id}`, { method: 'DELETE' }, token);
      message.success('Batch deleted.');
      fetchBatches();
      if (viewingBatch?.id === id) setViewingBatch(null);
    } catch (err) {
      message.error(err?.message || 'Delete failed.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await apiRequest(`/api/inventory/batches/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }, token);
      message.success('Status updated.');
      fetchBatches();
    } catch (err) {
      message.error(err?.message || 'Status update failed.');
    }
  };

  const locationLabel = (loc) => {
    if (!loc) return '—';
    if (loc.code) return loc.code;
    const parts = [loc.aisle, loc.rack, loc.shelf, loc.bin].filter(Boolean);
    return parts.length ? parts.join('-') : loc.name || '—';
  };

  const totalQty = batches.reduce((s, b) => s + parseFloat(b.quantity || 0), 0);
  const availableQty = batches.reduce((s, b) => s + parseFloat(b.availableQuantity ?? Math.max(0, parseFloat(b.quantity || 0) - parseFloat(b.reserved || 0))), 0);
  const activeBatches = batches.filter((b) => b.status === 'ACTIVE');

  const columns = [
    {
      title: 'Batch Number',
      dataIndex: 'batchNumber',
      key: 'batchNumber',
      width: 120,
      render: (v) => <span className="font-medium text-blue-600">{v}</span>,
    },
    {
      title: 'Product',
      key: 'product',
      width: 220,
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.Product?.name ?? '—'}</div>
          {r.Product?.sku && <div className="text-gray-500 text-sm">SKU: {r.Product.sku}</div>}
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'loc',
      width: 120,
      render: (_, r) => locationLabel(r.Location),
    },
    {
      title: 'Quantity',
      key: 'qty',
      width: 120,
      render: (_, r) => {
        const avail = r.availableQuantity ?? Math.max(0, (r.quantity || 0) - (r.reserved || 0));
        return <span className="text-green-600">{formatNumber(avail)} / {formatNumber(r.quantity ?? 0)}</span>;
      },
    },
    {
      title: 'Received Date',
      dataIndex: 'receivedDate',
      key: 'receivedDate',
      width: 120,
      render: (v) => formatDate(v) ?? '—',
    },
    {
      title: 'Best',
      dataIndex: 'expiryDate',
      key: 'expiry',
      width: 100,
      render: (v) => (v ? formatDate(v) : 'No E'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, r) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0" onClick={() => setViewingBatch(r)}>View</Button>
          <Button type="link" size="small" icon={<EditOutlined />} className="text-blue-600 p-0" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title="Delete this batch?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
          </Popconfirm>
          <Select
            size="small"
            value={r.status}
            onChange={(val) => handleStatusChange(r.id, val)}
            options={STATUS_OPTIONS}
            className="min-w-[100px]"
          />
        </div>
      ),
    },
  ];

  const filteredBatches = activeTab === 'all' ? batches : batches.filter((b) => b.status === activeTab);

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BoxPlotOutlined className="text-2xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-medium text-blue-600">Batch/Lot Management</h1>
              <p className="text-gray-500 text-sm mt-0.5">Track inventory batches with FIFO/LIFO/FEFO allocation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<ReloadOutlined />} onClick={fetchBatches} loading={loading} className="rounded-lg">Refresh</Button>
            <Button className="rounded-lg">Allocate Inventory</Button>
            <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={openCreate}>Create Batch</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="flex items-center gap-2">
              <BoxPlotOutlined className="text-blue-600" />
              <div>
                <div className="text-gray-500 text-sm font-normal">Total Batches</div>
                <div className="text-xl font-medium text-blue-600">{batches.length}</div>
              </div>
            </div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Active Batches</div>
            <div className="text-xl font-medium text-green-600">{activeBatches.length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Total Quantity</div>
            <div className="text-xl font-medium">{formatNumber(totalQty)} units</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Available Quantity</div>
            <div className="text-xl font-medium text-green-600">{formatNumber(availableQty)} units</div>
          </Card>
        </div>

        <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="[&_.ant-tabs-nav]:mb-4"
            items={[
              { key: 'all', label: `All Batches (${batches.length})` },
              { key: 'ACTIVE', label: `Active (${batches.filter((b) => b.status === 'ACTIVE').length})` },
              { key: 'DEPLETED', label: `Depleted (${batches.filter((b) => b.status === 'DEPLETED').length})` },
              { key: 'EXPIRED', label: `Expired (${batches.filter((b) => b.status === 'EXPIRED').length})` },
              { key: 'QUARANTINED', label: `Quarantined (${batches.filter((b) => b.status === 'QUARANTINED').length})` },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
            <Search placeholder="Search batches..." allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={() => fetchBatches()} className="max-w-xs rounded-lg" prefix={<SearchOutlined className="text-gray-400" />} />
            <Button icon={<ReloadOutlined />} onClick={fetchBatches} loading={loading} className="rounded-lg">Refresh</Button>
          </div>
          <Table
            columns={columns}
            dataSource={filteredBatches}
            rowKey="id"
            loading={loading}
            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} batches`, pageSize: 20 }}
            className="[&_.ant-table-thead_th]:font-normal"
            scroll={{ x: 900 }}
          />
        </Card>

        <Modal title="View Batch" open={!!viewingBatch} onCancel={() => setViewingBatch(null)} footer={<Button type="primary" className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => setViewingBatch(null)}>Close</Button>} width={520} className="rounded-xl">
          {viewingBatch && (
            <div className="grid grid-cols-2 gap-3 text-sm pt-2">
              <div className="text-gray-500">Batch Number</div>
              <div className="font-medium">{viewingBatch.batchNumber}</div>
              <div className="text-gray-500">Product</div>
              <div>{viewingBatch.Product?.name ?? '—'} {viewingBatch.Product?.sku && `(${viewingBatch.Product.sku})`}</div>
              <div className="text-gray-500">Warehouse</div>
              <div>{viewingBatch.Warehouse?.name ?? '—'}</div>
              <div className="text-gray-500">Location</div>
              <div>{locationLabel(viewingBatch.Location)}</div>
              <div className="text-gray-500">Quantity</div>
              <div>{formatNumber(viewingBatch.quantity ?? 0)} (Available: {formatNumber(viewingBatch.availableQuantity ?? 0)})</div>
              <div className="text-gray-500">Unit Cost</div>
              <div>{viewingBatch.unitCost != null ? `£${formatNumber(viewingBatch.unitCost)}` : '—'}</div>
              <div className="text-gray-500">Received Date</div>
              <div>{formatDate(viewingBatch.receivedDate) ?? '—'}</div>
              <div className="text-gray-500">Expiry Date</div>
              <div>{formatDate(viewingBatch.expiryDate) ?? '—'}</div>
              <div className="text-gray-500">Manufacturing Date</div>
              <div>{formatDate(viewingBatch.manufacturingDate) ?? '—'}</div>
              <div className="text-gray-500">Supplier</div>
              <div>{viewingBatch.Supplier?.name ?? '—'}</div>
              <div className="text-gray-500">Status</div>
              <div><Tag color={viewingBatch.status === 'ACTIVE' ? 'green' : viewingBatch.status === 'EXPIRED' ? 'red' : 'orange'}>{viewingBatch.status}</Tag></div>
            </div>
          )}
        </Modal>

        <Modal
          title={editingBatch ? 'Edit Batch' : 'Create New Batch'}
          open={modalOpen}
          onCancel={() => { setModalOpen(false); setEditingBatch(null); }}
          footer={null}
          width={560}
          className="rounded-xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
            <Form.Item label="Batch Number" name="batchNumber" rules={[{ required: true, message: 'Enter batch number' }]}>
              <Input placeholder="Batch Number" className="rounded-lg" />
            </Form.Item>
            <Form.Item label="Product" name="productId" rules={[{ required: true, message: 'Select a product' }]}>
              <Select showSearch placeholder="Select a product" allowClear className="rounded-lg" optionFilterProp="label" filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku || p.id})` }))} />
            </Form.Item>
            <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select a warehouse' }]}>
              <Select placeholder="Select a warehouse" allowClear className="rounded-lg" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
            </Form.Item>
            <Form.Item label="Location (Optional)" name="locationId">
              <Select placeholder="Select a location (optional)" allowClear className="rounded-lg" options={locationsForWarehouse.map((l) => ({ value: l.id, label: locationLabel(l) || l.name || `Location ${l.id}` }))} />
            </Form.Item>
            <Form.Item label="Quantity" name="quantity" rules={[{ required: true, message: 'Enter quantity' }]}>
              <InputNumber min={0} step={0.0001} className="w-full rounded-lg" placeholder="Quantity" />
            </Form.Item>
            <Form.Item label="Unit Cost" name="unitCost">
              <InputNumber min={0} step={0.0001} prefix="€" className="w-full rounded-lg" placeholder="Unit Cost (€)" />
            </Form.Item>
            <Form.Item label="Received Date" name="receivedDate">
              <DatePicker format="MM/DD/YYYY" className="w-full rounded-lg" placeholder="mm/dd/yyyy" />
            </Form.Item>
            <Form.Item label="Expiry Date" name="expiryDate">
              <DatePicker format="MM/DD/YYYY" className="w-full rounded-lg" placeholder="mm/dd/yyyy" />
            </Form.Item>
            <Form.Item label="Manufacturing Date" name="manufacturingDate">
              <DatePicker format="MM/DD/YYYY" className="w-full rounded-lg" placeholder="mm/dd/yyyy" />
            </Form.Item>
            <Form.Item label="Supplier" name="supplierId">
              <Select placeholder="Select supplier" allowClear className="rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            {editingBatch && (
              <Form.Item label="Status" name="status">
                <Select className="rounded-lg" options={STATUS_OPTIONS} />
              </Form.Item>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => { setModalOpen(false); setEditingBatch(null); }} className="rounded-lg">Cancel</Button>
              <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">{editingBatch ? 'Update' : 'Create'}</Button>
            </div>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
