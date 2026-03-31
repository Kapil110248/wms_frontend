import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, message, Button, Row, Col } from 'antd';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const { Option } = Select;

export default function LocationModal({ open, onClose, onSuccess, warehouseId }) {
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [zones, setZones] = useState([]);
    const [loadingZones, setLoadingZones] = useState(false);

    const fetchZones = useCallback(async () => {
        if (!token || !open || !warehouseId) return;
        try {
            setLoadingZones(true);
            const res = await apiRequest(`/api/zones?warehouseId=${warehouseId}`, { method: 'GET' }, token);
            setZones(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setZones([]);
        } finally {
            setLoadingZones(false);
        }
    }, [token, open, warehouseId]);

    useEffect(() => {
        fetchZones();
    }, [fetchZones]);

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                zoneId: values.zoneId,
                name: values.name,
                code: values.code?.trim() || values.name?.replace(/\s/g, '_').toUpperCase().slice(0, 50),
                aisle: values.aisle,
                rack: values.rack,
                shelf: values.shelf,
                bin: values.bin
            };
            
            const res = await apiRequest('/api/locations', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Location created');
            form.resetFields();
            if (onSuccess) onSuccess(res.data || res);
            onClose();
        } catch (err) {
            message.error(err.message || 'Failed to create location');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Add New Storage Location"
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            width={600}
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item label="Zone" name="zoneId" rules={[{ required: true, message: 'Required' }]}>
                            <Select placeholder="Select zone" loading={loadingZones} className="rounded-lg">
                                {zones.map(z => (
                                    <Option key={z.id} value={z.id}>{z.name} ({z.Warehouse?.name || 'Unknown'})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Location Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="e.g. A-1-1" className="rounded-lg" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Code" name="code">
                            <Input placeholder="Optional code" className="rounded-lg" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item label="Aisle" name="aisle">
                            <Input className="rounded-lg" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item label="Rack" name="rack">
                            <Input className="rounded-lg" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item label="Shelf" name="shelf">
                            <Input className="rounded-lg" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item label="Bin" name="bin">
                            <Input className="rounded-lg" />
                        </Form.Item>
                    </Col>
                </Row>
                
                <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={onClose} className="rounded-lg">Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600 border-blue-600 rounded-lg">
                        Create Location
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
