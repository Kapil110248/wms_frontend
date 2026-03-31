import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, EnvironmentOutlined, HomeOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Option } = Select;
const { Search } = Input;

const ZONE_TYPE_LABELS = { STANDARD: 'Standard', COLD: 'Cold', FROZEN: 'Frozen', HAZMAT: 'Hazmat', QUARANTINE: 'Quarantine' };

export default function Zones() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [zones, setZones] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedZone, setSelectedZone] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchZones = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/zones', { method: 'GET' }, token);
            setZones(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load zones');
            setZones([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setWarehouses([]);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchZones();
            fetchWarehouses();
        }
    }, [token, fetchZones, fetchWarehouses]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            if (selectedZone) {
                await apiRequest(`/api/zones/${selectedZone.id}`, { method: 'PUT', body: JSON.stringify(values) }, token);
                message.success('Zone updated');
            } else {
                await apiRequest('/api/zones', { method: 'POST', body: JSON.stringify(values) }, token);
                message.success('Zone created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedZone(null);
            fetchZones();
        } catch (err) {
            message.error(err.message || 'Failed to save zone');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/zones/${id}`, { method: 'DELETE' }, token);
            message.success('Zone deleted');
            fetchZones();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const filteredZones = zones.filter(z => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        const name = (z.name || '').toLowerCase();
        const code = (z.code || '').toLowerCase();
        const whName = (z.Warehouse?.name || '').toLowerCase();
        const whCode = (z.Warehouse?.code || '').toLowerCase();
        return name.includes(s) || code.includes(s) || whName.includes(s) || whCode.includes(s);
    });

    const columns = [
        { title: 'Zone Code', dataIndex: 'code', key: 'code', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Zone Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><EnvironmentOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Category', key: 'wh', render: (_, r) => r.Warehouse ? <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{r.Warehouse.name} ({r.Warehouse.code})</span> : '—' },
        { title: 'Zone Type', dataIndex: 'zoneType', key: 'zoneType', width: 120, render: (t) => t ? <Tag color={t === 'COLD' ? 'cyan' : t === 'FROZEN' ? 'blue' : t === 'HAZMAT' || t === 'QUARANTINE' ? 'red' : 'default'}>{t}</Tag> : '—' },
        { title: 'Locations', key: 'locs', width: 100, render: (_, r) => <span className="text-purple-600 font-medium">{(r.locations?.length ?? 0)}</span> },
        { title: 'Created', dataIndex: 'createdAt', key: 'created', width: 100, render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
        {
            title: 'Actions',
            key: 'act',
            width: 140,
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedZone(r); setViewMode(true); setModalOpen(true); form.setFieldsValue({ code: r.code, name: r.name, warehouseId: r.warehouseId, zoneType: r.zoneType }); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedZone(r); setViewMode(false); form.setFieldsValue({ code: r.code, name: r.name, warehouseId: r.warehouseId, zoneType: r.zoneType }); setModalOpen(true); }} />
                    <Popconfirm title="Delete this zone?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-12 p-2 md:p-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-blue-600">Category Zones</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Manage storage zones within categories</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg w-full md:w-auto h-10 md:h-9" onClick={() => { setSelectedZone(null); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Zone
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:20px' }}>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-gray-400 font-black uppercase">Total</div>
                            <div className="text-xl md:text-2xl font-black text-blue-600">{zones.length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:20px' }}>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-gray-400 font-black uppercase">Standard</div>
                            <div className="text-xl md:text-2xl font-black text-blue-600">{zones.filter(z => z.zoneType === 'STANDARD').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:20px' }}>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-gray-400 font-black uppercase">Cold</div>
                            <div className="text-xl md:text-2xl font-black text-blue-600">{zones.filter(z => z.zoneType === 'COLD').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:20px' }}>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-gray-400 font-black uppercase">Frozen</div>
                            <div className="text-xl md:text-2xl font-black text-purple-600">{zones.filter(z => z.zoneType === 'FROZEN').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:20px' }}>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-gray-400 font-black uppercase">Hazmat</div>
                            <div className="text-xl md:text-2xl font-black text-red-600">{zones.filter(z => z.zoneType === 'HAZMAT').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm" bodyStyle={{ padding: '12px md:20px' }}>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-gray-400 font-black uppercase">Quarantine</div>
                            <div className="text-xl md:text-2xl font-black text-red-600">{zones.filter(z => z.zoneType === 'QUARANTINE').length}</div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden" styles={{ body: { padding: 0 } }}>
                    <div className="p-3 md:p-6">
                        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                            <div className="flex gap-2 w-full md:max-w-md">
                                <Search placeholder="Search..." className="flex-1" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                                <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white md:hidden" onClick={fetchZones} />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white hidden md:flex">Search</Button>
                                <Button icon={<ReloadOutlined />} onClick={fetchZones} className="flex-1 md:flex-none">Refresh</Button>
                            </div>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredZones}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} zones`, pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Zone' : selectedZone ? 'Edit Zone' : 'Add Zone'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedZone(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedZone(null); }}>Close</Button>] : undefined}
                    width={560}
                >
                    {viewMode && selectedZone ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Zone Code</div><div className="text-gray-900">{selectedZone.code ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Zone Name</div><div className="text-gray-900">{selectedZone.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse</div><div className="text-gray-900">{selectedZone.Warehouse ? `${selectedZone.Warehouse.name} (${selectedZone.Warehouse.code})` : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Zone Type</div><div className="text-gray-900">{selectedZone.zoneType ? (ZONE_TYPE_LABELS[selectedZone.zoneType] || selectedZone.zoneType) : '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            <Form.Item label="Zone Code" name="code" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. ZN-A" className="rounded-lg" disabled={!!selectedZone} />
                            </Form.Item>
                            <Form.Item label="Zone Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Zone name" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Category" name="warehouseId" rules={[{ required: true, message: 'Select category' }]}>
                                <Select placeholder="Select category" className="rounded-lg" disabled={!!selectedZone}>
                                    {(Array.isArray(warehouses) ? warehouses : []).map(wh => <Option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Zone Type" name="zoneType">
                                <Select placeholder="Select zone type" className="rounded-lg" allowClear>
                                    <Option value="STANDARD">Standard</Option>
                                    <Option value="COLD">Cold</Option>
                                    <Option value="FROZEN">Frozen</Option>
                                    <Option value="HAZMAT">Hazmat</Option>
                                    <Option value="QUARANTINE">Quarantine</Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
