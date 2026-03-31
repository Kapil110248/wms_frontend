import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Tabs, Spin, Descriptions, Tag, Modal, Form, Input, Select, InputNumber, Switch, Table, Space, message, Badge } from 'antd';
import {
    ArrowLeftOutlined,
    EditOutlined,
    AppstoreOutlined,
    DollarOutlined,
    InboxOutlined,
    GlobalOutlined,
    BankOutlined,
    ApartmentOutlined,
    ColumnWidthOutlined,
    PictureOutlined,
    PlusOutlined,
    DeleteOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    BarChartOutlined,
    BarcodeOutlined,
    MoreOutlined,
    BoxPlotOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatCurrency, formatNumber } from '../../utils';

const { Option } = Select;
const { TextArea } = Input;

const CHANNEL_TYPES = [
    { value: 'AMAZON', label: 'Amazon' },
    { value: 'EBAY', label: 'eBay' },
    { value: 'SHOPIFY', label: 'Shopify' },
    { value: 'DIRECT', label: 'Direct' },
    { value: 'OTHER', label: 'Other' },
];
const SKU_TYPES_AMAZON = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'BB_ROTATION', label: 'BB Rotation' },
    { value: 'MFN', label: 'MFN' },
];

export default function ViewProduct() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [altSkuModalOpen, setAltSkuModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [supplierForm] = Form.useForm();
    const [altSkuForm] = Form.useForm();

    const fetchProduct = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await apiRequest(`/api/inventory/products/${id}`, { method: 'GET' }, token);
            const p = res?.data ?? res;
            if (!p) throw new Error('Product not found');
            setProduct(p);
        } catch (err) {
            setProduct(null);
            navigate('/products');
        } finally {
            setLoading(false);
        }
    }, [token, id, navigate]);

    const fetchSuppliers = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/suppliers', { method: 'GET' }, token);
            setSuppliers(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setSuppliers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchProduct();
        fetchSuppliers();
    }, [fetchProduct, fetchSuppliers]);

    const updateProductPatch = async (payload) => {
        try {
            setSaving(true);
            await apiRequest(`/api/inventory/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            }, token);
            message.success('Saved');
            fetchProduct();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleAddSupplierProduct = async (values) => {
        const list = Array.isArray(product?.supplierProducts) ? [...product.supplierProducts] : [];
        const caseCost = values.caseCost != null ? Number(values.caseCost) : null;
        const caseSize = values.caseSize != null ? Number(values.caseSize) : 1;
        const unitCost = caseCost != null && caseSize > 0 ? (caseCost / caseSize) : null;
        list.push({
            id: String(Date.now()),
            supplierId: values.supplierId,
            supplierSku: values.supplierSku?.trim() || '',
            caseSize: caseSize,
            caseCost: caseCost,
            unitCost: unitCost,
            leadTimeDays: values.leadTimeDays != null ? Number(values.leadTimeDays) : null,
            moq: values.moq != null ? Number(values.moq) : null,
            isPrimary: !!values.isPrimary,
        });
        await updateProductPatch({ supplierProducts: list });
        setSupplierModalOpen(false);
        supplierForm.resetFields();
    };

    const handleDeleteSupplierProduct = (rowId) => {
        const list = (product?.supplierProducts || []).filter((r) => r.id !== rowId);
        updateProductPatch({ supplierProducts: list });
    };

    const handleAddAlternativeSku = async (values) => {
        const list = Array.isArray(product?.alternativeSkus) ? [...product.alternativeSkus] : [];
        list.push({
            id: String(Date.now()),
            channelType: values.channelType,
            sku: values.sku?.trim() || '',
            skuType: values.skuType || null,
            isPrimary: !!values.isPrimary,
            active: values.active !== false,
            notes: values.notes?.trim() || '',
        });
        await updateProductPatch({ alternativeSkus: list });
        setAltSkuModalOpen(false);
        altSkuForm.resetFields();
    };

    const handleDeleteAlternativeSku = (rowId) => {
        const list = (product?.alternativeSkus || []).filter((r) => r.id !== rowId);
        updateProductPatch({ alternativeSkus: list });
    };

    if (loading && !product) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    if (!product) return null;

    // Safe display: 0 and numbers show, null/undefined show —
    const showNum = (v) => (v != null && v !== '') ? Number(v) : '—';
    const showStr = (v) => (v != null && String(v).trim() !== '') ? String(v).trim() : '—';

    let ms = product.marketplaceSkus;
    if (typeof ms === 'string') { try { ms = JSON.parse(ms); } catch { ms = {}; } }
    ms = (ms && typeof ms === 'object' && !Array.isArray(ms)) ? ms : {};
    const imagesRaw = product.images;
    const imagesList = Array.isArray(imagesRaw)
        ? imagesRaw
        : typeof imagesRaw === 'string'
            ? (() => { try { const a = JSON.parse(imagesRaw); return Array.isArray(a) ? a : []; } catch { return []; } })()
            : [];
    const images = imagesList.filter((url) => url && (typeof url === 'string' && (url.startsWith('data:') || url.startsWith('http'))));
    const categoryName = product.Category?.name || product.categoryId || '—';
    const supplierName = product.Supplier?.name || product.supplierId || '—';
    const cartons = product.cartons && typeof product.cartons === 'object' ? product.cartons : {};
    const priceLists = product.priceLists && typeof product.priceLists === 'object' ? product.priceLists : {};
    const costPrice = product.costPrice != null ? Number(product.costPrice) : null;
    const sellingPrice = product.price != null ? Number(product.price) : null;
    const margin =
        costPrice != null && costPrice > 0 && sellingPrice != null
            ? formatNumber(((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100) + '%'
            : '—';
    const supplierProducts = Array.isArray(product.supplierProducts) ? product.supplierProducts : [];
    const alternativeSkus = Array.isArray(product.alternativeSkus) ? product.alternativeSkus : [];
    const totalStock = (product.ProductStocks || []).reduce((s, ps) => s + (Number(ps.quantity) || 0), 0);
    const inventoryCount = (product.ProductStocks || []).length;
    const cartonsArray = Array.isArray(product.cartons)
        ? product.cartons
        : (cartons?.barcode || cartons?.unitsPerCarton || cartons?.length || cartons?.width || cartons?.height
            ? [{ barcode: cartons.barcode, caseSize: cartons.unitsPerCarton ?? cartons.caseSize, description: cartons.description }]
            : []);
    const cartonsCount = Array.isArray(product.cartons) ? product.cartons.length : (cartons.unitsPerCarton || cartons.barcode || cartons.length || cartons.width || cartons.height ? 1 : 0);

    const getSupplierName = (supplierId) => {
        if (supplierId == null) return '—';
        const s = suppliers.find((x) => x.id === supplierId);
        return s ? s.name : `ID ${supplierId}`;
    };

    const supplierColumns = [
        { title: 'Supplier', key: 'supplier', render: (_, r) => <><div className="font-medium">{getSupplierName(r.supplierId)}</div>{r.supplierId && <div className="text-xs text-gray-400">{r.supplierId}</div>}</> },
        { title: 'Supplier SKU', dataIndex: 'supplierSku', key: 'supplierSku', render: (v) => v || '—' },
        { title: 'Case Size', dataIndex: 'caseSize', key: 'caseSize', render: (v) => (v != null ? `${v} units` : '—') },
        { title: 'Case Cost', dataIndex: 'caseCost', key: 'caseCost', render: (v) => (v != null ? formatCurrency(v, product.currency || 'EUR') : '—') },
        { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', render: (v) => (v != null ? formatCurrency(v, product.currency || 'EUR') : '—') },
        { title: 'Lead Time', dataIndex: 'leadTimeDays', key: 'leadTime', render: (v) => (v != null ? `${v} days` : '—') },
        { title: 'MOQ', dataIndex: 'moq', key: 'moq', render: (v) => (v != null ? `${v} units` : '—') },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, r) => (
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteSupplierProduct(r.id)}>Delete</Button>
            ),
        },
    ];

    const altSkuColumns = [
        { title: 'Channel', dataIndex: 'channelType', key: 'channelType', render: (v) => v || '—' },
        { title: 'Alternative SKU', dataIndex: 'sku', key: 'sku', render: (v) => v || '—' },
        { title: 'SKU Type', dataIndex: 'skuType', key: 'skuType', render: (v) => v || '—' },
        { title: 'Primary', dataIndex: 'isPrimary', key: 'isPrimary', render: (v) => (v ? <Tag color="blue">Yes</Tag> : '—') },
        { title: 'Active', dataIndex: 'active', key: 'active', render: (v) => (v !== false ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>) },
        { title: 'Notes', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (v) => v || '—' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, r) => (
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteAlternativeSku(r.id)}>Delete</Button>
            ),
        },
    ];

    const tabItems = [
        {
            key: 'basic',
            label: <span><AppstoreOutlined /> Basic Info</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Product Name">{product.name}</Descriptions.Item>
                        <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
                        <Descriptions.Item label="Type">{product.productType || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={product.status === 'ACTIVE' ? 'green' : 'default'}>{product.status || '—'}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Category">{categoryName}</Descriptions.Item>
                        <Descriptions.Item label="Primary Supplier">{supplierName}</Descriptions.Item>
                        <Descriptions.Item label="Barcode">{product.barcode || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Color">{product.color || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Unit of Measure">{product.unitOfMeasure || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Description" span={2}>{product.description || '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
        },
        {
            key: 'pricing',
            label: <span><DollarOutlined /> Pricing & VAT</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Currency">{product.currency || 'EUR'}</Descriptions.Item>
                        <Descriptions.Item label="Cost Price">{costPrice != null ? formatCurrency(costPrice, product.currency || 'EUR') : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Selling Price">{sellingPrice != null ? formatCurrency(sellingPrice, product.currency || 'EUR') : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Margin">{margin}</Descriptions.Item>
                        <Descriptions.Item label="VAT Rate (%)">{product.vatRate != null ? Number(product.vatRate) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="VAT Code">{product.vatCode || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Customs Tariff">{product.customsTariff || '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
        },
        {
            key: 'cartons',
            label: <span><InboxOutlined /> Cartons ({cartonsCount})</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <h3 className="font-bold text-slate-800 mb-1">Outer Carton Configurations</h3>
                    <p className="text-gray-500 text-sm mb-4">Barcodes for full cases that automatically convert to single units when scanned during receiving.</p>
                    {cartonsArray.length === 0 ? (
                        <p className="text-gray-500 text-sm">No carton configuration.</p>
                    ) : (
                        <Table size="small" dataSource={cartonsArray} rowKey={(r, i) => r.id ?? i} pagination={false} columns={[
                            { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', render: (v) => v || '—' },
                            { title: 'Case Size (Units Inside)', dataIndex: 'caseSize', key: 'caseSize', render: (v) => (v != null ? String(v) : '—') },
                            { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v || '—' },
                        ]} />
                    )}
                </Card>
            ),
        },
        {
            key: 'pricelists',
            label: <span><DollarOutlined /> Price Lists</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <h3 className="font-bold text-slate-800 mb-2">Supplier Price Lists</h3>
                    <p className="text-gray-500 text-sm mb-4">Supplier-specific pricing (same as Edit Product).</p>
                    {supplierProducts.length === 0 ? (
                        <p className="text-gray-500 text-sm mb-4">No supplier price lists.</p>
                    ) : (
                        <Table columns={supplierColumns} dataSource={supplierProducts} rowKey="id" pagination={false} size="small" loading={saving} className="mb-4" />
                    )}
                    <h3 className="font-bold text-slate-800 mb-2">Price List Overrides</h3>
                    {!priceLists.listPrice && !priceLists.wholesalePrice && !priceLists.retailPrice && Object.keys(priceLists).length === 0 ? (
                        <p className="text-gray-500 text-sm">No price list overrides.</p>
                    ) : (
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                            <Descriptions.Item label="List Price">{priceLists.listPrice != null ? formatCurrency(priceLists.listPrice, product.currency || 'EUR') : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Wholesale Price">{priceLists.wholesalePrice != null ? formatCurrency(priceLists.wholesalePrice, product.currency || 'EUR') : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Retail Price">{priceLists.retailPrice != null ? formatCurrency(priceLists.retailPrice, product.currency || 'EUR') : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Minimum Order Price">{priceLists.minOrderPrice != null ? formatCurrency(priceLists.minOrderPrice, product.currency || 'EUR') : '—'}</Descriptions.Item>
                        </Descriptions>
                    )}
                </Card>
            ),
        },
        {
            key: 'marketplace',
            label: <span><GlobalOutlined /> Marketplace SKUs</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="HD SKU">{ms.hdSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="HD Sale SKU">{ms.hdSaleSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Warehouse ID">{ms.warehouseId || '—'}</Descriptions.Item>
                        <Descriptions.Item label="eBay ID">{ms.ebayId || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon SKU">{ms.amazonSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon SKU (Split Before)">{ms.amazonSkuSplitBefore || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon MPN SKU">{ms.amazonMpnSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon ID SKU">{ms.amazonIdSku || '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
        },
        {
            key: 'inventorySettings',
            label: <span><BankOutlined /> Inventory Settings</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Reorder Point">{showNum(product.reorderLevel)}</Descriptions.Item>
                        <Descriptions.Item label="Reorder Quantity">{showNum(product.reorderQty)}</Descriptions.Item>
                        <Descriptions.Item label="Max Stock Level">{showNum(product.maxStock)}</Descriptions.Item>
                        <Descriptions.Item label="Heat Sensitive">{showStr(product.heatSensitive)}</Descriptions.Item>
                        <Descriptions.Item label="Perishable">{showStr(product.perishable)}</Descriptions.Item>
                        <Descriptions.Item label="Require Batch Tracking">{showStr(product.requireBatchTracking)}</Descriptions.Item>
                        <Descriptions.Item label="Shelf Life (Days)">{showNum(product.shelfLifeDays)}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
        },
        {
            key: 'dimensions',
            label: <span><ColumnWidthOutlined /> Dimensions</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Length">{showNum(product.length)}</Descriptions.Item>
                        <Descriptions.Item label="Width">{showNum(product.width)}</Descriptions.Item>
                        <Descriptions.Item label="Height">{showNum(product.height)}</Descriptions.Item>
                        <Descriptions.Item label="Dimension Unit">{showStr(product.dimensionUnit)}</Descriptions.Item>
                        <Descriptions.Item label="Weight">{showNum(product.weight)}</Descriptions.Item>
                        <Descriptions.Item label="Weight Unit">{showStr(product.weightUnit)}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
        },
        {
            key: 'images',
            label: <span><PictureOutlined /> Images</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    {images.length === 0 ? (
                        <p className="text-gray-500 text-sm">No images.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {images.map((url, idx) => (
                                <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    <img src={url} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ),
        },
        {
            key: 'inventory',
            label: <span><InboxOutlined /> Inventory ({inventoryCount})</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <h3 className="font-bold text-slate-800 mb-2">Stock by Warehouse</h3>
                    <p className="text-gray-500 text-sm mb-4">Current inventory across locations.</p>
                    {(product.ProductStocks || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No stock records.</p>
                    ) : (
                        <Table size="small" dataSource={product.ProductStocks || []} rowKey="id" pagination={false} columns={[
                            { title: 'Warehouse', key: 'wh', render: (_, r) => r.Warehouse?.name || '—' },
                            { title: 'Location', key: 'loc', render: (_, r) => r.Location?.name || r.Location?.code || '—' },
                            { title: 'Quantity', dataIndex: 'quantity', key: 'qty', render: (v) => <><span className="font-medium">{formatNumber(v)}</span> <span className="text-[10px] text-gray-400 uppercase font-bold">{product.unitOfMeasure || 'EACH'}</span></> },
                        ]} />
                    )}
                </Card>
            ),
        },
        {
            key: 'expiry',
            label: <span><CalendarOutlined /> Expiry & Tracking</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <p className="text-gray-500 text-sm">Expiry and batch tracking for this product.</p>
                    <p className="text-gray-400 text-xs mt-2">No expiry records configured.</p>
                </Card>
            ),
        },
        {
            key: 'byLocation',
            label: <span><EnvironmentOutlined /> By Location</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <p className="text-gray-500 text-sm">Stock quantity by warehouse and location.</p>
                    {(product.ProductStocks || []).length === 0 ? <p className="text-gray-400 text-xs mt-2">No location data.</p> : (
                        <Table size="small" dataSource={product.ProductStocks || []} rowKey="id" pagination={false} columns={[
                            { title: 'Warehouse', key: 'wh', render: (_, r) => r.Warehouse?.name || '—' },
                            { title: 'Location', key: 'loc', render: (_, r) => r.Location?.name || r.Location?.code || '—' },
                            { title: 'Quantity', dataIndex: 'quantity', key: 'qty', render: (v) => <><span className="font-medium">{formatNumber(v)}</span> <span className="text-[10px] text-gray-400 uppercase font-bold">{product.unitOfMeasure || 'EACH'}</span></> },
                        ]} />
                    )}
                </Card>
            ),
        },
        {
            key: 'history',
            label: <span><ClockCircleOutlined /> History (0)</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <p className="text-gray-500 text-sm">Movement and change history for this product.</p>
                    <p className="text-gray-400 text-xs mt-2">No history records.</p>
                </Card>
            ),
        },
        {
            key: 'analytics',
            label: <span><BarChartOutlined /> Analytics</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <p className="text-gray-500 text-sm">Sales and movement analytics.</p>
                    <p className="text-gray-400 text-xs mt-2">Analytics coming soon.</p>
                </Card>
            ),
        },
        {
            key: 'barcodes',
            label: <span><BarcodeOutlined /> Barcodes</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Product Barcode">{product.barcode || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Carton Barcode(s)">{cartonsArray.length > 0 ? cartonsArray.map((c) => c.barcode || '—').join(', ') || '—' : (cartons?.barcode || '—')}</Descriptions.Item>
                    </Descriptions>
                </Card>
            ),
        },
        {
            key: 'supplier',
            label: <span><ApartmentOutlined /> Supplier Products {supplierProducts.length ? `(${supplierProducts.length})` : '(0)'}</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800">Supplier Products</h3>
                            <p className="text-gray-500 text-sm">Manage supplier relationships, SKUs, and pricing for this product.</p>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSupplierModalOpen(true)} className="bg-blue-600 border-blue-600">Add Supplier Product</Button>
                    </div>
                    <Table columns={supplierColumns} dataSource={supplierProducts} rowKey="id" pagination={false} size="small" loading={saving} />
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm text-gray-600">
                        <div className="font-semibold text-slate-700 mb-2">Supplier Products Help:</div>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Link this product to multiple suppliers with their specific SKUs</li>
                            <li>Track case sizes and costs from each supplier</li>
                            <li>Set one supplier as &quot;Primary&quot; for default ordering</li>
                            <li>Monitor lead times and minimum order quantities (MOQ)</li>
                        </ul>
                    </div>
                </Card>
            ),
        },
        {
            key: 'altSkus',
            label: <span><GlobalOutlined /> Alternative SKUs {alternativeSkus.length ? `(${alternativeSkus.length})` : '(0)'}</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800">Marketplace & Channel SKUs</h3>
                            <p className="text-gray-500 text-sm">Manage alternative SKUs for different sales channels (Amazon, Shopify, eBay, etc.)</p>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAltSkuModalOpen(true)} className="bg-blue-600 border-blue-600">Add Alternative SKU</Button>
                    </div>
                    {alternativeSkus.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <GlobalOutlined className="text-3xl text-slate-400" />
                            </div>
                            <p className="text-gray-500 font-medium mb-2">No alternative SKUs configured</p>
                            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setAltSkuModalOpen(true)} className="bg-blue-600 border-blue-600">Add First Alternative SKU</Button>
                        </div>
                    ) : (
                        <Table columns={altSkuColumns} dataSource={alternativeSkus} rowKey="id" pagination={false} size="small" loading={saving} />
                    )}
                    <div className="mt-6 p-4 bg-slate-50 rounded-xl text-sm text-gray-600 border border-slate-100">
                        <div className="font-semibold text-slate-700 mb-2">Amazon 3-SKU System Example</div>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>Normal SKU:</strong> OL_SEL_10_PR (main listing)</li>
                            <li><strong>BB Rotation:</strong> OL_SEL_10_PR_BB (for stock rotation with different best-before dates)</li>
                            <li><strong>MFN:</strong> OL_SEL_10_PR_M (merchant fulfilled network – backup when FBA stock runs out)</li>
                        </ul>
                    </div>
                </Card>
            ),
        },
        product.productType === 'PRODUCTION' && {
            key: 'manufacturing',
            label: <span><BoxPlotOutlined /> Manufacturing & Formulas</span>,
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800">Production Formulas / BOM</h3>
                            <p className="text-gray-500 text-sm">Define how this product is manufactured from raw materials.</p>
                        </div>
                        <Link to="/production/formulas">
                            <Button type="primary" icon={<EditOutlined />} className="bg-blue-600 border-blue-600">Manage Formulas</Button>
                        </Link>
                    </div>
                    
                    {!product.ProductionFormulas || product.ProductionFormulas.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <BoxPlotOutlined className="text-4xl text-gray-300 mb-4" />
                            <p className="text-gray-500">No manufacturing formulas defined for this product.</p>
                            <Link to="/production/formulas" className="mt-4">
                                <Button type="primary" size="large">Create First Formula</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {product.ProductionFormulas.map(formula => (
                                <div key={formula.id} className={`p-4 rounded-xl border ${formula.isDefault ? 'border-blue-200 bg-blue-50/20' : 'border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">{formula.name}</span>
                                            {formula.isDefault && <Tag color="blue">Default Formula</Tag>}
                                        </div>
                                        <Tag color={formula.status === 'ACTIVE' ? 'green' : 'orange'}>{formula.status}</Tag>
                                    </div>
                                    <Table 
                                        size="small" 
                                        dataSource={formula.ProductionFormulaItems || []} 
                                        rowKey="id" 
                                        pagination={false}
                                        columns={[
                                            { title: 'Raw Material', key: 'rm', render: (_, r) => <div><div className="font-medium">{r.RawMaterial?.name || 'Unknown'}</div><div className="text-xs text-gray-400">{r.RawMaterial?.sku}</div></div> },
                                            { title: 'Quantity Per Unit', dataIndex: 'quantityPerUnit', key: 'qty', render: (v, r) => `${v} ${r.unit}` },
                                            { title: 'Source Warehouse', key: 'wh', render: (_, r) => r.Warehouse?.name || '—' },
                                            { title: 'Wastage', dataIndex: 'wastagePercentage', key: 'waste', render: v => v ? `${v}%` : '0%' }
                                        ]}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="w-full space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/products" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                            <ArrowLeftOutlined /> Back
                        </Link>
                    </div>
                    <Link to={`/products/${id}/edit`}>
                        <Button type="primary" size="large" icon={<EditOutlined />} className="rounded-xl px-6 h-11 font-bold bg-blue-600 border-blue-600">
                            Edit Product
                        </Button>
                    </Link>
                </div>

                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{product.name}</h1>
                    <p className="text-gray-600 font-medium mt-1">SKU: {product.sku}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card size="small" className="rounded-xl"><Tag color={product.status === 'ACTIVE' ? 'green' : 'default'} className="text-sm font-bold">Status: {product.status || '—'}</Tag></Card>
                    <Card size="small" className="rounded-xl"><div className="text-xs text-gray-500">Total Stock</div><div className="text-lg font-bold">{formatNumber(totalStock)} <span className="text-xs text-gray-400 uppercase font-medium">{product.unitOfMeasure || 'units'}</span></div></Card>
                    <Card size="small" className="rounded-xl"><div className="text-xs text-gray-500">Cost Price</div><div className="text-lg font-bold">{costPrice != null ? formatCurrency(costPrice, product.currency || 'EUR') : '—'}</div></Card>
                    <Card size="small" className="rounded-xl"><div className="text-xs text-gray-500">Selling Price</div><div className="text-lg font-bold">{sellingPrice != null ? formatCurrency(sellingPrice, product.currency || 'EUR') : '—'}</div></Card>
                </div>

                <Tabs
                    defaultActiveKey="basic"
                    type="card"
                    className="view-product-tabs"
                    items={tabItems.filter(Boolean)}
                    moreIcon={
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm border border-slate-200 shadow-sm">
                            <MoreOutlined className="text-base" />
                            More tabs
                        </span>
                    }
                />

                <Modal title="Add Supplier Product" open={supplierModalOpen} onCancel={() => { setSupplierModalOpen(false); supplierForm.resetFields(); }} onOk={() => supplierForm.submit()} okButtonProps={{ loading: saving }} width={520}>
                    <Form form={supplierForm} layout="vertical" onFinish={handleAddSupplierProduct} className="pt-4">
                        <Form.Item name="supplierId" label="Supplier" rules={[{ required: true, message: 'Select supplier' }]}>
                            <Select placeholder="Select supplier" className="w-full" size="large" showSearch optionFilterProp="label">
                                {suppliers.map((s) => <Option key={s.id} value={s.id} label={s.name}>{s.name}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name="supplierSku" label="Supplier SKU" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="e.g., SUP_12345" size="large" />
                        </Form.Item>
                        <Form.Item name="caseSize" label="Case Size" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={1} className="w-full" size="large" placeholder="e.g., 24" />
                        </Form.Item>
                        <Form.Item name="caseCost" label="Case Cost (£)">
                            <InputNumber min={0} step={0.00000001} className="w-full" size="large" placeholder="0" addonBefore="£" />
                        </Form.Item>
                        <Form.Item name="leadTimeDays" label="Lead Time (days)">
                            <InputNumber min={0} className="w-full" size="large" placeholder="e.g., 7" />
                        </Form.Item>
                        <Form.Item name="moq" label="MOQ (Minimum Order Quantity)">
                            <InputNumber min={0} className="w-full" size="large" placeholder="e.g., 100" />
                        </Form.Item>
                        <Form.Item name="isPrimary" label="Primary Supplier" valuePropName="checked" initialValue={false}>
                            <Switch />
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal title="Add Alternative SKU" open={altSkuModalOpen} onCancel={() => { setAltSkuModalOpen(false); altSkuForm.resetFields(); }} onOk={() => altSkuForm.submit()} okButtonProps={{ loading: saving }} width={520}>
                    <Form form={altSkuForm} layout="vertical" onFinish={handleAddAlternativeSku} className="pt-4">
                        <Form.Item name="channelType" label="Channel Type" rules={[{ required: true, message: 'Select channel' }]}>
                            <Select placeholder="Select marketplace/channel" className="w-full" size="large" options={CHANNEL_TYPES} />
                        </Form.Item>
                        <Form.Item name="sku" label="Alternative SKU" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="e.g., OL_SEL_10_PR or FFD_OL_SEL_10_PR" size="large" />
                        </Form.Item>
                        <Form.Item name="skuType" label="SKU Type (for Amazon)">
                            <Select placeholder="Optional - select if Amazon SKU" className="w-full" size="large" allowClear options={SKU_TYPES_AMAZON} />
                        </Form.Item>
                        <Form.Item name="isPrimary" label="Primary SKU for this channel" valuePropName="checked" initialValue={false}>
                            <Switch />
                        </Form.Item>
                        <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
                            <Switch />
                        </Form.Item>
                        <Form.Item name="notes" label="Notes">
                            <TextArea rows={3} placeholder="Optional notes about this SKU..." />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
