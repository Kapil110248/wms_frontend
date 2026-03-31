import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Form, Input, InputNumber, Modal, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

export default function VatCodes({ embedded = false }) {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [list, setList] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchList = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/vat-codes', { method: 'GET' }, token);
            setList(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            message.error(err?.message || 'Failed to load VAT codes');
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                code: values.code?.trim(),
                label: values.label?.trim(),
                ratePercent: values.ratePercent != null ? Number(values.ratePercent) : 0,
                countryCode: values.countryCode || 'UK',
            };
            if (editingId && String(editingId).startsWith('default-') === false) {
                await apiRequest(`/api/vat-codes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('VAT code updated');
            } else {
                await apiRequest('/api/vat-codes', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('VAT code created');
            }
            setModalOpen(false);
            form.resetFields();
            setEditingId(null);
            fetchList();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (String(id).startsWith('default-')) {
            message.info('Default VAT codes cannot be deleted. Add your own codes to override.');
            return;
        }
        try {
            await apiRequest(`/api/vat-codes/${id}`, { method: 'DELETE' }, token);
            message.success('VAT code deleted');
            fetchList();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Delete failed');
        }
    };

    const columns = [
        { title: 'Code', dataIndex: 'code', key: 'code', width: 120, render: (v) => <span className="font-medium">{v || '—'}</span> },
        { title: 'Label', dataIndex: 'label', key: 'label', render: (v) => v || '—' },
        { title: 'Rate (%)', dataIndex: 'ratePercent', key: 'ratePercent', width: 100, render: (v) => v != null ? Number(v) : '—' },
        { title: 'Country', dataIndex: 'countryCode', key: 'countryCode', width: 80, render: (v) => v || '—' },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, r) =>
                String(r.id).startsWith('default-') ? (
                    <span className="text-gray-400 text-sm">Default</span>
                ) : (
                    <span className="flex gap-1">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); form.setFieldsValue({ code: r.code, label: r.label, ratePercent: r.ratePercent, countryCode: r.countryCode || 'UK' }); setModalOpen(true); }} />
                        <Popconfirm title="Delete this VAT code?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </span>
                ),
        },
    ];

    const content = (
        <div className={embedded ? 'space-y-4' : 'space-y-6 pb-12'}>
            {!embedded && (
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">VAT Codes</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage VAT rates (UK). Used in Edit Product dropdown.</p>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center">
                <div />
                <div className="flex gap-2">
                    <Button icon={<ReloadOutlined />} onClick={fetchList} size={embedded ? 'small' : 'middle'}>Refresh</Button>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600" size={embedded ? 'small' : 'middle'} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
                        Add VAT Code
                    </Button>
                </div>
            </div>
            <Card className="rounded-xl border-gray-100 shadow-sm">
                <Table dataSource={list} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size={embedded ? 'small' : 'middle'} />
            </Card>
            <Modal
                    title={editingId ? 'Edit VAT Code' : 'Add VAT Code'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields(); }}
                    footer={null}
                    destroyOnClose
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                        <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="e.g. STANDARD" disabled={editingId && String(editingId).startsWith('default-')} />
                        </Form.Item>
                        <Form.Item name="label" label="Label">
                            <Input placeholder="e.g. Standard (20%)" />
                        </Form.Item>
                        <Form.Item name="ratePercent" label="Rate (%)" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber className="w-full" min={0} max={100} step={0.01} placeholder="20" />
                        </Form.Item>
                        <Form.Item name="countryCode" label="Country Code">
                            <Input placeholder="UK" />
                        </Form.Item>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600 border-blue-600">Save</Button>
                        </div>
                    </Form>
                </Modal>
        </div>
    );

    if (embedded) return content;
    return <MainLayout>{content}</MainLayout>;
}
