import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const { Option } = Select;

export default function CustomerModal({ open, onCancel, onSuccess }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { token } = useAuthStore();

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            setLoading(true);
            const payload = { ...values, type: values.type || 'B2C' }; // Default to B2C if not specified
            const response = await apiRequest('/api/orders/customers', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Customer created successfully');
            form.resetFields();
            if (onSuccess) onSuccess(response.data || response);
            onCancel();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create customer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Add New Customer"
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={loading}
            okText="Save Customer"
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item label="Customer Code" name="code" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="e.g. CUST-001" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Customer Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="Full Name" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Type" name="type" initialValue="B2C">
                    <Select className="rounded-lg">
                        <Option value="B2C">B2C</Option>
                        <Option value="B2B">B2B</Option>
                    </Select>
                </Form.Item>
                <Form.Item label="Email" name="email">
                    <Input placeholder="email@example.com" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Phone" name="phone">
                    <Input placeholder="Phone Number" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Address" name="address">
                    <Input.TextArea rows={2} placeholder="Full Address" className="rounded-lg" />
                </Form.Item>
                <Form.Item label="Postcode" name="postcode">
                    <Input placeholder="Postcode" className="rounded-lg" />
                </Form.Item>
            </Form>
        </Modal>
    );
}
