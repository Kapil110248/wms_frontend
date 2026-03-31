import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Tag, Button, DatePicker, Space, Timeline } from 'antd';
import {
  DatabaseOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ShopOutlined,
  CarOutlined,
  BoxPlotOutlined,
  TeamOutlined,
  CrownOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';
import { MainLayout } from '../components/layout/MainLayout';
import { Link } from 'react-router-dom';
import { getDefaultRouteForRole } from '../permissions';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;

/**
 * Generic Dashboard - redirects to role-specific dashboard when user has one.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const defaultRoute = user?.role ? getDefaultRouteForRole(user.role) : '/dashboard';
  useEffect(() => {
    if (user?.role && defaultRoute !== '/dashboard') {
      navigate(defaultRoute, { replace: true });
      return;
    }
  }, [user?.role, defaultRoute, navigate]);

  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [loading, setLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalStock: { value: 45234 },
      lowStockItems: { value: 8 },
      pendingOrders: { value: 156 },
      totalRevenue: { value: 125430 },
      ordersToday: { value: 12 },
    },
    totals: {
      products: 1240,
      customers: 85,
      suppliers: 42,
      brands: 15,
      warehouses: 4,
      users: 12,
    },
    salesTrend: [
      { date: '2024-01-01', revenue: 4500 },
      { date: '2024-01-02', revenue: 5200 },
      { date: '2024-01-03', revenue: 4800 },
      { date: '2024-01-04', revenue: 6100 },
      { date: '2024-01-05', revenue: 5900 },
      { date: '2024-01-06', revenue: 7200 },
      { date: '2024-01-07', revenue: 6800 },
    ],
    topProducts: [
      { name: 'Wireless Headphones', sold: 450 },
      { name: 'Smart Watch', sold: 320 },
      { name: 'Bluetooth Speaker', sold: 280 },
      { name: 'Gaming Mouse', sold: 210 },
      { name: 'USB-C Cable', sold: 190 },
    ],
    recentOrders: [
      { id: 1, orderNumber: 'ORD-2024-001', customer: 'John Doe', total: 1250, status: 'SHIPPED' },
      { id: 2, orderNumber: 'ORD-2024-002', customer: 'Jane Smith', total: 850, status: 'PROCESSING' },
      { id: 3, orderNumber: 'ORD-2024-003', customer: 'Bob Johnson', total: 2100, status: 'PENDING' },
      { id: 4, orderNumber: 'ORD-2024-004', customer: 'Alice Brown', total: 450, status: 'DELIVERED' },
    ],
    recentActivity: [
      { id: 1, action: 'System data sync completed', user: 'System', time: 'Just now', icon: <CheckCircleOutlined />, color: '#52c41a' },
      { id: 2, action: 'User login: admin@kiaan-wms.com', user: 'Admin', time: '5 mins ago', icon: <UserOutlined />, color: '#1890ff' },
      { id: 3, action: 'New order received: ORD-2024-005', user: 'System', time: '15 mins ago', icon: <PlusOutlined />, color: '#faad14' },
    ],
  });

  useEffect(() => {
    let cancelled = false;
    const fetchDashboardData = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [statsRes, chartsRes, ordersRes] = await Promise.all([
          apiRequest('/api/dashboard/stats', { method: 'GET' }, token).catch(() => ({ data: {} })),
          apiRequest('/api/dashboard/charts', { method: 'GET' }, token).catch(() => ({ data: {} })),
          apiRequest('/api/orders/sales', { method: 'GET' }, token).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const d = statsRes.data || {};
        const charts = chartsRes.data || {};
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        
        const recentOrders = orders.slice(0, 4).map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customer: o.Customer?.name || '-',
          total: o.totalAmount ?? 0,
          status: (o.status || '').toUpperCase(),
        }));

        setDashboardData((prev) => ({
          ...prev,
          kpis: {
            totalStock: { value: d.totalStock ?? 1250 },
            lowStockItems: { value: d.lowStockCount ?? 0 },
            pendingOrders: { value: d.pendingOrders ?? 0 },
            totalRevenue: { value: charts.salesTrend?.reduce((acc, curr) => acc + curr.revenue, 0) || 0 },
            ordersToday: { value: d.totalOrders ?? 0 },
          },
          totals: {
            products: d.products ?? 0,
            customers: d.customers ?? 0,
            suppliers: 0,
            brands: 0,
            warehouses: d.warehouses ?? 0,
            users: d.users ?? 0,
          },
          salesTrend: charts.salesTrend || prev.salesTrend,
          topProducts: charts.topProducts || prev.topProducts,
          recentOrders,
        }));
      } catch (_) {
        // keep existing static fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDashboardData();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <MainLayout>
      <div className="p-6 bg-white min-h-screen font-sans text-gray-900 border border-gray-100 rounded-xl shadow-sm">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Control Center</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Live system metrics and operational heartbeat for {user?.name || 'Administrator'}</p>
          </div>
          <Space wrap>
            <RangePicker
              value={[dateRange[0], dateRange[1]]}
              onChange={(d) => d && setDateRange([d[0], d[1]])}
              className="rounded-lg"
            />
            <Button type="primary" icon={<PlusOutlined />} className="rounded-lg bg-blue-600">
              New Action
            </Button>
          </Space>
        </div>

        {/* CORE METRICS */}
        <Row gutter={[20, 20]} className="mb-8">
          {[
            { label: 'Inventory Units', value: dashboardData.kpis?.totalStock?.value?.toLocaleString() || '0', icon: <DatabaseOutlined className="text-blue-500" /> },
            { label: 'Total Revenue', value: `$${dashboardData.kpis?.totalRevenue?.value?.toLocaleString() || '0'}`, icon: <RiseOutlined className="text-green-500" /> },
            { label: 'Open Orders', value: dashboardData.kpis?.pendingOrders?.value || '0', icon: <ShoppingCartOutlined className="text-purple-500" /> },
            { label: 'Stock Alerts', value: dashboardData.kpis?.lowStockItems?.value || '0', icon: <WarningOutlined className="text-red-500" />, color: 'text-red-600' },
          ].map((item, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card bordered={false} className="shadow-sm rounded-[2rem] bg-slate-50 border-none hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-3 mb-4 text-gray-400">
                  <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{item.label}</span>
                </div>
                <div className={`text-4xl font-black tracking-tighter ${item.color || 'text-slate-900'}`}>{item.value}</div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* DATA GRID */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-800">System Totals</h2>
        </div>
        <Row gutter={[20, 20]} className="mb-8">
          {[
            { label: 'Products', count: dashboardData.totals.products, icon: <BoxPlotOutlined />, link: '/products', color: 'text-blue-500' },
            { label: 'Customers', count: dashboardData.totals.customers, icon: <TeamOutlined />, link: '/customers', color: 'text-green-500' },
            { label: 'Suppliers', count: dashboardData.totals.suppliers, icon: <ShopOutlined />, link: '/suppliers', color: 'text-orange-500' },
            { label: 'Brands', count: dashboardData.totals.brands, icon: <CrownOutlined />, link: '/inventory', color: 'text-yellow-500' },
            { label: 'Warehouses', count: dashboardData.totals.warehouses, icon: <CarOutlined />, link: '/warehouses', color: 'text-indigo-500' },
            { label: 'Users', count: dashboardData.totals.users, icon: <UserOutlined />, link: '/users', color: 'text-purple-500' },
          ].map((item, idx) => (
            <Col xs={12} sm={8} lg={4} key={idx}>
              <Link to={item.link}>
                <Card hoverable bordered={true} className="text-center shadow-sm rounded-xl border-gray-50 py-2 hover:border-blue-200 transition-all">
                  <div className={`${item.color} mb-1 opacity-80`}>{item.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{item.count}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">{item.label}</div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>

        {/* ANALYTICS SECTION */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} lg={16}>
            <Card title={<span className="font-bold text-gray-700">Sales Trend</span>} bordered={true} className="shadow-sm rounded-xl">
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.salesTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      fillOpacity={1}
                      fill="url(#colorRev)"
                      strokeWidth={3}
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<span className="font-bold text-gray-700">Top Products</span>} bordered={true} className="shadow-sm rounded-xl flex flex-col h-full">
              <div className="flex flex-col gap-5 mt-4">
                {dashboardData.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-gray-600 truncate font-medium">{p.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono uppercase">{p.sku}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                        <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded text-xs">{p.sold} Units</span>
                        <span className="text-[10px] text-green-600 font-bold">${Number(p.revenue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* RECENT DATA */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card
              title={<span className="font-bold text-gray-700">Recent Orders</span>}
              bordered={true}
              className="shadow-sm rounded-xl"
              extra={<Link to="/sales-orders" className="text-blue-600 text-xs font-semibold hover:underline">View All</Link>}
            >
              <Table
                dataSource={dashboardData.recentOrders}
                pagination={false}
                size="middle"
                className="mt-2"
                rowKey="id"
                columns={[
                  { title: 'Order #', dataIndex: 'orderNumber', render: (v) => <span className="font-bold text-blue-600">{v}</span> },
                  { title: 'Customer', dataIndex: 'customer' },
                  { title: 'Total', dataIndex: 'total', render: (v) => <span className="font-medium">${v?.toLocaleString()}</span> },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    render: (v) => {
                      let color = 'default';
                      if (v === 'SHIPPED') color = 'green';
                      if (v === 'PROCESSING') color = 'blue';
                      if (v === 'PENDING') color = 'orange';
                      if (v === 'DELIVERED') color = 'cyan';
                      return <Tag color={color} bordered={false} className="uppercase text-[10px] font-bold rounded-full px-3">{v}</Tag>;
                    }
                  }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<span className="font-bold text-gray-700">Recent Activity</span>} bordered={true} className="shadow-sm rounded-xl h-full">
              <Timeline
                className="mt-6"
                items={dashboardData.recentActivity.map(item => ({
                  color: item.color,
                  children: (
                    <div className="text-xs pb-4">
                      <div className="font-bold text-gray-800 mb-0.5">{item.action}</div>
                      <div className="text-gray-400 flex items-center gap-1">
                        <UserOutlined style={{ fontSize: 10 }} /> {item.user} • {item.time}
                      </div>
                    </div>
                  )
                }))}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
}
