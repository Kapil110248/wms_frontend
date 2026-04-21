import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Select, InputNumber, Button, message, Upload, Row, Col, Checkbox } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatNumber } from '../../utils';
import CategoryModal from '../../components/modals/CategoryModal';
import SupplierModal from '../../components/modals/SupplierModal';
import LocationModal from '../../components/modals/LocationModal';

const { Option } = Select;
const { TextArea } = Input;

const MAX_IMAGES = 20;
const MAX_FILE_SIZE_MB = 5;
const ACCEPT_IMAGES = '.jpg,.jpeg,.png,.gif,.webp';

const YES_NO_OPTIONS = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const UOM_OPTIONS = [
    { value: 'EACH', label: 'Each (pcs)' },
    { value: 'BOX', label: 'Box' },
    { value: 'KG', label: 'kg (kilogram)' },
    { value: 'G', label: 'g (gram)' },
    { value: 'L', label: 'L (litre)' },
    { value: 'ML', label: 'ml (millilitre)' },
    { value: 'M', label: 'm (metre)' },
];
const DIMENSION_UNITS = [{ value: 'cm', label: 'Centimeters' }, { value: 'm', label: 'Meters' }, { value: 'in', label: 'Inches' }];
const WEIGHT_UNITS = [{ value: 'kg', label: 'Kilograms' }, { value: 'g', label: 'Grams' }, { value: 'lb', label: 'Pounds' }];
const CURRENCY_OPTIONS = [
    { value: 'EUR', label: '€ Euro', symbol: '€' },
    { value: 'USD', label: '$ US Dollar', symbol: '$' },
    { value: 'GBP', label: '£ British Pound', symbol: '£' },
    { value: 'INR', label: '₹ Indian Rupee', symbol: '₹' },
];

export default function AddProduct() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [imageList, setImageList] = useState([]);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locations, setLocations] = useState([]);
    const [products, setProducts] = useState([]);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setProducts([]);
        }
    }, [token]);

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/categories', { method: 'GET' }, token);
            setCategories(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setCategories([]);
        }
    }, [token]);

    const fetchSuppliers = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/suppliers', { method: 'GET' }, token);
            setSuppliers(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setSuppliers([]);
        }
    }, [token]);

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setWarehouses([]);
        }
    }, [token]);

    const warehouseId = Form.useWatch('warehouseId', form);
    const selectedCurrency = Form.useWatch('currency', form) || 'EUR';
    const productType = Form.useWatch('productType', form);

    const fetchLocations = useCallback(async () => {
        if (!token || !warehouseId) {
            setLocations([]);
            return;
        }
        try {
            const res = await apiRequest(`/api/locations?warehouseId=${warehouseId}`, { method: 'GET' }, token);
            setLocations(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setLocations([]);
        }
    }, [token, warehouseId]);

    useEffect(() => {
        fetchLocations();
    }, [fetchLocations]);

    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
        fetchWarehouses();
        fetchProducts();
    }, [fetchCategories, fetchSuppliers, fetchWarehouses, fetchProducts]);

    const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
        });

    const handleUpload = async (options) => {
        const { file } = options;
        if (imageList.length >= MAX_IMAGES) {
            message.warning(`Maximum ${MAX_IMAGES} images allowed`);
            return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            message.warning(`File size must be under ${MAX_FILE_SIZE_MB}MB`);
            return;
        }
        try {
            const base64 = await fileToBase64(file);
            setImageList((prev) => [...prev, { uid: file.uid, url: base64, name: file.name }]);
        } catch (_) {
            message.error('Failed to read file');
        }
    };

    const removeImage = (uid) => {
        setImageList((prev) => prev.filter((i) => i.uid !== uid));
    };

    const handleSubmit = async (values) => {
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                sku: values.sku?.trim() || values.name?.replace(/\s/g, '_').toUpperCase().slice(0, 30),
                barcode: values.barcode || null,
                color: values.color || null,
                description: values.description || null,
                productType: values.productType || 'SIMPLE',
                isPhysicalBundle: !!values.isPhysicalBundle,
                unitOfMeasure: values.unitOfMeasure || 'EACH',
                categoryId: values.categoryId || null,
                supplierId: values.supplierId || null,
                price: values.price ?? 0,
                costPrice: values.costPrice != null ? values.costPrice : null,
                vatRate: values.vatRate != null ? values.vatRate : null,
                vatCode: values.vatCode || null,
                customsTariff: values.customsTariff != null ? String(values.customsTariff) : null,
                marketplaceSkus: {
                    hdSku: values.hdSku || null,
                    hdSaleSku: values.hdSaleSku || null,
                    warehouseId: values.warehouseId || null,
                    ebayId: values.ebayId || null,
                    amazonSku: values.amazonSku || null,
                    amazonSkuSplitBefore: values.amazonSkuSplitBefore || null,
                    amazonMpnSku: values.amazonMpnSku || null,
                    amazonIdSku: values.amazonIdSku || null,
                },
                heatSensitive: values.heatSensitive || null,
                perishable: values.perishable || null,
                requireBatchTracking: values.requireBatchTracking || null,
                shelfLifeDays: values.shelfLifeDays != null ? values.shelfLifeDays : null,
                length: values.length != null ? values.length : null,
                width: values.width != null ? values.width : null,
                height: values.height != null ? values.height : null,
                dimensionUnit: values.dimensionUnit || null,
                weight: values.weight != null ? values.weight : null,
                weightUnit: values.weightUnit || null,
                reorderLevel: values.reorderLevel ?? 0,
                reorderQty: values.reorderQty ?? 0,
                lowStockThreshold: values.lowStockThreshold ?? 0,
                mediumStockThreshold: values.mediumStockThreshold ?? 0,
                maxStock: values.maxStock != null ? values.maxStock : null,
                status: values.status || 'ACTIVE',
                currency: values.currency || 'EUR',
                defaultProductionAreaId: values.defaultProductionAreaId || null,
                images: imageList.map((i) => i.url),
                cartons: [],
                supplierProducts: [],
                priceLists: null,
                openingStock: values.openingStock || 0,
                initialWarehouseId: values.warehouseId || null,
                initialLocationId: values.locationId || null,
                bundleItems: (values.bundleItems || [])
                    .filter(i => i?.productId && i?.quantity > 0)
                    .map(i => ({ productId: i.productId, quantity: i.quantity })),
            };
            const res = await apiRequest('/api/inventory/products', { method: 'POST', body: JSON.stringify(payload) }, token);
            const created = res?.data ?? res;
            message.success('Product created successfully!');
            form.resetFields();
            setImageList([]);
            navigate('/products', { replace: true });
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create product');
        } finally {
            setSaving(false);
        }
    };

    const costPrice = Form.useWatch('costPrice', form);
    const sellingPrice = Form.useWatch('price', form);
    const margin =
        costPrice != null && costPrice > 0 && sellingPrice != null
            ? formatNumber(((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100)
            : '0.0';

    const initialValues = {
        status: 'ACTIVE',
        productType: 'SIMPLE',
        unitOfMeasure: 'EACH',
        reorderLevel: 0,
        price: 0,
        costPrice: 0,
        vatRate: 20,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        dimensionUnit: 'cm',
        weightUnit: 'kg',
        reorderQty: 0,
        lowStockThreshold: 0,
        mediumStockThreshold: 0,
        color: '',
        currency: 'EUR',
        defaultProductionAreaId: undefined,
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center gap-4">
                    <Link to="/products" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                        <ArrowLeftOutlined /> Back
                    </Link>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-blue-600 tracking-tight">Add New Product</h1>
                    <p className="text-gray-500 text-sm mt-1">Create a new product in your inventory. Fill all sections and upload images.</p>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={initialValues}>
                    {/* Basic Information */}
                    <Card title="Basic Information" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item label="Product Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                    <Input placeholder="e.g. Organic Granola Bar" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="SKU" name="sku">
                                    <Input placeholder="e.g. PRD-001" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Product Type" name="productType">
                                    <Select 
                                        className="rounded-lg w-full" 
                                        size="large" 
                                        options={[
                                            { value: 'RAW_MATERIAL', label: '🧪 Raw Material (for production)' },
                                            { value: 'PRODUCTION', label: '🏭 Finished Product (produced)' },
                                            { value: 'SIMPLE', label: '📦 Simple Product (buy/sell)' },
                                            { value: 'BUNDLE', label: '🛒 Bundle' },
                                        ]} 
                                    />
                                </Form.Item>
                            </Col>
                            {productType === 'BUNDLE' && (
                                <Col xs={24} md={8}>
                                    <Form.Item name="isPhysicalBundle" valuePropName="checked" label=" ">
                                        <Checkbox className="mt-2 font-medium text-blue-600">Physical Bundle (has its own stock)</Checkbox>
                                    </Form.Item>
                                </Col>
                            )}
                            <Col xs={24} md={8}>
                                <Form.Item label="Status" name="status">
                                    <Select className="rounded-lg w-full" size="large" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
                                </Form.Item>
                            </Col>
                             <Col xs={24} md={8}>
                                <Form.Item label="Category" required>
                                    <div className="flex gap-2">
                                        <Form.Item name="categoryId" noStyle>
                                            <Select allowClear placeholder="Select category" className="rounded-lg w-full" size="large">
                                                {categories.map((c) => (
                                                    <Option key={c.id} value={c.id}>{c.name}</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                        <Button icon={<PlusOutlined />} onClick={() => setCategoryModalOpen(true)} size="large" />
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Primary Supplier">
                                    <div className="flex gap-2">
                                        <Form.Item name="supplierId" noStyle>
                                            <Select allowClear placeholder="Select primary supplier" className="rounded-lg w-full" size="large">
                                                {suppliers.map((s) => (
                                                    <Option key={s.id} value={s.id}>{s.name}</Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                        <Button icon={<PlusOutlined />} onClick={() => setSupplierModalOpen(true)} size="large" />
                                    </div>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Barcode" name="barcode">
                                    <Input placeholder="Enter barcode (EAN/UPC)" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Color" name="color">
                                    <Input placeholder="e.g. Red, Blue, Black" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                             <Col xs={24} md={12}>
                                <Form.Item label="Unit of Measure" name="unitOfMeasure" rules={[{ required: true, message: 'Required' }]}>
                                    <Select className="rounded-lg w-full" size="large" options={UOM_OPTIONS} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Default Production Area" name="defaultProductionAreaId">
                                    <Select allowClear placeholder="Select routing area" className="rounded-lg w-full" size="large">
                                        <Option value={1}>🎨 Painting Area</Option>
                                        <Option value={2}>🕯 Candle Area</Option>
                                        <Option value={3}>🧪 Lab Area</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item label="Description" name="description">
                                    <TextArea rows={3} placeholder="Enter product description..." className="rounded-lg" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Bundle Components list */}
                    {productType === 'BUNDLE' && (
                        <Card title="Bundle Components" className="rounded-2xl shadow-sm border-gray-100 mb-6 bg-slate-50/50">
                            <p className="text-gray-500 text-sm mb-4">Add products that are included in this bundle/kit. Virtual inventory gets computed based on lowest component limits.</p>
                            <Form.List name="bundleItems">
                                {(fields, { add, remove }) => (
                                    <div className="space-y-3">
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} className="flex gap-3 items-end bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                <Form.Item {...restField} name={[name, 'productId']} label="Component Product" className="mb-0 flex-1" rules={[{ required: true, message: 'Required' }]}>
                                                    <Select 
                                                        showSearch 
                                                        placeholder="Select component product..." 
                                                        className="rounded-lg" 
                                                        size="large"
                                                        optionFilterProp="label" 
                                                        options={products
                                                            .filter(p => p.productType !== 'BUNDLE') // prevents circular kit-in-kit loops
                                                            .map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))
                                                        } 
                                                    />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'quantity']} label="Quantity" className="mb-0 w-32" rules={[{ required: true, message: 'Required' }]}>
                                                    <InputNumber min={1} step={1} className="w-full rounded-lg" size="large" />
                                                </Form.Item>
                                                <Button type="text" danger icon={<PlusOutlined className="rotate-45" />} onClick={() => remove(name)} className="mb-1" />
                                            </div>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="rounded-xl border-gray-300 h-12" size="large">Add Component Product</Button>
                                    </div>
                                )}
                            </Form.List>
                        </Card>
                    )}

                    {/* Inventory Settings - MOVED UP */}
                    <Card title="Inventory Settings" className="rounded-2xl shadow-sm border-blue-50 mb-6 bg-blue-50/10">
                        <Row gutter={16}>
                             <Col xs={24} md={8}>
                                <Form.Item label="Opening Stock (Initial Units)" name="openingStock" tooltip="Enter the starting quantity for this product">
                                    <InputNumber className="w-full rounded-lg border-blue-200" size="large" min={0} step={0.00000001} placeholder="e.g. 100" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Reorder Point" name="reorderLevel">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.0001} />
                                </Form.Item>
                            </Col>
                             <Col xs={24} md={6}>
                                <Form.Item label="Low Stock Threshold" name="lowStockThreshold" tooltip="Upper bound for Low Stock range (e.g. 45 if point is 30)">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.0001} />
                                </Form.Item>
                            </Col>
                             <Col xs={24} md={6}>
                                <Form.Item label="Medium Stock Threshold" name="mediumStockThreshold" tooltip="Upper bound for Medium Stock range (e.g. 55)">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.0001} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Reorder Quantity" name="reorderQty">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.0001} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Max Stock Level" name="maxStock">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.0001} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item 
                                    label="Destination Warehouse (Mandatory)" 
                                    name="warehouseId"
                                    rules={[{ required: true, message: 'Destination warehouse is mandatory for all products' }]}
                                >
                                    <Select allowClear placeholder="Select warehouse to store opening stock" className="rounded-lg w-full" size="large">
                                        {warehouses.map((w) => (
                                            <Option key={w.id} value={w.id}>{w.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Initial Storage Location">
                                    <div className="flex gap-2">
                                        <Form.Item name="locationId" noStyle>
                                            <Select 
                                                allowClear 
                                                placeholder={warehouseId ? "Select location" : "First select a warehouse"} 
                                                className="rounded-lg w-full" 
                                                size="large"
                                                disabled={!warehouseId}
                                            >
                                                {locations.map((loc) => (
                                                    <Option key={loc.id} value={loc.id}>
                                                        {loc.name} {loc.Zone ? `(${loc.Zone.name})` : ''}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                        <Button 
                                            icon={<PlusOutlined />} 
                                            onClick={() => setLocationModalOpen(true)} 
                                            size="large" 
                                            disabled={!warehouseId}
                                            title="Add new storage location"
                                        />
                                    </div>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Pricing */}
                    <Card title="Pricing" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
                             <Col xs={24} md={6}>
                                <Form.Item label="Currency" name="currency">
                                    <Select size="large" options={CURRENCY_OPTIONS} className="rounded-lg" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Cost Price" name="costPrice" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber 
                                        className="w-full rounded-lg" 
                                        size="large" 
                                        min={0} 
                                        step={0.0001} 
                                        addonBefore={CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol || '€'} 
                                        placeholder="0.00" 
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Selling Price" name="price" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber 
                                        className="w-full rounded-lg" 
                                        size="large" 
                                        min={0} 
                                        step={0.0001} 
                                        addonBefore={CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol || '€'} 
                                        placeholder="0.00" 
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <div className="pt-8">
                                    <div className="text-gray-500 text-sm">Margin</div>
                                    <div className={`text-xl font-bold ${Number(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}%</div>
                                </div>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="VAT Rate (%)" name="vatRate">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} max={100} step={0.1} placeholder="20.0" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="VAT Code" name="vatCode">
                                    <Input placeholder="e.g. A_FOOD_PLANRISCUIT" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Customs Tariff" name="customsTariff">
                                    <Input placeholder="e.g. 12" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Marketplace SKUs */}
                    <Card title="Marketplace SKUs" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <p className="text-gray-500 text-sm mb-4">Map this product to different sales channels with their specific SKUs.</p>
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item label="HD SKU" name="hdSku">
                                    <Input placeholder="e.g. HD_PRD_R_1_CH" className="rounded-lg" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="HD Sale SKU" name="hdSaleSku">
                                    <Input placeholder="e.g. HD_PRD_R_1_CH_SALE" className="rounded-lg" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item label="eBay ID" name="ebayId">
                                    <Input placeholder="e.g. CMAY_PRD_R_1_CH" className="rounded-lg" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Amazon SKU" name="amazonSku">
                                    <Input placeholder="e.g. CI_SKU_TO_PB" className="rounded-lg" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Amazon SKU (Split Before)" name="amazonSkuSplitBefore">
                                    <Input placeholder="e.g. CI_SKU_TO_PB_B1" className="rounded-lg" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Amazon MPN SKU" name="amazonMpnSku">
                                    <Input placeholder="e.g. CI_SKU_TO_PR_M" className="rounded-lg" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Amazon ID SKU" name="amazonIdSku">
                                    <Input placeholder="e.g. CI_SKU_TO_PR_BU" className="rounded-lg" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Product Attributes */}
                    <Card title="Product Attributes" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
                            <Col xs={24} md={6}>
                                <Form.Item label="Heat Sensitive" name="heatSensitive">
                                    <Select allowClear placeholder="Select" className="rounded-lg w-full" options={YES_NO_OPTIONS} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Perishable" name="perishable">
                                    <Select allowClear placeholder="Select" className="rounded-lg w-full" options={YES_NO_OPTIONS} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Require Batch Tracking" name="requireBatchTracking">
                                    <Select allowClear placeholder="Select" className="rounded-lg w-full" options={YES_NO_OPTIONS} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Shelf Life (Days)" name="shelfLifeDays">
                                    <InputNumber className="w-full rounded-lg" min={0} placeholder="e.g. 365" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* Dimensions & Weight */}
                    <Card title="Dimensions & Weight" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
                            <Col xs={24} md={6}>
                                <Form.Item label="Length" name="length">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Width" name="width">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Height" name="height">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item label="Unit" name="dimensionUnit">
                                    <Select className="rounded-lg w-full" size="large" options={DIMENSION_UNITS} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Weight" name="weight">
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.001} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="Weight Unit" name="weightUnit">
                                    <Select className="rounded-lg w-full" size="large" options={WEIGHT_UNITS} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>


                    {/* Product Images */}
                    <Card title="Product Images" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <p className="text-gray-500 text-sm mb-4">Upload Images. Supports JPG, PNG, GIF, WebP. Max {MAX_IMAGES} images, {MAX_FILE_SIZE_MB}MB each.</p>
                        <Upload accept={ACCEPT_IMAGES} multiple showUploadList={false} customRequest={handleUpload} listType="picture-card">
                            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors">
                                <span className="text-sm text-gray-600">Upload</span>
                                <span className="text-xs text-gray-400 mt-1">{imageList.length} / {MAX_IMAGES} images</span>
                            </div>
                        </Upload>
                        {imageList.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-4">
                                {imageList.map((img) => (
                                    <div key={img.uid} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeImage(img.uid)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="flex gap-4">
                        <Button type="primary" htmlType="submit" size="large" loading={saving} className="rounded-xl px-8 h-12 font-bold">Create Product</Button>
                        <Button size="large" className="rounded-xl h-12" onClick={() => navigate('/products')}>Cancel</Button>
                    </div>
                </Form>
            </div>
            <CategoryModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSuccess={(newCat) => {
                    setCategories(prev => [...prev, newCat]);
                    form.setFieldValue('categoryId', newCat.id);
                }}
            />
            <SupplierModal
                open={supplierModalOpen}
                onClose={() => setSupplierModalOpen(false)}
                onSuccess={(newSup) => {
                    setSuppliers(prev => [...prev, newSup]);
                    form.setFieldValue('supplierId', newSup.id);
                }}
            />
            <LocationModal
                open={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                warehouseId={warehouseId}
                onSuccess={(newLoc) => {
                    setLocations(prev => [...prev, newLoc]);
                    form.setFieldValue('locationId', newLoc.id);
                }}
            />
        </MainLayout>
    );
}
