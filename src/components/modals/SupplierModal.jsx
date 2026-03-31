import React, { useState } from 'react';
import { Modal, Form, Input, message, Button } from 'antd';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export default function SupplierModal({ open, onClose, onSuccess }) {
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                code: values.code,
                name: values.name,
                email: values.email || null,
                phone: values.phone || null,
                address: values.address || null,
            };
            
            const res = await apiRequest('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Supplier created');
            form.resetFields();
            if (onSuccess) onSuccess(res.data || res);
            onClose();
        } catch (err) {
            message.error(err.message || 'Failed to create supplier');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Add New Supplier"
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                <Form.Item label="Supplier Code" name="code" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="e.g. SUP001" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Supplier Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="Supplier Name" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Email" name="email">
                    <Input type="email" placeholder="email@example.com" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Phone" name="phone">
                    <Input placeholder="Phone number" className="rounded-lg" />
                </Form.Item>
                 <Form.Item label="Address" name="address">
                    <Input.TextArea rows={2} placeholder="Address" className="rounded-lg" />
                </Form.Item>
                <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={onClose} className="rounded-lg">Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600 border-blue-600 rounded-lg">
                        Create Supplier
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
