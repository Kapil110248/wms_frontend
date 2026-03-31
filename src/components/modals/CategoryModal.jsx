import React, { useState } from 'react';
import { Modal, Form, Input, Select, message, Button } from 'antd';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const { Option } = Select;

export default function CategoryModal({ open, onClose, onSuccess }) {
    const { token, user } = useAuthStore();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const isSuperAdmin = user?.role === 'super_admin';

    // We might need companies if superadmin, but for "quick add" inside a company context, 
    // usually the user is already in a company or we can default to current context.
    // For simplicity in "quick add", let's assume current company or let backend handle it.

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                code: values.code?.trim() || values.name?.replace(/\s/g, '_').toUpperCase().slice(0, 50)
            };
            
            const res = await apiRequest('/api/inventory/categories', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Category created');
            form.resetFields();
            if (onSuccess) onSuccess(res.data || res); // Pass back the new category
            onClose();
        } catch (err) {
            message.error(err.message || 'Failed to create category');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Add New Category"
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                <Form.Item label="Category Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="e.g. Electronics" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Code" name="code">
                    <Input placeholder="Optional - auto from name" className="rounded-lg" />
                </Form.Item>
                <div className="flex justify-end gap-2 mt-4">
                    <Button onClick={onClose} className="rounded-lg">Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600 border-blue-600 rounded-lg">
                        Create Category
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
