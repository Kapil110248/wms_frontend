import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, message, Tag, Tabs, Select, DatePicker } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatDate } from '../../utils';

const { Search } = Input;

const COUNT_TYPES = [
  { value: 'FULL', label: 'Full Count' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'SPOT', label: 'Spot Check' },
];

export default function CycleCounts() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [cycleCounts, setCycleCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingCount, setViewingCount] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [performModalOpen, setPerformModalOpen] = useState(false);
  const [countingItem, setCountingItem] = useState(null);
  const [locationStocks, setLocationStocks] = useState([]);
  const [countedValues, setCountedValues] = useState({});
  const [form] = Form.useForm();

  const fetchCycleCounts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (['COMPLETED', 'IN_PROGRESS', 'PENDING'].includes(activeTab)) params.set('status', activeTab);
      if (searchText) params.set('search', searchText);
      const res = await apiRequest(`/api/inventory/cycle-counts?${params.toString()}`, { method: 'GET' }, token);
      setCycleCounts(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setCycleCounts([]);
      message.error(err?.message || 'Failed to load cycle counts.');
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, searchText]);

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
      fetchLocations();
    }
  }, [token, fetchLocations]);

  useEffect(() => {
    if (token) fetchCycleCounts();
  }, [token, fetchCycleCounts]);

  const handleSubmit = async (values) => {
    try {
      await apiRequest('/api/inventory/cycle-counts', {
        method: 'POST',
        body: JSON.stringify({
          countName: values.countName,
          countType: values.countType,
          locationId: values.locationId || undefined,
          scheduledDate: values.scheduledDate ? dayjs(values.scheduledDate).format('YYYY-MM-DD') : undefined,
          notes: values.notes || undefined,
        }),
      }, token);
      message.success('Cycle count created.');
      form.resetFields();
      setModalOpen(false);
      fetchCycleCounts();
    } catch (err) {
      message.error(err?.message || err?.data?.message || 'Failed to create cycle count.');
    }
  };

  const openPerformCount = async (r) => {
    setCountingItem(r);
    setCountedValues({});
    setPerformModalOpen(true);
    if (r.locationId) {
      try {
        const res = await apiRequest(`/api/inventory/stock?locationId=${r.locationId}`, { method: 'GET' }, token);
        const stocks = Array.isArray(res?.data) ? res.data : [];
        const uniqueProducts = [];
        const seen = new Set();
        stocks.forEach(s => {
            if(!seen.has(s.productId)) {
                seen.add(s.productId);
                uniqueProducts.push({
                    productId: s.productId,
                    name: s.Product?.name,
                    sku: s.Product?.sku,
                    systemQty: s.quantity
                });
            } else {
                 const existing = uniqueProducts.find(p => p.productId === s.productId);
                 if(existing) existing.systemQty += (s.quantity || 0);
            }
        });
        setLocationStocks(uniqueProducts);
        const initialCounts = {};
        uniqueProducts.forEach(p => initialCounts[p.productId] = 0);
        setCountedValues(initialCounts);
      } catch (e) {
        message.error('Failed to load location stock');
        setLocationStocks([]);
      }
    } else {
      setLocationStocks([]);
    }
  };

  const handleCompleteCount = async () => {
    if (!countingItem) return;
    try {
      const products = Object.keys(countedValues).map(pid => ({
        productId: parseInt(pid),
        countedQty: countedValues[pid]
      }));
      
      await apiRequest(`/api/inventory/cycle-counts/${countingItem.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ products })
      }, token);
      
      message.success('Cycle count completed & stock adjusted.');
      setPerformModalOpen(false);
      setCountingItem(null);
      fetchCycleCounts();
    } catch (err) {
      message.error(err?.message || 'Failed to complete count');
    }
  };

  const locationLabel = (loc) => {
    if (!loc) return '—';
    if (loc.code) return loc.code;
    const parts = [loc.aisle, loc.rack, loc.shelf, loc.bin].filter(Boolean);
    return parts.length ? parts.join('-') : loc.name || '—';
  };

  const columns = [
    {
      title: 'Count ID',
      dataIndex: 'referenceNumber',
      key: 'ref',
      width: 120,
      render: (v, r) => (
        <span className="font-medium text-blue-600">
          {v || `CC-${String(r.id || '').padStart(5, '0')}`}
        </span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'scheduledDate',
      key: 'date',
      width: 120,
      render: (v, r) => formatDate(v || r.createdAt),
    },
    {
      title: 'Location',
      key: 'loc',
      width: 140,
      render: (_, r) => locationLabel(r.Location),
    },
    {
      title: 'Items Counted',
      dataIndex: 'itemsCount',
      key: 'cnt',
      width: 120,
      align: 'right',
      render: (v) => v ?? 0,
    },
    {
      title: 'Discrepancies',
      dataIndex: 'discrepancies',
      key: 'disc',
      width: 120,
      align: 'right',
      render: (v) => (v > 0 ? <Tag color="red">{v}</Tag> : v ?? 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => {
        if (v === 'COMPLETED') return <Tag color="green">Completed</Tag>;
        if (v === 'IN_PROGRESS') return <Tag color="blue">In Progress</Tag>;
        return <Tag color="orange">Pending</Tag>;
      },
    },
    {
      title: 'Counter',
      key: 'user',
      width: 120,
      render: (_, r) => r.countedBy?.name ?? '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            className="text-blue-600 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setViewingCount(r);
            }}
          >
            View
          </Button>
          {r.status !== 'COMPLETED' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              className="text-green-600 p-0"
              onClick={(e) => {
                e.stopPropagation();
                openPerformCount(r);
              }}
            >
              Count
            </Button>
          )}
        </>
      ),
    },
  ];

  const withDiscrepancies = cycleCounts.filter((c) => (c.discrepancies || 0) > 0);

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-blue-600">Cycle Counts</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track inventory cycle counting operations.</p>
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
            Start Count
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Total Counts</div>
            <div className="text-xl font-medium text-blue-600">{cycleCounts.length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Completed</div>
            <div className="text-xl font-medium text-green-600">{cycleCounts.filter((c) => c.status === 'COMPLETED').length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">In Progress</div>
            <div className="text-xl font-medium text-orange-600">{cycleCounts.filter((c) => c.status === 'IN_PROGRESS').length}</div>
          </Card>
          <Card className="rounded-xl shadow-sm border-gray-100">
            <div className="text-gray-500 text-sm font-normal">Discrepancies</div>
            <div className="text-xl font-medium text-red-600">{withDiscrepancies.length}</div>
          </Card>
        </div>

        <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="[&_.ant-tabs-nav]:mb-4"
            items={[
              { key: 'all', label: `All Counts (${cycleCounts.length})` },
              { key: 'COMPLETED', label: `Completed (${cycleCounts.filter((c) => c.status === 'COMPLETED').length})` },
              { key: 'IN_PROGRESS', label: `In Progress (${cycleCounts.filter((c) => c.status === 'IN_PROGRESS').length})` },
              { key: 'PENDING', label: `Pending (${cycleCounts.filter((c) => c.status === 'PENDING').length})` },
              { key: 'discrepancies', label: `With Discrepancies (${withDiscrepancies.length})` },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
            <Search
              placeholder="Search cycle counts..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => fetchCycleCounts()}
              className="max-w-xs rounded-lg"
              prefix={<SearchOutlined className="text-gray-400" />}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchCycleCounts} loading={loading} className="rounded-lg">
              Refresh
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={activeTab === 'discrepancies' ? withDiscrepancies : cycleCounts}
            rowKey="id"
            loading={loading}
            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} cycle counts`, pageSize: 10 }}
            className="[&_.ant-table-thead_th]:font-normal"
            scroll={{ x: 900 }}
          />
        </Card>

        <Modal
          title="View Cycle Count"
          open={!!viewingCount}
          onCancel={() => setViewingCount(null)}
          footer={
            <Button type="primary" className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => setViewingCount(null)}>
              Close
            </Button>
          }
          width={520}
          className="rounded-xl"
        >
          {viewingCount && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-500">Count ID</div>
                <div className="font-medium">{viewingCount.referenceNumber || `CC-${String(viewingCount.id || '').padStart(5, '0')}`}</div>
                <div className="text-gray-500">Count Name</div>
                <div>{viewingCount.countName ?? '—'}</div>
                <div className="text-gray-500">Count Type</div>
                <div>{viewingCount.countType ?? '—'}</div>
                <div className="text-gray-500">Location</div>
                <div>{locationLabel(viewingCount.Location)}</div>
                <div className="text-gray-500">Scheduled Date</div>
                <div>{formatDate(viewingCount.scheduledDate) ?? '—'}</div>
                <div className="text-gray-500">Items Counted</div>
                <div>{viewingCount.itemsCount ?? 0}</div>
                <div className="text-gray-500">Discrepancies</div>
                <div>{viewingCount.discrepancies ?? 0}</div>
                <div className="text-gray-500">Status</div>
                <div>
                  {viewingCount.status === 'COMPLETED' && <Tag color="green">Completed</Tag>}
                  {viewingCount.status === 'IN_PROGRESS' && <Tag color="blue">In Progress</Tag>}
                  {viewingCount.status === 'PENDING' && <Tag color="orange">Pending</Tag>}
                </div>
                <div className="text-gray-500">Counter</div>
                <div>{viewingCount.countedBy?.name ?? '—'}</div>
              </div>
              {viewingCount.notes && (
                <>
                  <div className="text-gray-500 text-sm">Notes</div>
                  <div className="text-sm bg-gray-50 rounded-lg p-3">{viewingCount.notes}</div>
                </>
              )}
            </div>
          )}
        </Modal>

        <Modal
          title="Start Cycle Count"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={520}
          className="rounded-xl"
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
            <Form.Item
              label="Count Name"
              name="countName"
              rules={[{ required: true, message: 'Enter count name' }]}
            >
              <Input placeholder="Count Name" className="rounded-lg" />
            </Form.Item>
            <Form.Item label="Count Type" name="countType">
              <Select placeholder="Select count type" allowClear className="rounded-lg" options={COUNT_TYPES} />
            </Form.Item>
            <Form.Item label="Location" name="locationId">
              <Select
                showSearch
                placeholder="Select a location to count"
                allowClear
                className="rounded-lg"
                optionFilterProp="label"
                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={locations.map((l) => ({
                  value: l.id,
                  label: l.name ? `${l.name} (${l.aisle || ''}-${l.rack || ''})` : `${l.aisle || ''}-${l.rack || ''}-${l.shelf || ''}-${l.bin || ''}`.replace(/^-|-$/g, '') || `Location ${l.id}`,
                }))}
              />
            </Form.Item>
            <Form.Item label="Scheduled Date" name="scheduledDate">
              <DatePicker format="MM/DD/YYYY" className="w-full rounded-lg" placeholder="mm/dd/yyyy" />
            </Form.Item>
            <Form.Item label="Notes (Optional)" name="notes">
              <Input.TextArea rows={3} className="rounded-lg" placeholder="Notes (Optional)" />
            </Form.Item>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setModalOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">
                Create
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
