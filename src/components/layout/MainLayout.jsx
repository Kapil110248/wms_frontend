import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Input, Button, Drawer, Space, theme } from 'antd';
import {
    DashboardOutlined,
    ShopOutlined,
    InboxOutlined,
    ShoppingCartOutlined,
    SettingOutlined,
    UserOutlined,
    BellOutlined,
    SearchOutlined,
    MenuOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
    HomeOutlined,
    AppstoreOutlined,
    BoxPlotOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    TeamOutlined,
    CarOutlined,
    UndoOutlined,
    PrinterOutlined,
    ContactsOutlined,
    UsergroupAddOutlined,
    ApiOutlined,
    DollarOutlined,
    ThunderboltOutlined,
    ScanOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { APP_NAME } from '../../constants';
import { hasRoutePermission, isPicker, isPacker, isViewer, isSuperAdmin, isCompanyAdmin, isInventoryManager, isWarehouseManager } from '../../permissions';
import { apiRequest } from '../../api/client';
import logoImg from '../../assets/newlogo-removebg-preview.png';
import GoogleTranslate from '../GoogleTranslate';
import NotificationDropdown from './NotificationDropdown';

const { Header, Sider, Content, Footer } = Layout;

export const MainLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, token } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const [openKeys, setOpenKeys] = useState([]);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ orders: [], products: [], customers: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchDropdownVisible, setSearchDropdownVisible] = useState(false);
    const searchContainerRef = useRef(null);

    // Current path ka parent submenu open rakho – ek hi submenu open (accordion)
    useEffect(() => {
        const path = location.pathname;
        if (path === '/integrations' || path.startsWith('/integrations/')) {
            setOpenKeys(['nav-integrations']);
            return;
        }
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length >= 1) {
            const parentKey = pathParts.length > 1 ? `nav-${pathParts[0]}` : null;
            setOpenKeys(parentKey ? [parentKey] : []);
        }
    }, [location.pathname]);

    const handleMenuClick = ({ key }) => {
        if (key.startsWith('/')) {
            navigate(key);
            setMobileDrawerOpen(false);
        }
    };

    const runSearch = async () => {
        const term = searchQuery.trim();
        if (!term) {
            setSearchDropdownVisible(false);
            return;
        }
        setSearchLoading(true);
        setSearchDropdownVisible(true);
        try {
            const res = await apiRequest(`/api/search?q=${encodeURIComponent(term)}`, { method: 'GET' }, token);
            setSearchResults(res.data || { orders: [], products: [], customers: [] });
        } catch {
            setSearchResults({ orders: [], products: [], customers: [] });
        } finally {
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setSearchDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = () => setIsMobile(mq.matches);
        mq.addEventListener('change', handler);
        handler();
        return () => mq.removeEventListener('change', handler);
    }, []);

    const canAccessMenuItem = (route) => {
        if (!user?.role) return false;
        return hasRoutePermission(user.role, route);
    };

    const filterMenuChildren = (children) => {
        return children.filter(child => {
            if (typeof child.key === 'string' && child.key.startsWith('/')) {
                return canAccessMenuItem(child.key);
            }
            return true;
        });
    };

    const getPickerMenu = () => [
        { key: '/dashboards/picker', icon: <DashboardOutlined />, label: 'My Dashboard' },
        { key: '/fast-scan', icon: <ScanOutlined />, label: <span className="font-bold text-blue-500">Fast Scan</span> },
        { key: '/picking', icon: <BoxPlotOutlined />, label: 'Pick Lists' },
    ];

    const getPackerMenu = () => [
        { key: '/dashboards/packer', icon: <DashboardOutlined />, label: 'My Dashboard' },
        { key: '/fast-scan', icon: <ScanOutlined />, label: <span className="font-bold text-blue-500">Fast Scan</span> },
        { key: '/packing', icon: <BoxPlotOutlined />, label: 'Packing Tasks' },
    ];

    const getViewerMenu = () => [
        { key: '/dashboards/viewer', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/sales-orders', icon: <ShoppingCartOutlined />, label: 'Orders Overview' },
        { key: '/inventory', icon: <DatabaseOutlined />, label: 'Stock Overview' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        {
            key: 'nav-analytics',
            icon: <BarChartOutlined />,
            label: 'Analytics & Revenue',
            children: [
                { key: '/analytics/pricing-calculator', label: 'Pricing Calculator' },
                { key: '/analytics/margins', label: 'Margin Analysis' },
            ],
        },
    ];

    const getSuperAdminMenu = () => [
        { key: '/dashboards/super-admin', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/companies', icon: <ShopOutlined />, label: 'Company Management' },
        { key: '/users', icon: <TeamOutlined />, label: 'User Management' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'System Settings' },
    ];

    const getCompanyAdminMenu = () => [
        { key: '/dashboards/company', icon: <DashboardOutlined />, label: 'Dashboard' },
        {
            key: 'nav-users',
            icon: <TeamOutlined />,
            label: 'Users & Access',
            children: [
                { key: '/users', label: 'User Management' },
                { key: '/roles', label: 'Roles' },
            ],
        },
        {
            key: 'nav-warehouses',
            icon: <HomeOutlined />,
            label: 'Warehouses',
            children: [
                { key: '/warehouses', label: 'All Categories' },
                { key: '/warehouses/zones', label: 'Zones' },
                { key: '/warehouses/locations', label: 'Locations' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
    ];

    const getInventoryManagerMenu = () => [
        { key: '/dashboards/inventory-manager', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#00FF00' }} />, label: 'Stock In' },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#FF0000' }} />, label: 'Stock Out' },
        {
            key: 'nav-warehouses',
            icon: <HomeOutlined />,
            label: 'Warehouses',
            children: [
                { key: '/warehouses/locations', label: 'Warehouse Management' },
            ],
        },
        {
            key: 'nav-products',
            icon: <AppstoreOutlined />,
            label: 'Products',
            children: [
                { key: '/products', label: 'Add/Edit Products' },
                { key: '/products/categories', label: 'SKU / Categories' },
                { key: '/products/import-export', label: 'Import/Export' },
            ],
        },
        {
            key: 'nav-manufacturing',
            icon: <BoxPlotOutlined />,
            label: 'Manufacturing',
            children: [
                { key: '/production/formulas', label: 'Formulas' },
                { key: '/production', label: 'Production Orders' },
            ],
        },
        { key: '/fast-scan', icon: <ScanOutlined />, label: <span className="font-bold text-blue-500">Fast Scan</span> },
        { key: '/inventory/live', icon: <BarChartOutlined />, label: 'Live Stock' },
        { key: '/suppliers', icon: <ContactsOutlined />, label: 'Suppliers' },
        { key: '/predictions', icon: <ThunderboltOutlined />, label: 'Smart Reorder (AI)' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
    ];

    const getWarehouseManagerMenu = () => [
        { key: '/dashboards/manager', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#00FF00' }} />, label: 'Stock In' },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#FF0000' }} />, label: 'Stock Out' },
        { key: '/fast-scan', icon: <ScanOutlined />, label: <span className="font-bold text-blue-500">Fast Scan</span> },
        { key: '/inventory/live', icon: <BarChartOutlined />, label: 'Live Stock' },
        {
            key: 'nav-manufacturing',
            icon: <BoxPlotOutlined />,
            label: 'Manufacturing',
            children: [
                { key: '/production/formulas', label: 'Formulas' },
                { key: '/production', label: 'Production Orders' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Productivity Report' },
    ];

    const getProductionMenu = () => [
        { key: '/production', icon: <BoxPlotOutlined />, label: 'Manufacturing Orders' },
        { key: '/production/formulas', icon: <ThunderboltOutlined />, label: 'Formulas' },
        { key: '/fast-scan', icon: <ScanOutlined />, label: <span className="font-bold text-blue-500">Fast Scan</span> },
        { key: '/inventory/live', icon: <BarChartOutlined />, label: 'Live Stock' },
    ];

    const allMenuItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#00FF00' }} />, label: <span className="font-bold text-green-500">Stock In</span> },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#FF0000' }} />, label: <span className="font-bold text-red-500">Stock Out</span> },
        { key: '/companies', icon: <ShopOutlined />, label: 'Company Management' },
        {
            key: 'nav-warehouses',
            icon: <HomeOutlined />,
            label: 'Warehouses',
            children: [
                { key: '/warehouses', label: 'All Categories' },
                { key: '/warehouses/zones', label: 'Zones' },
                { key: '/warehouses/locations', label: 'Locations' },
            ],
        },
        {
            key: 'nav-products',
            icon: <AppstoreOutlined />,
            label: 'Products',
            children: [
                { key: '/products', label: 'All Products' },
                { key: '/products/categories', label: 'Categories' },
                { key: '/products/bundles', label: 'Bundles' },
                { key: '/products/import-export', label: 'Import/Export' },
            ],
        },
        {
            key: 'nav-orders',
            icon: <ShoppingCartOutlined />,
            label: 'Orders',
            children: [
                { key: '/purchase-orders', label: 'Purchase Orders' },
                { key: '/sales-orders', label: 'Sales Orders' },
                { key: '/shipments', label: 'Shipments' },
                { key: '/returns', label: 'Returns' },
                { key: '/goods-receiving', label: 'Goods Receiving' },
            ],
        },
        {
            key: 'nav-manufacturing',
            icon: <BoxPlotOutlined />,
            label: 'Manufacturing',
            children: [
                { key: '/production/formulas', label: 'Formulas' },
                { key: '/production', label: 'Production Orders' },
            ],
        },
        { key: '/fast-scan', icon: <ScanOutlined />, label: <span className="font-bold text-blue-500">Fast Scan</span> },
        { key: '/inventory/live', icon: <BarChartOutlined />, label: 'Live Stock' },
        { key: '/suppliers', icon: <ContactsOutlined />, label: 'Suppliers' },
        {
            key: 'nav-inventory',
            icon: <DatabaseOutlined />,
            label: 'Inventory',
            children: [
                { key: '/inventory', label: 'Overview' },
                { key: '/inventory/by-best-before-date', label: 'By Best Before Date' },
                { key: '/inventory/by-location', label: 'By Location' },
                { key: '/inventory/adjustments', label: 'Adjustments' },
                { key: '/inventory/cycle-counts', label: 'Cycle Counts' },
                { key: '/inventory/batches', label: 'Batches' },
                { key: '/inventory/movements', label: 'Movements' },
            ],
        },
        { key: '/predictions', icon: <ThunderboltOutlined style={{ color: '#f59e0b' }} />, label: <span className="font-semibold text-amber-500">Predictions</span> },
        {
            key: 'nav-integrations',
            icon: <ApiOutlined />,
            label: 'Integrations',
            children: [
                { key: '/integrations', label: 'Amazon & Shopify' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
        {
            key: 'nav-users',
            icon: <TeamOutlined />,
            label: 'Users & Access',
            children: [
                { key: '/users', label: 'User Management' },
                { key: '/roles', label: 'Roles' },
            ],
        },
    ];

    const getMenuItems = () => {
        const userRole = user?.role || '';
        if (isSuperAdmin(userRole)) return getSuperAdminMenu();
        // Company Admin: full menu jitna pehle dikh raha tha, sirf Company Management hatao
        if (isCompanyAdmin(userRole)) {
            return allMenuItems
                .filter(item => item.key !== '/companies')
                .map(item => {
                    if (item.children) {
                        const filteredChildren = filterMenuChildren(item.children);
                        return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
                    }
                    if (typeof item.key === 'string' && item.key.startsWith('/')) {
                        return canAccessMenuItem(item.key) ? item : null;
                    }
                    return item;
                })
                .filter(Boolean);
        }
        if (isInventoryManager(userRole)) return getInventoryManagerMenu();
        if (isWarehouseManager(userRole)) return getWarehouseManagerMenu();
        if (isPicker(userRole)) return getPickerMenu();
        if (isPacker(userRole)) return getPackerMenu();
        if (isViewer(userRole)) return getViewerMenu();
        if (userRole.toLowerCase() === 'production') return getProductionMenu();

        return allMenuItems.map(item => {
            if (item.children) {
                const filteredChildren = filterMenuChildren(item.children);
                return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
            }
            if (typeof item.key === 'string' && item.key.startsWith('/')) {
                return canAccessMenuItem(item.key) ? item : null;
            }
            return item;
        }).filter(Boolean);
    };

    const menuItems = getMenuItems();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const userMenuItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
        { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => navigate('/settings') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: handleLogout },
    ];


    return (
        <Layout className="min-h-screen bg-gray-50">
            <Sider
                trigger={null}
                collapsible
                collapsed={sidebarCollapsed}
                width={260}
                collapsedWidth={80}
                className="shadow-xl bg-slate-900 border-r border-slate-700/80 hidden md:block"
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 101,
                    background: 'linear-gradient(180deg, #0f172a 0%, #0c1222 100%)',
                }}
            >
                <div className="h-[90px] flex items-center justify-center transition-all duration-300 border-b border-slate-700/30 shrink-0 overflow-hidden bg-white/5">
                    <Link to="/dashboard" className="w-full h-full flex items-center justify-center p-2">
                        <img src={logoImg} alt="MAVIE" className="w-full h-full object-contain scale-125" />
                    </Link>
                </div>
                <div className="px-2 pt-0 pb-4">
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        openKeys={openKeys}
                        onOpenChange={(keys) => {
                            const next = keys.length ? [keys[keys.length - 1]] : [];
                            setOpenKeys(next);
                        }}
                        items={menuItems}
                        onClick={handleMenuClick}
                        className="bg-transparent border-none custom-sidebar-menu"
                        style={{ background: 'transparent' }}
                    />
                </div>
            </Sider>
            <Drawer
                title={
                    <div className="flex items-center justify-center w-full py-1">
                        <img src={logoImg} alt="MAVIE" className="h-14 w-auto object-contain" />
                    </div>
                }
                placement="left"
                onClose={() => setMobileDrawerOpen(false)}
                open={mobileDrawerOpen}
                width={280}
                className="mobile-sidebar-drawer"
                styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #0f172a 0%, #0c1222 100%)', height: '100%', overflowY: 'auto' }, header: { background: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' } }}
                closeIcon={<span className="text-white text-xl leading-none">×</span>}
            >
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    openKeys={openKeys}
                    onOpenChange={(keys) => setOpenKeys(keys.length ? [keys[keys.length - 1]] : [])}
                    items={menuItems}
                    onClick={handleMenuClick}
                    className="bg-transparent border-none custom-sidebar-menu mt-2"
                    style={{ background: 'transparent' }}
                />
            </Drawer>

            <Layout id="print-layout-root" className="transition-all duration-300" style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 260) }}>
                <Header className="bg-white border-b border-gray-100 px-4 sm:px-6 flex items-center justify-between h-14 sticky top-0 z-[100]">
                    {/* Left: hamburger */}
                    <Button
                        type="text"
                        icon={isMobile ? <MenuOutlined /> : (sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
                        onClick={() => (isMobile ? setMobileDrawerOpen(true) : toggleSidebar())}
                        className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg w-9 h-9 flex items-center justify-center shrink-0"
                    />

                    {/* Center: search */}
                    <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-md mx-4 relative">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onPressEnter={runSearch}
                            placeholder="Search SKU, product, or location..."
                            prefix={<SearchOutlined className="text-gray-400" />}
                            className="rounded-lg bg-gray-50 border-gray-200"
                            allowClear
                        />
                        {searchDropdownVisible && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-[200] max-h-80 overflow-y-auto">
                                {searchLoading ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
                                ) : (
                                    <>
                                        {searchResults.orders?.length > 0 && (
                                            <div className="p-2 border-b border-gray-50">
                                                <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</div>
                                                {searchResults.orders.map((o) => (
                                                    <div key={o.id} className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onClick={() => { navigate(`/sales-orders?highlight=${o.id}`); setSearchDropdownVisible(false); }}>
                                                        <span className="font-medium text-gray-800">{o.orderNumber}</span>{o.referenceNumber && <span className="text-gray-400 ml-1">· {o.referenceNumber}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.products?.length > 0 && (
                                            <div className="p-2 border-b border-gray-50">
                                                <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Products</div>
                                                {searchResults.products.map((p) => (
                                                    <div key={p.id} className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onClick={() => { navigate(`/products?highlight=${p.id}`); setSearchDropdownVisible(false); }}>
                                                        <span className="font-medium text-gray-800">{p.name}</span> <span className="text-gray-400 text-xs">{p.sku}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.customers?.length > 0 && (
                                            <div className="p-2">
                                                <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customers</div>
                                                {searchResults.customers.map((c) => (
                                                    <div key={c.id} className="px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm" onClick={() => { navigate(`/customers?highlight=${c.id}`); setSearchDropdownVisible(false); }}>
                                                        <span className="font-medium text-gray-800">{c.name}</span>{c.email && <span className="text-gray-400 ml-1">· {c.email}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {!searchLoading && !searchResults.orders?.length && !searchResults.products?.length && !searchResults.customers?.length && searchQuery.trim() && (
                                            <div className="p-4 text-center text-gray-400 text-sm">No results found</div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: language + bell + user */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Google Translate Widget */}
                        <GoogleTranslate />

                        <NotificationDropdown />

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <div className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 py-1.5 px-2 rounded-xl transition-colors">
                                <Avatar
                                    size={34}
                                    style={{ background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: 13 }}
                                >
                                    {(user?.name || 'U').charAt(0).toUpperCase()}
                                </Avatar>
                                <div className="hidden sm:block leading-tight">
                                    <div className="text-xs font-semibold text-gray-800 leading-none">{user?.name || 'User'}</div>
                                    <div className="text-[11px] text-gray-400 mt-0.5 capitalize">{(user?.role || '').replace(/_/g, ' ')}</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="p-8 min-h-[calc(100vh-56px)] overflow-x-hidden relative">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </Content>

                <Footer className="bg-white py-4 px-8 border-t border-gray-100 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} <span className="text-gray-600 font-medium">{APP_NAME}</span>. All rights reserved.
                </Footer>
            </Layout>
        </Layout>
    );
};
