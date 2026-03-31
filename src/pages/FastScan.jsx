import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Typography, Card, Badge, Input, Tag, message, List, Button, Popconfirm, Row, Col, AutoComplete, InputNumber } from 'antd';
import { Package, History, Box, ArrowRightLeft, Truck, ArrowUp, ArrowDown, Search, Trash2, Download, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { playSuccessBeep, playErrorBeep } from '../utils/audio';

const { Title, Text } = Typography;

export default function FastScan() {
  const { token } = useAuthStore();
  const location = useLocation();
  const [scanValue, setScanValue] = useState('');
  const [mode, setMode] = useState('IN'); // IN, OUT
  const [history, setHistory] = useState([]);
  const [lastProduct, setLastProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState([]);
  const inputRef = useRef(null);

  const fetchHistory = useCallback(async () => {
    setFetchingHistory(true);
    try {
      const adjRes = await apiRequest('/api/inventory/adjustments?limit=20', { method: 'GET' }, token);
      const adjs = (adjRes.data || []).map(a => ({
        id: a.id,
        dbId: a.id,
        type: a.type === 'INCREASE' ? 'IN' : 'OUT',
        value: a.items?.[0]?.product?.sku || a.referenceNumber,
        productName: a.items?.[0]?.product?.name,
        quantity: a.quantity,
        time: dayjs(a.createdAt).format('hh:mm A'),
        status: 'SUCCESS'
      }));
      setHistory(adjs);
    } catch (err) { } finally { setFetchingHistory(false); }
  }, [token]);

  const handleHistoryDelete = async (id) => {
    try {
      await apiRequest(`/api/inventory/adjustments/${id}`, { method: 'DELETE' }, token);
      message.success('Adjustment deleted and stock reverted');
      fetchHistory();
    } catch (err) {
      message.error('Failed to delete: ' + err.message);
    }
  };

  useEffect(() => {
    fetchHistory();
    if (location.state?.initialScan) {
      setScanValue(location.state.initialScan);
    }
  }, [fetchHistory, location.state]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (value) => {
    const trimmedValue = (value || scanValue || '').trim();
    if (!trimmedValue || loading) return;
    setLoading(true);
    try {
        const res = await apiRequest(`/api/inventory/products?search=${trimmedValue}`, { method: 'GET' }, token);
        const products = res.data || [];
        
        // Exact match first (Barcode or SKU)
        let product = products.find(p => p.barcode === trimmedValue || p.sku === trimmedValue);
        
        // If no exact barcode/sku match, and we have results, it might be a name match
        if (!product && products.length > 0) {
            product = products[0];
        }

        if (!product) {
          message.error(`❌ Product not found: ${trimmedValue}`);
          playErrorBeep();
          setLastProduct(null);
          return;
        }

        // AUTO-SUBMIT LOGIC: Immediately process adjustment with Qty 1
        const endpoint = '/api/inventory/adjustments';
        const payload = {
            productId: product.id,
            quantity: quantity,
            type: mode === 'IN' ? 'INCREASE' : 'DECREASE',
            reason: `Auto Fast Scan ${mode}`,
            warehouseId: product.ProductStocks?.[0]?.warehouseId || product.warehouseId || product.WarehouseId
        };

        const adjRes = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(payload) }, token);
        
        playSuccessBeep();
        if (adjRes.data?.components && adjRes.data.components.length > 0) {
          message.success({
            content: (
              <div className="text-left">
                <div className="font-bold">✅ {mode} Processed: {product.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  Components: {adjRes.data.components.map(c => `${c.name}`).join(', ')}
                </div>
              </div>
            ),
            duration: 5
          });
        } else {
          message.success(`✅ ${mode} Processed: ${product.name}`);
        }
        
        setScanValue('');
        setOptions([]);
        fetchHistory();
    } catch (err) {
      message.error(`❌ Error: ${err.message}`);
      playErrorBeep();
    } finally {
      setLoading(false);
    }
  };

  const onSearchSuggestions = async (searchText) => {
    if (!searchText || searchText.length < 2) {
      setOptions([]);
      return;
    }
    try {
        const res = await apiRequest(`/api/inventory/products?search=${searchText}&limit=10`, { method: 'GET' }, token);
        const products = res.data || [];
        setOptions(products.map(p => ({
            value: p.barcode || p.sku || p.name,
            label: (
                <div className="flex justify-between items-center py-1">
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku} | BC: {p.barcode || '—'}</div>
                    </div>
                </div>
            ),
            product: p
        })));
    } catch (err) {
        console.error(err);
    }
  };

  const onSelect = (value, option) => {
    setScanValue(value);
    handleSearch(value);
  };

  const handleAction = async (actionType) => {
    if (!lastProduct || loading) return;
    if (quantity <= 0) {
        message.warning('Please enter a valid quantity');
        return;
    }
    
    setLoading(true);
    try {
        const endpoint = '/api/inventory/adjustments';
        const payload = {
            productId: lastProduct.id,
            quantity: quantity,
            type: actionType === 'IN' ? 'INCREASE' : 'DECREASE',
            reason: `Manual Scan ${actionType}`,
            warehouseId: lastProduct.ProductStocks?.[0]?.warehouseId || lastProduct.warehouseId || lastProduct.WarehouseId
        };

        await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(payload) }, token);
        
        playSuccessBeep();
        message.success(`✅ Stock ${actionType} Processed: ${lastProduct.name}`);
        
        // Refresh product info
        const stockRes = await apiRequest(`/api/inventory/stock?productId=${lastProduct.id}`, { method: 'GET' }, token);
        const totalQty = (stockRes.data || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
        setLastProduct(prev => ({ ...prev, currentQty: totalQty }));
        
        fetchHistory();
        setQuantity(1);
    } catch (err) {
      message.error(`❌ Action Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  const modeOptions = [
    { label: 'Stock In', value: 'IN', icon: <ArrowUp size={14} /> },
    { label: 'Stock Out', value: 'OUT', icon: <ArrowDown size={14} /> },
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-in fade-in duration-700">
        <div className="text-center mb-10">
          <Title level={1} className="!text-[#0f172a] !mt-2 !mb-2 !font-black tracking-tighter uppercase text-4xl md:text-5xl">AUTO FAST SCAN</Title>
          <Text className="text-slate-400 font-bold text-lg opacity-80">Scan barcode to process automatically.</Text>
        </div>


        {/* MAIN SCAN AREA */}
        <div className="flex flex-col items-center mb-8">
          {/* Mode Square Buttons */}
          <div className="flex gap-12 mb-10">
            <button 
              onClick={() => setMode('IN')}
              className={`w-28 h-28 md:w-36 md:h-36 rounded-[2.2rem] flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-xl ${mode === 'IN' ? 'bg-[#039855] text-white scale-105 shadow-emerald-500/20' : 'bg-white text-[#039855] hover:bg-emerald-50 shadow-slate-200/30 border border-slate-50'}`}
            >
              <Download size={28} className={mode === 'IN' ? 'text-white' : 'text-[#039855]'} />
              <span className={`font-black uppercase tracking-tight text-[11px] ${mode === 'IN' ? 'text-white' : 'text-[#039855]'}`}>Stock In</span>
            </button>
            <button 
              onClick={() => setMode('OUT')}
              className={`w-28 h-28 md:w-36 md:h-36 rounded-[2.2rem] border-none flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-xl ${mode === 'OUT' ? 'bg-rose-500 text-white scale-105 shadow-rose-500/20' : 'bg-white text-rose-500 hover:bg-rose-50 shadow-slate-200/30 border border-slate-50'}`}
            >
              <Upload size={28} className={mode === 'OUT' ? 'text-white' : 'text-rose-500'} />
              <span className={`font-black uppercase tracking-tight text-[11px] ${mode === 'OUT' ? 'text-white' : 'text-rose-500'}`}>Stock Out</span>
            </button>
          </div>

          {/* Large Scan Input - Simplified Colors */}
          <div className="w-full max-w-2xl flex gap-3">
            <div className="w-32">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-4">Quantity</label>
               <InputNumber 
                min={0.01} 
                step={0.0001} 
                value={quantity} 
                onChange={setQuantity}
                className="w-full h-16 !rounded-3xl !border-slate-100 !bg-slate-50 text-xl font-bold flex items-center justify-center text-center"
               />
            </div>
            <div className="flex-1 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-6">Scan Barcode / SKU</label>
              <div className={`p-1 rounded-full transition-all duration-500 bg-slate-50 border border-slate-100`}>
              <AutoComplete
                ref={inputRef}
                options={options}
                onSelect={onSelect}
                onSearch={onSearchSuggestions}
                value={scanValue}
                onChange={setScanValue}
                className="w-full h-16"
                disabled={loading}
              >
                <Input 
                  size="large"
                  placeholder={`Scan for ${mode}...`}
                  onPressEnter={(e) => handleSearch(e.target.value)}
                  className={`h-16 text-2xl text-center !rounded-full border-none shadow-inner !bg-white focus:!bg-white font-normal tracking-tight placeholder-slate-300 text-slate-400`}
                  autoFocus
                />
              </AutoComplete>
            </div>
            
            <div className="flex justify-center mt-3">
               <div className="bg-[#0f172a] text-white px-5 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${mode === 'IN' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">{mode} SCANNING ACTIVE</span>
               </div>
            </div>
          </div>
        </div>
      </div>

        {/* HISTORY */}
        <div className="flex justify-between items-center px-4 mb-4">
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <History size={16} className="text-slate-400" /> Recent Activity
          </span>
          <Button type="link" size="small" onClick={fetchHistory} className="text-blue-500 font-bold uppercase text-[10px]">Refresh</Button>
        </div>
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden p-1">
          <List
            dataSource={history}
            loading={fetchingHistory}
            renderItem={item => (
              <List.Item className="px-6 md:px-8 py-4 border-b border-slate-50 last:border-none">
                <div className="flex items-center gap-4 w-full">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.type === 'IN' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                      {item.type === 'IN' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-base">{item.value}</span>
                        <span className="text-slate-400 font-medium text-xs">— {item.productName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase ${item.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            STOCK {item.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.time}</span>
                      </div>
                   </div>
                   <Popconfirm title="Revert this transaction?" onConfirm={() => handleHistoryDelete(item.dbId)}>
                      <Button type="text" danger icon={<Trash2 size={20} />} className="hover:bg-rose-50 border-none" />
                   </Popconfirm>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </div>
    </MainLayout>
  );
}
