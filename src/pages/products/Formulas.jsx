import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Space, Typography,
  Modal, Form, Select, Input, InputNumber, message,
  Tag, Divider, Popconfirm, Checkbox, Tooltip, Alert
} from 'antd';
import {
  Beaker, Plus, Edit, Trash2, Package, Save, X,
  FlaskConical, CheckCheck, Info, Calculator
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';

const { Title, Text } = Typography;

export default function Formulas() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFormula, setEditingFormula] = useState(null);
  const [form] = Form.useForm();

  // Derived: filter by type
  const finishedProducts = products.filter(p =>
    ['PRODUCTION', 'SIMPLE', 'BUNDLE'].includes(p.productType) || !p.productType
  );
  const rawMaterials = products; // Allow any product to be used as ingredient

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [formulaRes, productRes, whRes] = await Promise.all([
        apiRequest('/api/production/formulas', { method: 'GET' }, token),
        apiRequest('/api/inventory/products', { method: 'GET' }, token),
        apiRequest('/api/warehouses', { method: 'GET' }, token),
      ]);
      setFormulas(formulaRes.data || []);
      setProducts(productRes.data || []);
      setWarehouses(whRes.data || []);
    } catch (err) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateOrUpdate = async (values) => {
    try {
      const method = editingFormula ? 'PUT' : 'POST';
      const url = editingFormula ? `/api/production/formulas/${editingFormula.id}` : '/api/production/formulas';

      await apiRequest(url, {
        method,
        body: JSON.stringify({ ...values, isDefault: values.isDefault || false })
      }, token);

      message.success(`Formula ${editingFormula ? 'updated' : 'created'} successfully`);
      setIsModalVisible(false);
      setEditingFormula(null);
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error(err.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/production/formulas/${id}`, { method: 'DELETE' }, token);
      message.success('Formula deleted');
      fetchData();
    } catch (err) {
      message.error('Deletion failed');
    }
  };

  const openEdit = (record) => {
    setEditingFormula(record);
    form.setFieldsValue({
      productId: record.productId,
      name: record.name,
      description: record.description,
      isDefault: record.isDefault,
      productionAreaId: record.productionAreaId,
      warehouseId: record.warehouseId,
      items: record.ProductionFormulaItems?.map(fi => ({
        productId: fi.productId,
        quantityPerUnit: fi.quantityPerUnit,
        unit: fi.unit,
        warehouseId: fi.warehouseId,
      })) || []
    });
    setIsModalVisible(true);
  };

  const handleRawMaterialChange = (productId, index) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const items = form.getFieldValue('items') || [];
    const currentItem = { ...(items[index] || {}) };

    // Auto-set Unit (normalize to lowercase if possible)
    if (product.unitOfMeasure) {
      const uom = product.unitOfMeasure.toLowerCase();
      // Simple mapping to match Select options
      if (uom.includes('kg')) currentItem.unit = 'kg';
      else if (uom.includes('gram') || uom === 'g') currentItem.unit = 'g';
      else if (uom.includes('ml')) currentItem.unit = 'ml';
      else if (uom.includes('lit') || uom === 'l') currentItem.unit = 'L';
      else if (uom.includes('pc') || uom.includes('piece')) currentItem.unit = 'EACH';
      else currentItem.unit = product.unitOfMeasure;
    }

    // Auto-set Warehouse (first one with stock)
    if (product.ProductStocks && product.ProductStocks.length > 0) {
      currentItem.warehouseId = product.ProductStocks[0].warehouseId;
    }

    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...currentItem };
    form.setFieldsValue({ items: newItems });
  };

  const handleCopyFromTemplate = (formulaId) => {
    const source = formulas.find(f => f.id === formulaId);
    if (!source) return;

    form.setFieldsValue({
      name: `${source.name} (Copy)`,
      description: source.description,
      productionAreaId: source.productionAreaId,
      warehouseId: source.warehouseId,
      items: source.ProductionFormulaItems?.map(fi => ({
        productId: fi.productId,
        quantityPerUnit: fi.quantityPerUnit,
        unit: fi.unit,
        warehouseId: fi.warehouseId,
      })) || []
    });
  };

  const columns = [
    {
      title: 'Finished Product',
      dataIndex: 'Product',
      key: 'product',
      render: (p) => p ? (
        <Space>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Package size={18} className="text-blue-500" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{p.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
          </div>
        </Space>
      ) : (
        <Space>
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <FlaskConical size={18} className="text-orange-500" />
          </div>
          <div>
            <Tag color="orange" bordered={false} className="font-black text-[10px] m-0 px-2 py-0.5 rounded-lg uppercase tracking-wider">
              Formula Template
            </Tag>
            <div className="text-[10px] text-slate-400 mt-0.5">Not assigned to specific product</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Formula Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div className="font-semibold text-slate-700">{name}</div>
          {record.isDefault && (
            <Tag color="green" bordered={false} className="text-[9px] uppercase font-black tracking-widest mt-0.5 px-2 py-0">
              ✓ Default
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Raw Materials (BOM)',
      dataIndex: 'ProductionFormulaItems',
      key: 'components',
      render: (items) => (
        <div className="flex flex-wrap gap-1.5">
          {items?.map(it => (
            <Tooltip
              key={it.id}
              title={`${it.RawMaterial?.name}: ${it.quantityPerUnit} ${it.unit || 'unit'} per finished unit`}
            >
              <Tag className="text-[10px] rounded-lg bg-slate-50 border-slate-200 cursor-help py-0.5 px-2">
                <span className="font-bold">{it.RawMaterial?.name}</span>
                <span className="text-blue-600 ml-1 font-black">{it.quantityPerUnit}</span>
                <span className="text-slate-400 ml-0.5">{it.unit || 'g'}</span>
              </Tag>
            </Tooltip>
          ))}
          {(!items || items.length === 0) && <span className="text-slate-300 text-[10px]">No items</span>}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<Edit size={14} />}
            onClick={() => openEdit(record)}
            className="rounded-lg"
          />
          <Popconfirm
            title="Delete formula?"
            description="This will remove the formula. Existing production orders won't be affected."
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<Trash2 size={14} />} className="rounded-lg" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <MainLayout>
      <div className="p-2 md:p-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <Title level={2} className="!mb-1 flex items-center gap-2 text-xl md:text-2xl">
              <FlaskConical size={26} className="text-blue-600" /> Manufacturing Formulas
            </Title>
            <Text type="secondary" className="text-xs md:text-sm">Define how much raw material is needed per unit of finished product.</Text>
          </div>
          <Button
            type="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingFormula(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
            className="h-10 md:h-11 rounded-xl shadow-md shadow-blue-200 w-full md:w-auto"
            size="large"
          >
            Create Formula
          </Button>
        </div>


        {/* FORMULA TABLE */}
        <Card className="rounded-[1.5rem] shadow-sm overflow-hidden" styles={{ body: { padding: 0 } }}>
          <Table
            columns={columns}
            dataSource={formulas}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </Card>

        {/* CREATE / EDIT MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <Beaker size={20} className="text-blue-600" />
              {editingFormula ? 'Edit Formula' : 'New Production Formula'}
            </div>
          }
          open={isModalVisible}
          onCancel={() => { setIsModalVisible(false); setEditingFormula(null); }}
          width={900}
          footer={null}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
            
            {!editingFormula && (
              <div className="bg-blue-50/50 p-4 rounded-2xl mb-6 border border-blue-100/50">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Quick Template</span>
                </div>
                <Select
                  showSearch
                  placeholder="Quick Copy from existing Formula or Template..."
                  className="w-full custom-select-blue"
                  onChange={handleCopyFromTemplate}
                  filterOption={(input, option) => 
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={formulas.map(f => ({
                    value: f.id,
                    label: `${f.name} ${f.Product ? `(${f.Product.name})` : '(Template)'}`
                  }))}
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <Form.Item name="productId" label={<span className="font-bold">Finished Product <Tag color="blue" bordered={false}>Optional for Templates</Tag></span>}>
                <Select showSearch allowClear placeholder="e.g. PLS Beige (Leave empty for Template)" optionFilterProp="label" className="rounded-lg">
                  {finishedProducts.map(p => (
                    <Select.Option key={p.id} value={p.id} label={`${p.name} (${p.sku})`}>
                      {p.name} <span className="text-slate-400 text-[10px]">({p.sku}) — {p.unitOfMeasure || 'EACH'}</span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name" label={<span className="font-bold">Formula Name</span>} rules={[{ required: true }]}>
                <Input placeholder="e.g. Standard PLS Blend" />
              </Form.Item>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <Form.Item name="productionAreaId" label={<span className="font-bold">Production Zone</span>}>
                <Select placeholder="Destination Zone" allowClear className="rounded-lg">
                  <Select.Option value={1}>Painting Area</Select.Option>
                  <Select.Option value={2}>Candle Area</Select.Option>
                  <Select.Option value={3}>Lab Area</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="warehouseId" label={<span className="font-bold">Destination Warehouse</span>}>
                <Select placeholder="Where will finished goods go?" allowClear className="rounded-lg">
                  {warehouses.map(w => (
                    <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="isDefault" valuePropName="checked" label=" ">
                <Checkbox className="font-semibold mt-8">
                  <span className="flex items-center gap-1">
                    <CheckCheck size={14} className="text-green-500" />
                    Set as Default Formula
                  </span>
                </Checkbox>
              </Form.Item>
            </div>

            <Divider orientation="left" className="!text-[10px] !text-slate-400 font-black uppercase tracking-widest">
              <span className="flex items-center gap-1"><Calculator size={14} /> Raw Materials — Qty per 1 unit of finished product</span>
            </Divider>


            {/* DYNAMIC ITEMS */}
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.length > 0 && (
                    <div className="hidden md:grid grid-cols-12 gap-2 mb-2 px-2">
                      <div className="col-span-4 text-[10px] font-black uppercase text-slate-400">Raw Material</div>
                      <div className="col-span-2 text-[10px] font-black uppercase text-slate-400">Qty per Unit</div>
                      <div className="col-span-2 text-[10px] font-black uppercase text-slate-400">Unit</div>
                      <div className="col-span-3 text-[10px] font-black uppercase text-slate-400">Source Warehouse</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                      <div className="col-span-1 md:col-span-4">
                        <label className="md:hidden text-[10px] font-black uppercase text-slate-400 block mb-1">Raw Material</label>
                        <Form.Item
                          {...restField}
                          name={[name, 'productId']}
                          rules={[{ required: true, message: 'Select material' }]}
                          className="!mb-0"
                        >
                          <Select 
                            showSearch 
                            placeholder="e.g. Paint, Wax" 
                            optionFilterProp="label" 
                            className="w-full"
                            onChange={(val) => handleRawMaterialChange(val, name)}
                          >
                            {rawMaterials.map(p => {
                              const totalStock = p.ProductStocks?.reduce((acc, s) => acc + parseFloat(s.quantity || 0), 0) || 0;
                              return (
                                <Select.Option key={p.id} value={p.id} label={`${p.name} (${p.sku})`}>
                                  <div className="flex justify-between items-center w-full">
                                    <span>{p.name} <span className="text-[10px] text-slate-400 font-mono">({p.sku})</span></span>
                                    {totalStock > 0 && <Tag color="blue" className="mr-0 text-[8px] px-1">{totalStock} {p.unitOfMeasure || 'EACH'}</Tag>}
                                  </div>
                                </Select.Option>
                              );
                            })}
                            {rawMaterials.length === 0 && (
                              <Select.Option disabled value="__hint__">
                                No RAW_MATERIAL products found. Create them first.
                              </Select.Option>
                            )}
                          </Select>
                        </Form.Item>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="md:hidden text-[10px] font-black uppercase text-slate-400 block mb-1">Qty</label>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantityPerUnit']}
                          rules={[{ required: true, message: 'Enter qty' }]}
                          className="!mb-0"
                        >
                          <InputNumber placeholder="Qty" min={0.0001} step={0.0001} className="w-full h-10 rounded-lg" />
                        </Form.Item>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="md:hidden text-[10px] font-black uppercase text-slate-400 block mb-1">Unit</label>
                        <Form.Item {...restField} name={[name, 'unit']} className="!mb-0">
                          <Select placeholder="Unit" allowClear showSearch className="h-10">
                            <Select.Option value="g">g (gram)</Select.Option>
                            <Select.Option value="kg">kg</Select.Option>
                            <Select.Option value="ml">ml</Select.Option>
                            <Select.Option value="L">L (litre)</Select.Option>
                            <Select.Option value="EACH">Each (pcs)</Select.Option>
                            {/* Dynamic option if not in list */}
                            {form.getFieldValue(['items', name, 'unit']) && !['g', 'kg', 'ml', 'L', 'EACH'].includes(form.getFieldValue(['items', name, 'unit'])) && (
                              <Select.Option value={form.getFieldValue(['items', name, 'unit'])}>
                                {form.getFieldValue(['items', name, 'unit'])}
                              </Select.Option>
                            )}
                          </Select>
                        </Form.Item>
                      </div>
                      <div className="col-span-1 md:col-span-3">
                        <label className="md:hidden text-[10px] font-black uppercase text-slate-400 block mb-1">Source Warehouse</label>
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) => prevValues.items !== curValues.items}
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const pId = getFieldValue(['items', name, 'productId']);
                            const product = products.find(p => p.id === pId);
                            const inStockWhIds = product?.ProductStocks?.map(s => s.warehouseId) || [];

                            return (
                              <Form.Item {...restField} name={[name, 'warehouseId']} className="!mb-0">
                                <Select placeholder="Source Warehouse" allowClear showSearch optionFilterProp="label">
                                  {warehouses.map(w => {
                                    const isInStock = inStockWhIds.includes(w.id);
                                    return (
                                      <Select.Option key={w.id} value={w.id} label={w.name}>
                                        <div className="flex justify-between items-center w-full">
                                          <span>{w.name}</span>
                                          {isInStock && <Tag color="green" bordered={false} className="text-[8px] mr-0 px-1 uppercase">In Stock</Tag>}
                                        </div>
                                      </Select.Option>
                                    );
                                  })}
                                </Select>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </div>
                      <div className="col-span-1 flex items-center justify-end md:justify-center pt-2 md:pt-0">
                        <Button 
                          type="text" 
                          danger 
                          icon={<Trash2 size={18} />} 
                          onClick={() => remove(name)}
                          className="flex items-center gap-2 md:inline-flex"
                        >
                           <span className="md:hidden font-bold">Remove Material</span>
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Form.Item className="mt-2">
                    <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />} className="rounded-xl h-12 text-blue-600 font-bold border-blue-200 bg-blue-50/30">
                      Add Raw Material
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>

            <div className="flex flex-col md:flex-row justify-end gap-3 mt-8 border-t pt-6">
              <Button onClick={() => { setIsModalVisible(false); setEditingFormula(null); }} icon={<X size={16} />} className="h-11 rounded-xl order-2 md:order-1">
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" icon={<Save size={16} />} className="h-11 rounded-xl shadow-md shadow-blue-200 order-1 md:order-2">
                Save Formula
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
