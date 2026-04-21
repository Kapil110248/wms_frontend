import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Modal, Form, DatePicker, InputNumber, message, Tabs, Popconfirm, Drawer, List, Divider } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    FilterOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    MinusCircleOutlined,
    PrinterOutlined,
    HomeOutlined,
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import dayjs from 'dayjs';

const { Search } = Input;

export default function PurchaseOrders() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [supplierFilter, setSupplierFilter] = useState(undefined);
    const [printPO, setPrintPO] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [mergingIds, setMergingIds] = useState([]);

    useEffect(() => {
        if (!printPO) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.warning('Allow popups to print.');
            setPrintPO(null);
            return;
        }
        
        const totalQty = (printPO.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        
        const items = (printPO.items || [])
            .map(
                (item, index) =>
                    `<tr>
                        <td style="border-bottom:1px solid #f1f5f9;padding:18px 12px;text-align:center;color:#94a3b8;font-weight:600">${index + 1}</td>
                        <td style="border-bottom:1px solid #f1f5f9;padding:18px 12px">
                            <div style="font-weight:600;color:#0f172a">${(item.productName ?? '—').replace(/</g, '&lt;')}</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:monospace;">SKU: ${(item.productSku ?? '—').replace(/</g, '&lt;')}</div>
                        </td>
                        <td style="border-bottom:1px solid #f1f5f9;padding:18px 12px;text-align:center;font-weight:700;color:#0f172a">${item.quantity ?? 0}</td>
                        <td style="border-bottom:1px solid #f1f5f9;padding:18px 12px;text-align:right;color:#64748b">${formatCurrency(item.unitPrice ?? 0)}</td>
                        <td style="border-bottom:1px solid #f1f5f9;padding:18px 12px;text-align:right;font-weight:800;color:#0f172a">${formatCurrency(item.totalPrice ?? 0)}</td>
                    </tr>`
            )
            .join('');

        const notesHtml = printPO.notes
            ? `<div style="margin-top:24px;padding:24px;background:#f8fafc;border-radius:16px;border:1px solid #f1f5f9">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;font-weight:800;margin-bottom:8px">Notes / Special Instructions</div>
                <div style="font-size:13px;color:#475569;line-height:1.6">${String(printPO.notes).replace(/</g, '&lt;')}</div>
               </div>`
            : '';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Purchase Order - ${printPO.poNumber}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
                    body { font-family: 'Outfit', sans-serif; padding: 0; margin: 0; color: #1e293b; line-height: 1.6; background: #fff; }
                    .page-container { padding: 60px 40px; position: relative; }
                    .accent-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #3b82f6; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
                    .brand { font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -0.04em; }
                    .slogan { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; font-weight: 600; }
                    .order-num-large { font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
                    .info-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; }
                    .section-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
                    .card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; }
                    thead th { background: #0f172a; color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 14px 12px; text-align: left; }
                    .summary-container { margin-top: 30px; display: flex; justify-content: flex-end; }
                    .summary-box { width: 260px; background: #f8fafc; padding: 20px; border-radius: 12px; }
                    .total-val { font-size: 20px; font-weight: 800; color: #3b82f6; }
                    .footer { margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <div class="accent-bar"></div>
                    <div class="header">
                        <div>
                            <div class="brand">MAVIE</div>
                            <div class="slogan">Warehouse Management</div>
                        </div>
                        <div style="text-align:right">
                            <div style="font-size:10px; font-weight:800; color:#3b82f6; text-transform:uppercase; letter-spacing:0.1em">Purchase Order</div>
                            <div class="order-num-large">#${printPO.poNumber}</div>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-card">
                            <div class="section-label">Supplier</div>
                            <div class="card-title">${printPO.supplier}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:4px">Issued: ${formatDate(printPO.orderDate)}</div>
                        </div>
                        <div class="info-card">
                            <div class="section-label">Destination</div>
                            <div class="card-title">${printPO.warehouse}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:4px">Target: ${formatDate(printPO.expectedDelivery) || 'ASAP'}</div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr><th style="width:40px">#</th><th>Item Description</th><th style="width:70px;text-align:center">Qty</th><th style="width:100px;text-align:right">Rate</th><th style="width:120px;text-align:right">Total</th></tr>
                        </thead>
                        <tbody>${items}</tbody>
                    </table>
                    <div class="summary-container">
                        <div class="summary-box">
                            <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:8px">
                                <span>Total Quantity</span><span>${totalQty} Units</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed #e2e8f0;padding-top:10px">
                                <span style="font-weight:800;font-size:12px">GRAND TOTAL</span>
                                <span class="total-val">${formatCurrency(printPO.totalAmount ?? 0)}</span>
                            </div>
                        </div>
                    </div>
                    ${notesHtml}
                    <div class="footer">
                        <p style="font-size:10px;color:#94a3b8">System Generated Document • No signature required • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        const timer = setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
            setPrintPO(null);
        }, 350);
        return () => clearTimeout(timer);
    }, [printPO]);

    const poStatusColor = (s) => {
        const t = (s || '').toUpperCase();
        if (t === 'PENDING' || t === 'DRAFT') return 'orange';
        if (t === 'APPROVED') return 'green';
        if (t === 'RECEIVED' || t === 'COMPLETED') return 'green';
        return 'default';
    };

    const fetchPurchaseOrders = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const [poRes, supRes, prodRes, whRes] = await Promise.all([
                apiRequest('/api/purchase-orders', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/suppliers', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/inventory/products', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/warehouses', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const list = Array.isArray(poRes.data) ? poRes.data : [];
            setPurchaseOrders(list.map((po) => ({
                id: po.id,
                poNumber: po.poNumber,
                supplier: po.Supplier?.name || po.supplierName || '-',
                supplierId: po.supplierId,
                status: (po.status || 'pending').toUpperCase(),
                totalAmount: Number(po.totalAmount) || 0,
                orderDate: po.createdAt || po.expectedDelivery,
                expectedDelivery: po.expectedDelivery,
                warehouse: po.Warehouse?.name || '-',
                warehouseId: po.warehouseId,
                notes: po.notes,
                items: (po.PurchaseOrderItems || []).map((i) => ({
                    productId: i.productId,
                    productName: i.productName || i.Product?.name,
                    productSku: i.productSku || i.Product?.sku,
                    quantity: i.quantity,
                    unitPrice: Number(i.unitPrice) || 0,
                    totalPrice: Number(i.totalPrice) || 0,
                })),
            })));
            setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
        } catch (_) {
            setPurchaseOrders([]);
            setSuppliers([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    const [productSelectValue, setProductSelectValue] = useState(undefined);

    const addItem = (product) => {
        const existingItem = selectedItems.find(item => item.productId === product.id);
        if (existingItem) {
            setSelectedItems(selectedItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
                    : item
            ));
        } else {
            const unitPrice = Number(product.costPrice ?? product.price ?? 0);
            setSelectedItems([...selectedItems, {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: 1,
                unitPrice,
                totalPrice: unitPrice,
                isBundle: product.type === 'BUNDLE',
            }]);
        }
        setProductSelectValue(undefined);
    };

    const removeItem = (productId) => {
        setSelectedItems(selectedItems.filter(item => item.productId !== productId));
    };

    const updateItemQuantity = (productId, quantity) => {
        setSelectedItems(selectedItems.map(item =>
            item.productId === productId
                ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
                : item
        ));
    };

    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    };

    const calculateTotalQuantity = () => {
        return selectedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    };

    const handleSubmit = async (values) => {
        if (!token) {
            message.error('Login required');
            return;
        }
        if (!selectedItems.length) {
            message.error('Add at least one product');
            return;
        }
        try {
            const payload = {
                supplierId: Number(values.supplierId),
                warehouseId: Number(values.warehouseId),
                expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
                notes: values.notes || undefined,
                items: selectedItems.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    productSku: item.productSku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            };
            await apiRequest('/api/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Purchase order created successfully!');
            
            // [NEW] Delete original orders that were combined
            if (mergingIds.length > 0) {
                console.log('[DEBUG] Deleting combined source orders:', mergingIds);
                for (const id of mergingIds) {
                    try {
                        await apiRequest(`/api/purchase-orders/${id}`, { method: 'DELETE' }, token);
                    } catch (e) {
                        console.error(`Failed to delete source PO ${id}:`, e);
                    }
                }
            }
            
            setModalOpen(false);
            form.resetFields();
            setSelectedItems([]);
            setMergingIds([]);
            setSelectedRowKeys([]);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create purchase order');
        }
    };

    const handleEdit = async (record) => {
        try {
            setSelectedPO(record);
            setSelectedItems((record.items || []).map((i) => ({
                productId: i.productId,
                productName: i.productName,
                productSku: i.productSku,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: (i.quantity || 0) * (i.unitPrice || 0),
            })));
            editForm.setFieldsValue({
                supplierId: record.supplierId,
                warehouseId: record.warehouseId,
                expectedDelivery: record.expectedDelivery ? dayjs(record.expectedDelivery) : null,
                notes: record.notes,
            });
            setEditModalOpen(true);
        } catch (err) {
            message.error('Failed to load details');
        }
    };

    const handleEditSubmit = async (values) => {
        if (!selectedPO?.id || !token) return;
        if (!selectedItems.length) {
            message.error('Add at least one product');
            return;
        }
        try {
            const payload = {
                supplierId: Number(values.supplierId),
                warehouseId: Number(values.warehouseId),
                expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
                notes: values.notes || undefined,
                items: selectedItems.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    productSku: item.productSku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            };
            await apiRequest(`/api/purchase-orders/${selectedPO.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
            message.success('Purchase order updated!');
            setEditModalOpen(false);
            editForm.resetFields();
            setSelectedPO(null);
            setSelectedItems([]);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Update failed');
        }
    };

    const handleCombineOrders = async () => {
        if (selectedRowKeys.length < 2) {
            message.warning('Please select at least 2 orders to combine.');
            return;
        }

        const selectedPOs = purchaseOrders.filter(po => selectedRowKeys.includes(po.id));
        const firstSupplierId = selectedPOs[0].supplierId;
        const sameSupplier = selectedPOs.every(po => po.supplierId === firstSupplierId);

        if (!sameSupplier) {
            message.error('Selection failed: All selected orders must be from the same supplier.');
            return;
        }

        // Check if all are pending/draft (usually you only combine unapproved orders)
        const allPending = selectedPOs.every(po => ['PENDING', 'DRAFT'].includes(po.status));
        if (!allPending) {
            message.warning('Only pending or draft orders can be combined.');
            return;
        }

        // Merge items
        const mergedItemsMap = new Map();
        selectedPOs.forEach(po => {
            (po.items || []).forEach(item => {
                const existing = mergedItemsMap.get(item.productId);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.totalPrice += item.totalPrice;
                } else {
                    mergedItemsMap.set(item.productId, { ...item });
                }
            });
        });

        const mergedItems = Array.from(mergedItemsMap.values());
        
        // Show confirmation or just go to modal?
        // Let's populate the creation modal with these items
        setSelectedItems(mergedItems);
        const poNumbersText = selectedPOs.map(p => p.poNumber).join(', ');
        form.setFieldsValue({
            supplierId: firstSupplierId,
            warehouseId: selectedPOs[0].warehouseId,
            notes: `Combined from POs: ${poNumbersText}`,
        });
        setMergingIds(selectedRowKeys);
        setModalOpen(true);
        message.info(`Consolidating ${selectedPOs.length} orders into a new unified purchase order for ${selectedPOs[0].supplier}.`);
    };

    const handleAction = async (id, action) => {
        if (!token) return;
        try {
            if (action === 'approve') {
                await apiRequest(`/api/purchase-orders/${id}/approve`, { method: 'POST' }, token);
            }
            message.success(`PO ${action} successful!`);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!token) {
            message.error('Login required');
            return;
        }
        if (id == null || id === undefined) {
            message.error('Invalid purchase order');
            return;
        }
        try {
            await apiRequest(`/api/purchase-orders/${id}`, { method: 'DELETE' }, token);
            message.success('Purchase order deleted');
            setDetailDrawerOpen(false);
            setSelectedPO(null);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Delete failed');
        }
    };

    const filteredPOs = purchaseOrders.filter((po) => {
        if (activeTab !== 'all') {
            const t = (po.status || '').toUpperCase();
            if (activeTab === 'Pending' && t !== 'PENDING' && t !== 'DRAFT') return false;
            if (activeTab === 'Approved' && t !== 'APPROVED') return false;
            if (activeTab === 'Received' && t !== 'RECEIVED' && t !== 'COMPLETED') return false;
        }
        if (searchText) {
            const q = searchText.toLowerCase();
            if (!(po.poNumber || '').toLowerCase().includes(q) && !(po.supplier || '').toLowerCase().includes(q)) return false;
        }
        if (supplierFilter != null && po.supplierId !== supplierFilter) return false;
        return true;
    });

    const columns = [
        { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 120, render: (v) => <span className="font-medium text-blue-600">{v}</span> },
        { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 160 },
        { title: 'Destination', dataIndex: 'warehouse', key: 'warehouse', width: 150, render: (v) => <Tag color="blue">{v}</Tag> },
        {
            title: 'Products',
            key: 'products',
            width: 220,
            ellipsis: true,
            render: (_, r) => {
                const names = (r.items || []).map((i) => i.productName || i.productSku || `Product #${i.productId}`).filter(Boolean);
                if (names.length === 0) return '—';
                if (names.length <= 2) return names.join(', ');
                return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
            },
        },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s) => <Tag color={poStatusColor(s)}>{s}</Tag> },
        { title: 'Items', key: 'items', width: 80, align: 'center', render: (_, r) => (r.items || []).length },
        { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', width: 120, render: (v, r) => formatCurrency(v, r.currency) },
        { title: 'Order Date', dataIndex: 'orderDate', key: 'orderDate', width: 120, render: (v) => formatDate(v) },
        { title: 'Expected Delivery', dataIndex: 'expectedDelivery', key: 'expectedDelivery', width: 130, render: (v) => formatDate(v) ?? '—' },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, record) => {
                const isPending = ['PENDING', 'DRAFT'].includes((record.status || '').toUpperCase());
                return (
                    <Space size="small" wrap>
                        <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0" onClick={() => { setSelectedPO(record); setDetailDrawerOpen(true); }}>View</Button>
                        <Button type="link" size="small" icon={<PrinterOutlined />} className="text-blue-600 p-0" onClick={() => setPrintPO(record)}>Print</Button>
                        <Button type="link" size="small" icon={<EditOutlined />} className="text-blue-600 p-0" onClick={() => handleEdit(record)}>Edit</Button>
                        {isPending && <Popconfirm title="Approve this PO?" onConfirm={() => handleAction(record.id, 'approve')} okText="Yes" cancelText="No"><Button type="link" size="small" className="text-green-600 p-0">Approve</Button></Popconfirm>}
                        <Popconfirm title="Delete this purchase order?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(record.id)}>
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const pendingCount = purchaseOrders.filter((x) => ['PENDING', 'DRAFT'].includes((x.status || '').toUpperCase())).length;
    const approvedCount = purchaseOrders.filter((x) => (x.status || '').toUpperCase() === 'APPROVED').length;
    const receivedCount = purchaseOrders.filter((x) => ['RECEIVED', 'COMPLETED'].includes((x.status || '').toUpperCase())).length;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-medium text-blue-600">Purchase Orders</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage supplier purchase orders and procurement.</p>
                    </div>
                    <Space>
                        <Button 
                            icon={<ShoppingCartOutlined />} 
                            disabled={selectedRowKeys.length < 2}
                            onClick={handleCombineOrders}
                            className={selectedRowKeys.length >= 2 ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : ""}
                        >
                            Combine Orders ({selectedRowKeys.length})
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setModalOpen(true); form.resetFields(); setSelectedItems([]); setProductSelectValue(undefined); }}>
                            Create PO
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Total POs</div>
                        <div className="text-xl font-medium text-blue-600">{purchaseOrders.length}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Pending</div>
                        <div className="text-xl font-medium text-red-600">{pendingCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Approved</div>
                        <div className="text-xl font-medium text-green-600">{approvedCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Received</div>
                        <div className="text-xl font-medium text-red-600">{receivedCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="[&_.ant-tabs-nav]:mb-4"
                        items={[
                            { key: 'all', label: `All Orders (${purchaseOrders.length})` },
                            { key: 'Pending', label: `Pending (${pendingCount})` },
                            { key: 'Approved', label: `Approved (${approvedCount})` },
                            { key: 'Received', label: `Received (${receivedCount})` },
                        ]}
                    />
                    <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
                        <Search placeholder="Search POs..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="max-w-xs rounded-lg" prefix={<SearchOutlined />} allowClear />
                        <Select placeholder="Supplier" allowClear value={supplierFilter} onChange={setSupplierFilter} className="w-48 rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                        <Button icon={<FilterOutlined />} className="rounded-lg">More Filters</Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchPurchaseOrders} loading={loading} className="rounded-lg">Refresh</Button>
                    </div>
                    <Table 
                        rowSelection={{
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys),
                        }}
                        columns={columns} 
                        dataSource={filteredPOs} 
                        rowKey="id" 
                        loading={loading} 
                        pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} orders`, pageSize: 20 }} 
                        className="[&_.ant-table-thead_th]:font-normal" 
                        scroll={{ x: 900 }} 
                    />
                </Card>

                {/* Create PO Modal */}
                <Modal title="Create Purchase Order" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={720} className="rounded-xl">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Supplier" name="supplierId">
                                <Select placeholder="Select supplier" allowClear className="rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                            </Form.Item>
                            <Form.Item label="Expected Delivery Date" name="expectedDelivery">
                                <DatePicker placeholder="Select date" className="w-full rounded-lg" format="MM/DD/YYYY" />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <Form.Item label="Destination Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select destination' }]}>
                                <Select placeholder="Select warehouse" className="rounded-lg" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                            </Form.Item>
                        </div>
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 mt-2">
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                                <ShoppingCartOutlined /> Add Products (select by name or SKU)
                            </h4>
                            <Select showSearch placeholder="Search by product name or SKU, then select..." allowClear value={productSelectValue} onChange={(val) => { if (val) { const p = products.find((x) => x.id === val); if (p) addItem(p); } }} onClear={() => setProductSelectValue(undefined)} className="w-full rounded-lg mb-4" optionFilterProp="label" filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={products.map((p) => ({ value: p.id, label: `${p.name || 'Unnamed'} (SKU: ${p.sku || '—'})` }))} />
                            {selectedItems.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="text-xs text-gray-500 font-medium uppercase">Selected products</div>
                                    {selectedItems.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">{item.productName || `Product #${item.productId}`}</div>
                                                <div className="text-xs text-gray-500">SKU: {item.productSku || '—'}</div>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs text-gray-500 whitespace-nowrap">Qty (units)</span>
                                                <InputNumber min={1} value={item.quantity} onChange={(v) => updateItemQuantity(item.productId, v || 1)} className="w-20 rounded-lg" />
                                            </div>
                                            <span className="text-gray-500 whitespace-nowrap">x {formatCurrency(item.unitPrice)}</span>
                                            <span className="font-medium w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                                            <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeItem(item.productId)} />
                                        </div>
                                    ))}
                                    <div className="flex flex-col items-end pt-2 border-t border-gray-200 mt-2">
                                        <div className="text-gray-500 text-xs">Total Quantity: <span className="font-bold text-gray-800">{calculateTotalQuantity()} Units</span></div>
                                        <div className="text-lg font-bold text-blue-600 mt-1">Order Total: {formatCurrency(calculateTotal())}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-gray-400 text-sm">No products added yet. Search and select above.</div>
                            )}
                        </div>
                        <Form.Item label="Notes (Optional)" name="notes" className="mt-4">
                            <Input.TextArea rows={3} placeholder="Add any notes..." className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => setModalOpen(false)} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">Create</Button>
                        </div>
                    </Form>
                </Modal>

                {/* Edit PO Modal */}
                <Modal
                    title="Edit Purchase Order"
                    open={editModalOpen}
                    onCancel={() => {
                        setEditModalOpen(false);
                        editForm.resetFields();
                        setSelectedPO(null);
                        setSelectedItems([]);
                        setProductSelectValue(undefined);
                    }}
                    footer={null}
                    width={720}
                    className="rounded-xl"
                >
                    <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} className="pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Supplier" name="supplierId">
                                <Select placeholder="Select supplier" allowClear className="rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                            </Form.Item>
                            <Form.Item label="Expected Delivery Date" name="expectedDelivery">
                                <DatePicker placeholder="Select date" className="w-full rounded-lg" format="MM/DD/YYYY" />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <Form.Item label="Destination Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select destination' }]}>
                                <Select placeholder="Select warehouse" className="rounded-lg" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                            </Form.Item>
                        </div>
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 mt-2">
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                                <ShoppingCartOutlined /> Add Products (select by name or SKU)
                            </h4>
                            <Select showSearch placeholder="Search by product name or SKU, then select..." allowClear value={productSelectValue} onChange={(val) => { if (val) { const p = products.find((x) => x.id === val); if (p) addItem(p); } }} onClear={() => setProductSelectValue(undefined)} className="w-full rounded-lg mb-4" optionFilterProp="label" filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={products.map((p) => ({ value: p.id, label: `${p.name || 'Unnamed'} (SKU: ${p.sku || '—'})` }))} />
                            {selectedItems.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="text-xs text-gray-500 font-medium uppercase">Selected products</div>
                                    {selectedItems.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">{item.productName || `Product #${item.productId}`}</div>
                                                <div className="text-xs text-gray-500">SKU: {item.productSku || '—'}</div>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs text-gray-500 whitespace-nowrap">Qty (units)</span>
                                                <InputNumber min={1} value={item.quantity} onChange={(v) => updateItemQuantity(item.productId, v || 1)} className="w-20 rounded-lg" />
                                            </div>
                                            <span className="text-gray-500 whitespace-nowrap">x {formatCurrency(item.unitPrice)}</span>
                                            <span className="font-medium w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                                            <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeItem(item.productId)} />
                                        </div>
                                    ))}
                                    <div className="flex flex-col items-end pt-2 border-t border-gray-200 mt-2">
                                        <div className="text-gray-500 text-xs">Total Quantity: <span className="font-bold text-gray-800">{calculateTotalQuantity()} Units</span></div>
                                        <div className="text-lg font-bold text-blue-600 mt-1">Order Total: {formatCurrency(calculateTotal())}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-gray-400 text-sm">No products added yet. Search and select above.</div>
                            )}
                        </div>
                        <Form.Item label="Notes (Optional)" name="notes" className="mt-4">
                            <Input.TextArea rows={3} placeholder="Add any notes..." className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setEditModalOpen(false); editForm.resetFields(); setSelectedPO(null); setSelectedItems([]); setProductSelectValue(undefined); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">Update</Button>
                        </div>
                    </Form>
                </Modal>

                {/* Detail Drawer */}
                <Drawer title={`PO Details: ${selectedPO?.poNumber}`} width={600} open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} className="rounded-l-3xl">
                    {selectedPO && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center"><Tag color={poStatusColor(selectedPO.status)}>{selectedPO.status}</Tag><span className="font-mono text-gray-400">{formatDate(selectedPO.orderDate)}</span></div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <div className="text-gray-400 text-xs font-bold uppercase mb-2">Supplier Info</div>
                                <div className="text-xl font-bold text-slate-800">{selectedPO.supplier}</div>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mt-3">
                                <div className="text-blue-400 text-xs font-bold uppercase mb-2">Destination Tracking</div>
                                <div className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                    <HomeOutlined /> {selectedPO.warehouse}
                                </div>
                            </div>
                            <List dataSource={selectedPO.items || []} renderItem={item => (
                                <List.Item className="px-0 flex justify-between">
                                    <div>
                                        <div className="font-bold">{item.productName || item.productSku || `Product #${item.productId}`}</div>
                                        <div className="text-xs text-gray-400">SKU: {item.productSku || '—'} · Qty: {item.quantity} x {formatCurrency(item.unitPrice)}</div>
                                    </div>
                                    <div className="font-black text-blue-600">{formatCurrency(item.totalPrice)}</div>
                                </List.Item>
                            )} />
                            <Divider />
                            <div className="flex justify-between items-center"><span className="text-lg font-bold text-slate-600">Total Purchase Value</span><span className="text-2xl font-black text-slate-900">{formatCurrency(selectedPO.totalAmount)}</span></div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
