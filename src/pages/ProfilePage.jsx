import React, { useState } from 'react';
import { Card, Button, Tag, Modal, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
    UserOutlined,
    MailOutlined,
    IdcardOutlined,
    LogoutOutlined,
    ArrowLeftOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { formatRole, getRoleColor } from '../permissions';
import { apiRequest } from '../api/client';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, token, logout, setUser } = useAuthStore();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleBack = () => {
        navigate(-1);
    };

    const handleEditProfile = async (values) => {
        try {
            setSaving(true);
            const data = await apiRequest('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({ name: values.name, email: values.email }),
            }, token);
            if (data.user) {
                setUser({
                    ...user,
                    name: data.user.name,
                    email: data.user.email,
                });
                message.success('Profile updated');
                setEditModalOpen(false);
                form.resetFields();
            }
        } catch (err) {
            message.error(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('New passwords do not match');
            return;
        }
        try {
            setSaving(true);
            await apiRequest('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                }),
            }, token);
            message.success('Password changed');
            setPasswordModalOpen(false);
            passwordForm.resetFields();
        } catch (err) {
            message.error(err.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = () => {
        form.setFieldsValue({ name: user?.name, email: user?.email });
        setEditModalOpen(true);
    };

    const openPasswordModal = () => {
        passwordForm.resetFields();
        setPasswordModalOpen(true);
    };

    const rows = [
        { label: 'Name', icon: <UserOutlined className="text-gray-400 mr-2" />, value: user?.name },
        { label: 'Email', icon: <MailOutlined className="text-gray-400 mr-2" />, value: user?.email },
        { label: 'Role', icon: <IdcardOutlined className="text-gray-400 mr-2" />, value: <Tag color={getRoleColor(user?.role || '')}>{formatRole(user?.role || '')}</Tag> },
        { label: 'Status', icon: null, value: <Tag color="green">Active</Tag> },
        { label: 'User ID', icon: null, value: user?.id },
        { label: 'Company ID', icon: null, value: user?.companyId ?? 'N/A' },
    ];

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} className="rounded-lg -ml-2">
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                    </div>
                    <Button icon={<LogoutOutlined />} onClick={handleLogout} className="rounded-lg border-gray-300">
                        Logout
                    </Button>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                            <p className="text-gray-600 text-sm mt-0.5">{user?.email}</p>
                            <Tag color={getRoleColor(user?.role || '')} className="mt-2">
                                {formatRole(user?.role || '')}
                            </Tag>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        {rows.map((r, i) => (
                            <div key={i} className="flex items-center py-3 border-b border-gray-50 last:border-0">
                                <span className="w-32 text-gray-500 text-sm flex items-center shrink-0">
                                    {r.icon}
                                    {r.label}
                                </span>
                                <span className="text-gray-900 font-medium">{r.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 mt-8">
                        <Button type="primary" size="large" className="rounded-lg bg-blue-600" onClick={openEditModal}>
                            Edit Profile
                        </Button>
                        <Button size="large" className="rounded-lg border-gray-300" onClick={openPasswordModal}>
                            Change Password
                        </Button>
                    </div>
                </Card>

                <Modal title="Edit Profile" open={editModalOpen} onCancel={() => setEditModalOpen(false)} footer={null} className="rounded-xl">
                    <Form form={form} layout="vertical" onFinish={handleEditProfile} className="pt-2">
                        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Enter name' }]}>
                            <Input placeholder="Your name" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter email' }, { type: 'email', message: 'Valid email required' }]}>
                            <Input placeholder="email@example.com" className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600">Save</Button>
                        </div>
                    </Form>
                </Modal>

                <Modal title="Change Password" open={passwordModalOpen} onCancel={() => setPasswordModalOpen(false)} footer={null} className="rounded-xl">
                    <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} className="pt-2">
                        <Form.Item label="Current Password" name="currentPassword" rules={[{ required: true, message: 'Enter current password' }]}>
                            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Current password" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="New Password" name="newPassword" rules={[{ required: true, message: 'Enter new password' }, { min: 6, message: 'Min 6 characters' }]}>
                            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="New password" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Confirm New Password" name="confirmPassword" rules={[{ required: true, message: 'Confirm new password' }]}>
                            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Confirm new password" className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => setPasswordModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600">Change Password</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
