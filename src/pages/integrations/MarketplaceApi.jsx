import React, { useState } from 'react';
import { Card, Button, Tag, Switch, Modal, Form, Input, message, Tooltip } from 'antd';
import {
    CheckCircleOutlined, LinkOutlined, DisconnectOutlined,
    ShopOutlined, ApiOutlined, SyncOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';

const INTEGRATIONS = [
    {
        id: 'amazon_fba',
        name: 'Amazon FBA',
        description: 'Fulfillment by Amazon — Orders and inventory automatically sync with Amazon',
        icon: '🟠',
        color: '#FF9900',
        bgColor: '#FFF8EC',
        borderColor: '#FFD580',
        fields: [
            { name: 'sellerId', label: 'Seller ID', placeholder: 'A1B2C3D4E5FGHI', required: true },
            { name: 'mwsAuthToken', label: 'MWS Auth Token', placeholder: 'amzn.mws.xxxxx-xxxxx', required: true },
            { name: 'marketplaceId', label: 'Marketplace ID', placeholder: 'A21TJRUUN4KGV (India)', required: false },
        ],
    },
    {
        id: 'amazon_mfn',
        name: 'Amazon MFN',
        description: 'Merchant Fulfilled Network — Fulfill Amazon orders from your own warehouse',
        icon: '🔶',
        color: '#E08000',
        bgColor: '#FFF8EC',
        borderColor: '#FFD580',
        fields: [
            { name: 'sellerId', label: 'Seller ID', placeholder: 'A1B2C3D4E5FGHI', required: true },
            { name: 'mwsAuthToken', label: 'MWS Auth Token', placeholder: 'amzn.mws.xxxxx-xxxxx', required: true },
        ],
    },
    {
        id: 'shopify',
        name: 'Shopify',
        description: 'Real-time inventory sync with Shopify store — Orders come directly into WMS',
        icon: '🟢',
        color: '#96BF48',
        bgColor: '#F0FBF0',
        borderColor: '#B4DFB4',
        fields: [
            { name: 'shopDomain', label: 'Shop Domain', placeholder: 'yourstore.myshopify.com', required: true },
            { name: 'accessToken', label: 'Access Token', placeholder: 'shpat_xxxxxxxxxxxxxxxx', required: true },
            { name: 'apiVersion', label: 'API Version', placeholder: '2024-01', required: false },
        ],
    },
    {
        id: 'ebay',
        name: 'eBay',
        description: 'Import orders from eBay store and sync inventory automatically',
        icon: '🔴',
        color: '#E53238',
        bgColor: '#FFF0F0',
        borderColor: '#FFB3B3',
        fields: [
            { name: 'appId', label: 'App ID', placeholder: 'YourApp-xxxx-PRD-xxxxxxxx', required: true },
            { name: 'devId', label: 'Dev ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
            { name: 'certId', label: 'Cert ID', placeholder: 'PRD-xxxxxxxxxxxxxxxx', required: true },
            { name: 'userToken', label: 'User Token', placeholder: 'AgAAAA**...', required: true },
        ],
    },
];

export default function MarketplaceApi() {
    const { token } = useAuthStore();
    const [connections, setConnections] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [activeIntegration, setActiveIntegration] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [form] = Form.useForm();

    const isConnected = (id) => !!connections[id];
    const getStatus = (id) => connections[id];

    const openConnect = (integration) => {
        setActiveIntegration(integration);
        form.resetFields();
        setModalOpen(true);
    };

    const handleConnect = async (values) => {
        setConnecting(true);
        try {
            // Simulate API connection (real implementation will call backend)
            await new Promise(r => setTimeout(r, 1500));
            setConnections(prev => ({
                ...prev,
                [activeIntegration.id]: {
                    ...values,
                    connectedAt: new Date().toISOString(),
                    syncing: false,
                }
            }));
            message.success(`✅ ${activeIntegration.name} successfully connected!`);
            setModalOpen(false);
        } catch (err) {
            message.error('Connection failed. Please check your credentials.');
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = (id, name) => {
        Modal.confirm({
            title: `Are you sure you want to disconnect ${name}?`,
            content: 'Sync will stop. Existing orders and inventory will remain untouched.',
            okText: 'Yes, Disconnect',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                setConnections(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                message.info(`${name} disconnected.`);
            }
        });
    };

    const handleSync = async (id, name) => {
        setConnections(prev => ({ ...prev, [id]: { ...prev[id], syncing: true } }));
        await new Promise(r => setTimeout(r, 2000));
        setConnections(prev => ({
            ...prev,
            [id]: { ...prev[id], syncing: false, lastSync: new Date().toISOString() }
        }));
        message.success(`${name} sync complete!`);
    };

    const connectedCount = Object.keys(connections).length;

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-400 pb-12">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Integrations</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Connect directly with Amazon and Shopify — Orders and stock will sync automatically
                    </p>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${connectedCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-sm text-gray-600">
                            <span className="font-bold text-gray-900">{connectedCount}</span> of {INTEGRATIONS.length} Connected
                        </span>
                    </div>
                    <div className="h-5 w-px bg-gray-200" />
                    <span className="text-sm text-gray-500">Real-time inventory sync • Auto order import</span>
                </div>

                {/* Integration Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {INTEGRATIONS.map((integration) => {
                        const connected = isConnected(integration.id);
                        const status = getStatus(integration.id);

                        return (
                            <Card
                                key={integration.id}
                                className="rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                                style={{
                                    border: connected
                                        ? `2px solid ${integration.color}40`
                                        : '2px solid #f0f0f0',
                                    background: connected ? integration.bgColor : 'white',
                                }}
                                bodyStyle={{ padding: '24px' }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm"
                                            style={{ background: integration.bgColor, border: `1px solid ${integration.borderColor}` }}
                                        >
                                            {integration.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{integration.name}</h3>
                                            {connected ? (
                                                <Tag color="green" icon={<CheckCircleOutlined />} className="mt-0.5">
                                                    Connected
                                                </Tag>
                                            ) : (
                                                <Tag color="default" className="mt-0.5">Not Connected</Tag>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                                    {integration.description}
                                </p>

                                {/* Last sync info */}
                                {connected && status?.lastSync && (
                                    <div className="text-xs text-gray-400 mb-4">
                                        Last Sync: {new Date(status.lastSync).toLocaleString()}
                                    </div>
                                )}
                                {connected && status?.connectedAt && !status?.lastSync && (
                                    <div className="text-xs text-gray-400 mb-4">
                                        Connected: {new Date(status.connectedAt).toLocaleString()}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {!connected ? (
                                        <Button
                                            type="primary"
                                            icon={<LinkOutlined />}
                                            onClick={() => openConnect(integration)}
                                            className="rounded-lg font-semibold"
                                            style={{ background: integration.color, borderColor: integration.color }}
                                        >
                                            Connect {integration.name}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                icon={<SyncOutlined spin={status?.syncing} />}
                                                onClick={() => handleSync(integration.id, integration.name)}
                                                loading={status?.syncing}
                                                className="rounded-lg"
                                                style={{ borderColor: integration.color, color: integration.color }}
                                            >
                                                Sync Now
                                            </Button>
                                            <Button
                                                icon={<DisconnectOutlined />}
                                                danger
                                                onClick={() => handleDisconnect(integration.id, integration.name)}
                                                className="rounded-lg"
                                            >
                                                Disconnect
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Info box */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                    <InfoCircleOutlined className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-700">
                        <p className="font-semibold mb-1">How does integration work?</p>
                        <ul className="space-y-1 list-disc list-inside text-blue-600 text-xs">
                            <li>Click Connect → Enter your platform's API credentials</li>
                            <li>Orders are automatically imported into the WMS</li>
                            <li>Inventory syncs in real-time — preventing overselling</li>
                            <li>Use "Sync Now" to manually fetch latest data</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Connect Modal */}
            {activeIntegration && (
                <Modal
                    title={
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{activeIntegration.icon}</span>
                            <span>Connect {activeIntegration.name}</span>
                        </div>
                    }
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); form.resetFields(); }}
                    footer={null}
                    width={500}
                    destroyOnClose
                >
                    <p className="text-sm text-gray-500 mb-4">{activeIntegration.description}</p>
                    <Form form={form} layout="vertical" onFinish={handleConnect}>
                        {activeIntegration.fields.map(field => (
                            <Form.Item
                                key={field.name}
                                label={field.label}
                                name={field.name}
                                rules={field.required ? [{ required: true, message: `${field.label} is required` }] : []}
                            >
                                <Input
                                    placeholder={field.placeholder}
                                    className="rounded-lg"
                                    size="large"
                                    type={field.name.toLowerCase().includes('token') || field.name.toLowerCase().includes('secret') ? 'password' : 'text'}
                                />
                            </Form.Item>
                        ))}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Cancel</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={connecting}
                                style={{ background: activeIntegration.color, borderColor: activeIntegration.color }}
                                className="rounded-lg font-semibold"
                            >
                                {connecting ? 'Connecting...' : `Connect ${activeIntegration.name}`}
                            </Button>
                        </div>
                    </Form>
                </Modal>
            )}
        </MainLayout>
    );
}
