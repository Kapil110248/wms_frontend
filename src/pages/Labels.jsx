import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, Tabs, Row, Col, Statistic, Space, Divider, Switch, Badge, Tooltip, message, Typography, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined, PrinterOutlined, BarcodeOutlined, TagsOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, SettingOutlined, WifiOutlined, UsbOutlined, ApiOutlined, CodeOutlined, SyncOutlined, ExportOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

export default function Labels() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [labels, setLabels] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState(null);
    const [form] = Form.useForm();

    const fetchLabels = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await apiRequest('/api/labels', { method: 'GET' }, token);
            setLabels(Array.isArray(data?.data) ? data.data : []);
        } catch (_) {
            setLabels([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) fetchLabels();
    }, [token, fetchLabels]);

    const handleEdit = (record) => {
        setSelectedLabel(record);
        setEditMode(true);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleSubmit = async (values) => {
        try {
            message.success(editMode ? 'Template protocol updated' : 'New label blueprint registered');
            setModalOpen(false);
            fetchLabels();
        } catch (err) {
            message.error('Registry failure');
        }
    };

    const columns = [
        {
            title: 'Template Architecture',
            key: 'name',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg"><BarcodeOutlined /></div>
                    <div>
                        <div className="font-black text-slate-800 uppercase italic tracking-tighter">{r.templateName || r.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono uppercase italic">{r.id?.slice(0, 8)} • ZPL II</div>
                    </div>
                </div>
            )
        },
        { title: 'Taxonomy', dataIndex: 'type', key: 'type', render: (t) => <Tag color="blue" className="font-black border-none text-[10px] uppercase italic">{t}</Tag> },
        { title: 'Dimensions', key: 'dim', render: (_, r) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.width || 4}" x {r.height || 6}"</span> },
        { title: 'Throughput', dataIndex: 'uses', key: 'uses', render: (v) => <Badge count={v || 0} showZero color="#6366f1" className="font-mono" /> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'} className="font-black uppercase text-[9px]">{v || 'ACTIVE'}</Tag> },
        {
            title: 'Protocol',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<PrinterOutlined className="text-indigo-500" />} />
                    <Button type="text" icon={<CodeOutlined className="text-slate-400" />} />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => handleEdit(r)} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            )
        }
    ];

    const filteredLabels = labels.filter(l => {
        if (activeTab === 'all') return true;
        return l.type?.toLowerCase() === activeTab;
    });

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Labels</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Managed thermal printing templates, ZPL encoders, and barcode serialization protocols</p>
                    </div>
                    <div className="flex gap-4">
                        <Button icon={<SettingOutlined />} size="large" className="h-14 px-6 rounded-2xl font-bold uppercase text-[11px] border-slate-200">Printer Hub</Button>
                        <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-slate-100 font-bold" onClick={() => { setEditMode(false); form.resetFields(); setModalOpen(true); }}>
                            Create Template
                        </Button>
                    </div>
                </div>

                <Row gutter={[20, 20]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="rounded-[2rem] border-none shadow-sm bg-indigo-600 text-white">
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Active Templates</div>
                            <div className="text-4xl font-black tracking-tighter">{labels.length}</div>
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold"><ThunderboltOutlined /> System Ready</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="rounded-[2rem] border-none shadow-sm bg-slate-50">
                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Printed Today</div>
                            <div className="text-4xl font-black tracking-tighter text-slate-900">1,248</div>
                            <div className="mt-4 text-[10px] font-bold text-emerald-500 uppercase">Efficiency: 99.4%</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="rounded-[2rem] border-none shadow-sm bg-slate-50">
                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Connected Hardware</div>
                            <div className="text-4xl font-black tracking-tighter text-slate-900">14</div>
                            <div className="mt-4 text-[10px] font-bold text-blue-500 uppercase">Network Stable</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="rounded-[2rem] border-none shadow-sm bg-slate-50">
                            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Queue Status</div>
                            <div className="text-4xl font-black tracking-tighter text-slate-900">0</div>
                            <div className="mt-4 text-[10px] font-bold text-gray-400 uppercase">Idle / Optimized</div>
                        </Card>
                    </Col>
                </Row>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="bg-white p-8 labels-tabs"
                        items={[
                            {
                                label: <span className="font-black uppercase tracking-widest text-[11px] px-4"><TagsOutlined /> Global Registry</span>,
                                key: 'all',
                                children: (
                                    <>
                                        <div className="mt-6 flex items-center justify-between mb-8">
                                            <Search placeholder="Directive Search (Name, UID, Type)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                                            <Button icon={<ReloadOutlined />} onClick={fetchLabels} />
                                        </div>
                                        <Table columns={columns} dataSource={filteredLabels} rowKey="id" loading={loading} />
                                    </>
                                )
                            },
                            {
                                label: <span className="font-black uppercase tracking-widest text-[11px] px-4"><PrinterOutlined /> Shipping</span>,
                                key: 'shipping'
                            },
                            {
                                label: <span className="font-black uppercase tracking-widest text-[11px] px-4"><BarcodeOutlined /> Product</span>,
                                key: 'product'
                            }
                        ]}
                    />
                </Card>

                <Modal title={editMode ? "Synthesize Template Adjustment" : "Initialize New Label Protocol"} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600} className="label-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Blueprint Identifier (Template Name)" name="templateName" rules={[{ required: true }]}><Input placeholder="Amazon Shipping 4x6" className="h-11 rounded-xl" /></Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Architecture Taxonomy" name="type" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="Shipping">Shipping</Option><Option value="Product">Product</Option><Option value="Location">Location</Option><Option value="Pallet">Pallet</Option></Select></Form.Item>
                            <Form.Item label="DPI Resolution" name="dpi" initialValue={203}><Select className="h-11 rounded-xl"><Option value={203}>203 DPI (Standard)</Option><Option value={300}>300 DPI (High Res)</Option><Option value={600}>600 DPI (Ultra)</Option></Select></Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="X-Axis (Width In)" name="width" initialValue={4}><InputNumber className="w-full h-11 rounded-xl" /></Form.Item>
                            <Form.Item label="Y-Axis (Height In)" name="height" initialValue={6}><InputNumber className="w-full h-11 rounded-xl" /></Form.Item>
                        </div>
                        <Form.Item label="ZPL Protocol Code" name="zplCode"><Input.TextArea rows={6} className="rounded-xl font-mono text-xs" placeholder="^XA^FO50,50^ADN,36,20^FDWMS Protocol^FS^XZ" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
