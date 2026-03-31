import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, Tag, Row, Col, Typography, Space, Divider, Checkbox, Collapse, Select, message } from 'antd';
import { SafetyOutlined, PlusOutlined, LockOutlined, EditOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { mockRoles } from '../mockData';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

export default function Roles() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [groupedPerms, setGroupedPerms] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [form] = Form.useForm();

    const fetchRoles = useCallback(async () => {
        /* API call commented - using mock data
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRoles(Array.isArray(data) ? data : (data.roles || []));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
        */
        // Instant loading
        setRoles(mockRoles);
        setLoading(false);
    }, [token]);

    const fetchPermissions = useCallback(async () => {
        setPermissions({});
        setGroupedPerms({});
    }, []);

    useEffect(() => {
        if (token) {
            fetchRoles();
            fetchPermissions();
        }
    }, [token, fetchRoles, fetchPermissions]);

    const handleSubmit = async (values) => {
        try {
            message.success('Neural clearance parameters re-encoded');
            setModalOpen(false);
            fetchRoles();
        } catch (err) {
            message.error('IAM logic failure');
        }
    };

    const columns = [
        {
            title: 'Clearance Level',
            key: 'name',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-sm border ${r.isSystem ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-100'}`}><SafetyOutlined /></div>
                    <div>
                        <div className="font-black text-slate-900 uppercase italic tracking-tighter">{r.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono italic">{r.roleKey || r.id?.slice(0, 8)}</div>
                    </div>
                </div>
            )
        },
        { title: 'Authority Scope', dataIndex: 'warehouseAccess', key: 'scope', render: (v) => <Tag color={v === 'all' ? 'red' : 'blue'} bordered={false} className="font-black text-[9px] uppercase italic">{v || 'ASSIGNED'}</Tag> },
        { title: 'Neural Nodes (Perms)', key: 'perms', render: (_, r) => <Badge count={r.permissions?.length || 0} showZero color="#6366f1" /> },
        { title: 'System Immutable', dataIndex: 'isSystem', key: 'sys', render: (v) => v ? <Tag icon={<LockOutlined />} color="gold" bordered={false} className="font-black text-[9px]">HARDCODED</Tag> : <Tag color="cyan" bordered={false} className="font-black text-[9px]">EVOLVABLE</Tag> },
        {
            title: 'Protocol',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => { setSelectedRole(r); form.setFieldsValue(r); setModalOpen(true); }} disabled={r.isSystem} />
                    <Button type="text" danger icon={<DeleteOutlined />} disabled={r.isSystem} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Roles</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Fine-grained access control, modular permission sets, and system-level security clearance definitions</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-100 font-bold" onClick={() => { setSelectedRole(null); form.resetFields(); setModalOpen(true); }}>
                        Engineer Layer
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Clearance Layers</div><div className="text-3xl font-black">{roles.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">System Core</div><div className="text-3xl font-black">{roles.filter(r => r.isSystem).length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Custom Ops</div><div className="text-3xl font-black">{roles.filter(r => !r.isSystem).length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-emerald-500 uppercase mb-1">Total Perm Checkpoints</div><div className="text-3xl font-black">{Object.keys(permissions).length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-2"><LockOutlined className="text-slate-400" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Security Registry</span></div>
                            <Button icon={<ReloadOutlined />} onClick={fetchRoles} />
                        </div>
                        <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} pagination={false} />
                    </div>
                </Card>

                <Modal title={selectedRole ? "Re-Encode Clearance Matrix" : "Initialize New Authority Layer"} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={900} className="role-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Row gutter={16}>
                            <Col span={10}>
                                <Form.Item label="Clearance Layer Nomenclature" name="name" rules={[{ required: true }]}><Input placeholder="External Auditor" className="h-11 rounded-xl font-bold" /></Form.Item>
                                <Form.Item label="Directive Narrative" name="description"><Input.TextArea rows={3} className="rounded-xl" /></Form.Item>
                                <Form.Item label="Spatial Scope (Warehouse Access)" name="warehouseAccess" initialValue="assigned"><Select className="h-11 rounded-xl"><Option value="all">Unrestricted (All Nodes)</Option><Option value="assigned">Confined (Assigned Nodes)</Option><Option value="none">Zero Visibility</Option></Select></Form.Item>
                            </Col>
                            <Col span={14}>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Neural Permission Lattice</div>
                                <Form.Item name="permissions" valuePropName="value">
                                    <Checkbox.Group className="w-full">
                                        <Collapse ghost className="permission-collapse">
                                            {Object.entries(groupedPerms).map(([module, perms]) => (
                                                <Panel header={<span className="font-black text-[10px] uppercase text-slate-500">{module} ({perms.length})</span>} key={module}>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {perms.map(p => (
                                                            <Checkbox key={p.key} value={p.key} className="text-[11px] font-bold text-slate-600">
                                                                {p.action} <span className="text-[9px] text-gray-300">({p.key})</span>
                                                            </Checkbox>
                                                        ))}
                                                    </div>
                                                </Panel>
                                            ))}
                                        </Collapse>
                                    </Checkbox.Group>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
