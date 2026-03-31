import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Card, Form, Tabs, Typography, Row, Col, message } from 'antd';
import { SaveOutlined, SettingOutlined, ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import VatCodes from './settings/VatCodes';

const { Title, Text } = Typography;

export default function Settings() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [companyProfile, setCompanyProfile] = useState(null);
    const [generalForm] = Form.useForm();

    const isCompanyAdmin = user?.role === 'company_admin';

    const fetchCompanyProfile = useCallback(async () => {
        if (!token || !isCompanyAdmin || !user?.companyId) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/company/profile', { method: 'GET' }, token);
            setCompanyProfile(res.data || null);
            if (res.data) {
                generalForm.setFieldsValue({
                    name: res.data.name,
                    code: res.data.code,
                    address: res.data.address,
                    phone: res.data.phone,
                    email: res.data.email,
                });
            }
        } catch (_) {
            setCompanyProfile(null);
        } finally {
            setLoading(false);
        }
    }, [token, isCompanyAdmin, user?.companyId, generalForm]);

    useEffect(() => {
        if (activeTab === 'general') fetchCompanyProfile();
    }, [activeTab, fetchCompanyProfile]);

    const handleSaveGeneral = async (values) => {
        if (!token || !isCompanyAdmin) return;
        try {
            setLoading(true);
            await apiRequest('/api/company/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    name: values.name,
                    address: values.address,
                    phone: values.phone,
                    email: values.email,
                }),
            }, token);
            setCompanyProfile((p) => (p ? { ...p, ...values } : null));
            message.success('Company settings saved');
        } catch (err) {
            message.error(err.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const renderVatCodes = () => <VatCodes embedded />;

    const renderGeneral = () => (
        <div className="space-y-6">
            {!isCompanyAdmin ? (
                <Card className="rounded-xl border border-gray-100 shadow-sm">
                    <Text type="secondary">Company settings are managed by Company Admin. Use Company Management for organization-level configuration.</Text>
                    <div className="mt-4">
                        <Link to="/companies">
                            <Button type="primary" className="rounded-lg bg-blue-600">Company Management</Button>
                        </Link>
                    </div>
                </Card>
            ) : (
                <>
                    <Card title="Company Profile" className="rounded-xl border border-gray-100 shadow-sm">
                        <Form form={generalForm} layout="vertical" onFinish={handleSaveGeneral}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
                                        <Input placeholder="Company name" className="rounded-lg" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="code" label="Company Code">
                                        <Input disabled className="rounded-lg" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="email" label="Email">
                                        <Input placeholder="contact@company.com" className="rounded-lg" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="phone" label="Phone">
                                        <Input placeholder="Phone" className="rounded-lg" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="address" label="Address">
                                        <Input.TextArea rows={2} placeholder="Address" className="rounded-lg" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} className="rounded-lg bg-blue-600">
                                Save
                            </Button>
                        </Form>
                    </Card>
                </>
            )}
        </div>
    );

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-300 pb-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Company profile and VAT codes</p>
                    </div>
                    {isCompanyAdmin && (
                        <Button icon={<ReloadOutlined />} onClick={fetchCompanyProfile} loading={loading} className="rounded-lg">
                            Refresh
                        </Button>
                    )}
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: 'general', label: <span><SettingOutlined /> General</span>, children: renderGeneral() },
                        { key: 'vat-codes', label: <span><DollarOutlined /> VAT Codes</span>, children: renderVatCodes() },
                    ]}
                />
            </div>
        </MainLayout>
    );
}
