import React, { useState, useCallback } from 'react';
import { Card, Button, Upload, Steps, Table, message, Alert, Space } from 'antd';
import {
    ArrowLeftOutlined,
    DownloadOutlined,
    UploadOutlined,
    FileExcelOutlined,
    CheckCircleOutlined,
    InboxOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

// Saare product fields – zyada fields upload karne ke liye
const TEMPLATE_HEADERS = [
    'SKU', 'Product Name', 'Barcode', 'Description', 'Type', 'Status', 'Cost Price', 'Selling Price',
    'Category ID', 'Supplier ID', 'Unit of Measure', 'VAT Rate', 'VAT Code', 'Customs Tariff',
    'Heat Sensitive', 'Perishable', 'Require Batch Tracking', 'Shelf Life Days',
    'Reorder Level', 'Reorder Qty', 'Max Stock',
    'Length', 'Width', 'Height', 'Dimension Unit', 'Weight', 'Weight Unit',
    'Carton Barcode', 'Carton Case Size', 'Carton Description',
    'HD SKU', 'HD Sale SKU', 'Warehouse ID', 'eBay ID', 'Amazon SKU', 'Amazon SKU Split Before', 'Amazon MPN SKU', 'Amazon ID SKU',
    'Internal Code', 'Notes', 'Sales Channel', 'Tags',
];

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, j) => {
            row[h] = values[j] !== undefined ? values[j] : '';
        });
        rows.push(row);
    }
    return { headers, rows };
}

function rowToProduct(row) {
    const get = (k) => (row[k] !== undefined && row[k] !== '') ? String(row[k]).trim() : null;
    const getNum = (k) => {
        const v = get(k);
        if (v === null || v === '') return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
    };
    const name = get('Product Name') || get('product name') || get('Name');
    const sku = get('SKU') || get('sku');
    if (!name || !sku) return null;
    const cartonBarcode = get('Carton Barcode') || get('carton barcode');
    const cartonCaseSize = getNum('Carton Case Size') ?? getNum('carton case size');
    const cartonDesc = get('Carton Description') || get('carton description');
    const cartons = (cartonBarcode || cartonCaseSize != null) ? [{ barcode: cartonBarcode || null, caseSize: cartonCaseSize ?? null, description: cartonDesc || null }] : null;
    return {
        sku,
        name,
        barcode: get('Barcode') || get('barcode'),
        description: get('Description') || get('description'),
        productType: get('Type') || 'SIMPLE',
        status: (get('Status') || get('status') || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        costPrice: getNum('Cost Price') ?? getNum('cost price'),
        price: getNum('Selling Price') ?? getNum('Selling Price') ?? getNum('Price') ?? 0,
        categoryId: getNum('Category ID') ?? getNum('category id'),
        supplierId: getNum('Supplier ID') ?? getNum('supplier id'),
        unitOfMeasure: get('Unit of Measure') || get('unit of measure') || 'EACH',
        vatRate: getNum('VAT Rate') ?? getNum('vat rate'),
        vatCode: get('VAT Code') || get('vat code'),
        customsTariff: get('Customs Tariff') || get('customs tariff'),
        heatSensitive: get('Heat Sensitive') || get('heat sensitive'),
        perishable: get('Perishable') || get('perishable'),
        requireBatchTracking: get('Require Batch Tracking') || get('require batch tracking'),
        shelfLifeDays: getNum('Shelf Life Days') ?? getNum('shelf life days'),
        reorderLevel: getNum('Reorder Level') ?? getNum('reorder level') ?? 0,
        reorderQty: getNum('Reorder Qty') ?? getNum('reorder qty'),
        maxStock: getNum('Max Stock') ?? getNum('max stock'),
        length: getNum('Length') ?? getNum('length'),
        width: getNum('Width') ?? getNum('width'),
        height: getNum('Height') ?? getNum('height'),
        weight: getNum('Weight') ?? getNum('weight'),
        dimensionUnit: get('Dimension Unit') || get('dimension unit') || 'cm',
        weightUnit: get('Weight Unit') || get('weight unit') || 'kg',
        cartons,
        marketplaceSkus: {
            hdSku: get('HD SKU') || get('hd sku'),
            hdSaleSku: get('HD Sale SKU') || get('hd sale sku'),
            warehouseId: get('Warehouse ID') || get('warehouse id'),
            ebayId: get('eBay ID') || get('ebay id'),
            amazonSku: get('Amazon SKU') || get('amazon sku'),
            amazonSkuSplitBefore: get('Amazon SKU Split Before') || get('amazon sku split before'),
            amazonMpnSku: get('Amazon MPN SKU') || get('amazon mpn sku'),
            amazonIdSku: get('Amazon ID SKU') || get('amazon id sku'),
        },
    };
}

export default function ImportExportProducts() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [step, setStep] = useState(0);
    const [fileList, setFileList] = useState([]);
    const [parsedRows, setParsedRows] = useState([]);
    const [importResult, setImportResult] = useState(null);
    const [importing, setImporting] = useState(false);

    const downloadTemplate = useCallback(() => {
        const headerLine = TEMPLATE_HEADERS.join(',');
        // Har column me sample data taaki import ke baad sara data View/Edit me dikhe
        const exampleRows = [
            ['SKU-001', 'Sample Product 1', '5012345678903', 'Sample description', 'SIMPLE', 'ACTIVE', '10.00', '15.00', '1', '1', 'EACH', '20', 'A_FOOD', '12', 'yes', 'no', 'no', '365', '5', '10', '100', '30', '20', '15', 'cm', '0.5', 'kg', 'CARTON-BAR-001', '48', 'Case of 48', 'HD_SKU_1', 'HD_SALE_1', 'WH_001', 'EBAY_001', 'AMZ_001', 'AMZ_B1', 'AMZ_MPN_1', 'AMZ_ID_1', 'INT-001', 'Sample notes', 'DIRECT', 'tag1'],
            ['SKU-002', 'Sample Product 2', '5012345678904', 'Another product', 'SIMPLE', 'ACTIVE', '25.50', '35.00', '2', '2', 'BOX', '20', 'B_STANDARD', '18', 'no', 'yes', 'yes', '180', '10', '20', '200', '40', '25', '20', 'cm', '1.2', 'kg', 'CARTON-BAR-002', '24', 'Box of 24', 'HD_SKU_2', 'HD_SALE_2', 'WH_002', 'EBAY_002', 'AMZ_002', 'AMZ_B2', 'AMZ_MPN_2', 'AMZ_ID_2', '', '', 'AMAZON', ''],
            ['SKU-003', 'Third Product', '5012345678905', 'Full data example', 'SIMPLE', 'ACTIVE', '5.00', '12.00', '1', '1', 'KG', '5', 'C_ZERO', '0', 'no', 'no', 'no', '90', '2', '5', '50', '10', '10', '10', 'cm', '0.25', 'kg', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ];
        const escape = (v) => (v == null || v === '' ? '' : (String(v).includes(',') || String(v).includes('"') ? `"${String(v).replace(/"/g, '""')}"` : v));
        const csv = '\uFEFF' + [headerLine, ...exampleRows.map((row) => row.map(escape).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product-import-template.csv';
        a.click();
        URL.revokeObjectURL(url);
        message.success('Template downloaded – saare columns import ke baad product me dikhenge');
    }, []);

    const handleFileUpload = (file) => {
        setFileList([{ uid: '1', name: file.name, status: 'done' }]);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result || '';
                const { rows } = parseCSV(text);
                if (rows.length === 0) {
                    message.warning('No data rows in file');
                    setFileList([]);
                    return;
                }
                setParsedRows(rows);
                setStep(1);
                message.success(`${rows.length} row(s) parsed`);
            } catch (err) {
                message.error('Failed to parse file');
                setFileList([]);
            }
        };
        reader.readAsText(file);
        return false;
    };

    const handleImport = async () => {
        if (!token || parsedRows.length === 0) return;
        setImporting(true);
        try {
            const products = parsedRows.map((row) => rowToProduct(row)).filter(Boolean);
            if (products.length === 0) {
                message.error('No valid rows (SKU and Product Name required for each row)');
                setImporting(false);
                return;
            }
            const res = await apiRequest('/api/inventory/products/bulk', {
                method: 'POST',
                body: JSON.stringify({ products }),
            }, token);
            const data = res?.data ?? res;
            setImportResult(data);
            setStep(2);
            message.success(`Imported: ${data.created} created, ${data.skipped} skipped`);
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const steps = [
        { title: 'Upload File', icon: <UploadOutlined /> },
        { title: 'Review Data', icon: <FileExcelOutlined /> },
        { title: 'Import', icon: <InboxOutlined /> },
        { title: 'Complete', icon: <CheckCircleOutlined /> },
    ];

    const columns = parsedRows.length
        ? Object.keys(parsedRows[0]).map((key) => ({ title: key, dataIndex: key, key, ellipsis: true, render: (v) => v ?? '—' }))
        : [];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <Link to="/products" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium mb-2">
                            <ArrowLeftOutlined /> Back to Products
                        </Link>
                        <h1 className="text-2xl font-medium text-blue-600">Import Products</h1>
                        <p className="text-gray-500 text-sm">Bulk import products from CSV files</p>
                    </div>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={downloadTemplate} className="bg-blue-600 border-blue-600">
                        Download Template
                    </Button>
                </div>

                <Steps current={step} items={steps} className="mb-8" />

                {step === 0 && (
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <Alert
                            type="info"
                            showIcon
                            message="Import instructions"
                            description={
                                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                    <li>Download template me saare product columns hain – jo bhi fill karoge woh import ke baad View/Edit product me dikhega</li>
                                    <li>Required: SKU, Product Name (Cost Price, Selling Price recommended)</li>
                                    <li>Template download karo, apna data bharo, CSV upload karo – Review me sara data dikhega, phir Import to Products</li>
                                    <li>.csv files (Excel se Save As CSV bhi use kar sakte ho)</li>
                                </ul>
                            }
                            className="mb-4"
                        />
                        <Upload.Dragger
                            accept=".csv"
                            fileList={fileList}
                            beforeUpload={(file) => { handleFileUpload(file); return false; }}
                            onRemove={() => { setFileList([]); setParsedRows([]); }}
                            maxCount={1}
                        >
                            <p className="ant-upload-drag-icon"><UploadOutlined className="text-4xl text-blue-500" /></p>
                            <p className="ant-upload-text">Click or drag CSV file to upload</p>
                            <p className="ant-upload-hint">Supports .csv files</p>
                        </Upload.Dragger>
                    </Card>
                )}

                {step === 1 && (
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-slate-800">Review data ({parsedRows.length} rows)</h3>
                            <Space>
                                <Button onClick={() => { setStep(0); setParsedRows([]); setFileList([]); }}>Back</Button>
                                <Button type="primary" loading={importing} onClick={handleImport} className="bg-blue-600 border-blue-600">
                                    Import to Products
                                </Button>
                            </Space>
                        </div>
                        <Table size="small" dataSource={parsedRows.map((r, i) => ({ ...r, key: i }))} columns={columns} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
                    </Card>
                )}

                {step === 2 && importResult && (
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-center py-6">
                            <CheckCircleOutlined className="text-5xl text-green-500 mb-4" />
                            <h3 className="text-xl font-medium text-slate-800 mb-2">Import complete</h3>
                            <p className="text-gray-600 mb-4">
                                Created: <strong>{importResult.created}</strong> · Skipped: <strong>{importResult.skipped}</strong>
                            </p>
                            {importResult.errors?.length > 0 && (
                                <Alert type="warning" message={`${importResult.errors.length} row(s) had issues`} description={importResult.errors.slice(0, 5).map((e, i) => <div key={i}>Row {e.row}: {e.message}</div>)} className="text-left max-w-md mx-auto mb-4" />
                            )}
                            <Space>
                                <Button onClick={() => { setStep(0); setParsedRows([]); setImportResult(null); }}>Import again</Button>
                                <Button type="primary" onClick={() => navigate('/products')} className="bg-blue-600 border-blue-600">Go to Products</Button>
                            </Space>
                        </div>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
