/**
 * Mock Data for UI-only mode (add API later)
 */

export const mockUsers = [
    { id: '1', name: 'John Doe', email: 'john@wms.com', role: 'super_admin', company: { id: '1', name: 'Acme Corporation' }, warehouse: { name: 'London Hub' }, status: 'ACTIVE', avatar: null },
    { id: '2', name: 'Sarah Smith', email: 'sarah@wms.com', role: 'warehouse_manager', company: { id: '2', name: 'Global Logistics Ltd' }, warehouse: { name: 'Manchester Depot' }, status: 'ACTIVE', avatar: null },
    { id: '3', name: 'Mike Johnson', email: 'mike@wms.com', role: 'picker', company: { id: '1', name: 'Acme Corporation' }, warehouse: { name: 'London Hub' }, status: 'ACTIVE', avatar: null },
    { id: '4', name: 'Emma Wilson', email: 'emma@wms.com', role: 'packer', company: { id: '3', name: 'Tech Solutions Inc' }, warehouse: { name: 'Birmingham Center' }, status: 'ACTIVE', avatar: null },
];

export const mockRoles = [
    { id: '1', name: 'Super Admin', roleKey: 'super_admin', permissions: ['all'], warehouseAccess: 'all', isSystem: true },
    { id: '2', name: 'Company Admin', roleKey: 'company_admin', permissions: ['company_management', 'user_management'], warehouseAccess: 'all', isSystem: false },
    { id: '3', name: 'Warehouse Manager', roleKey: 'warehouse_manager', permissions: ['manage_inventory', 'view_reports'], warehouseAccess: 'assigned', isSystem: false },
    { id: '4', name: 'Inventory Manager', roleKey: 'inventory_manager', permissions: ['inventory'], warehouseAccess: 'assigned', isSystem: false },
    { id: '5', name: 'Picker', roleKey: 'picker', permissions: ['view_pick_lists'], warehouseAccess: 'assigned', isSystem: false },
    { id: '6', name: 'Packer', roleKey: 'packer', permissions: ['view_pack_lists'], warehouseAccess: 'assigned', isSystem: false },
    { id: '7', name: 'Viewer', roleKey: 'viewer', permissions: ['read'], warehouseAccess: 'none', isSystem: false },
];

export const mockWarehouses = [
    { id: '1', name: 'London Hub', code: 'LDN-001', address: '123 Warehouse St, London', capacity: 50000, status: 'ACTIVE' },
    { id: '2', name: 'Manchester Depot', code: 'MAN-002', address: '456 Storage Ave, Manchester', capacity: 35000, status: 'ACTIVE' },
    { id: '3', name: 'Birmingham Center', code: 'BHM-003', address: '789 Logistics Rd, Birmingham', capacity: 42000, status: 'ACTIVE' },
];

export const mockProducts = [
    { id: '1', name: 'Wireless Headphones', sku: 'WH-001', barcode: '1234567890123', category: 'Electronics', brand: 'TechPro', price: 79.99, stock: 450, reorderLevel: 50, status: 'ACTIVE' },
    { id: '2', name: 'Smart Watch', sku: 'SW-002', barcode: '2345678901234', category: 'Electronics', brand: 'SmartGear', price: 199.99, stock: 320, reorderLevel: 30, status: 'ACTIVE' },
    { id: '3', name: 'Bluetooth Speaker', sku: 'BS-003', barcode: '3456789012345', category: 'Electronics', brand: 'SoundMax', price: 49.99, stock: 280, reorderLevel: 40, status: 'ACTIVE' },
    { id: '4', name: 'Gaming Mouse', sku: 'GM-004', barcode: '4567890123456', category: 'Accessories', brand: 'GamePro', price: 39.99, stock: 210, reorderLevel: 25, status: 'ACTIVE' },
    { id: '5', name: 'USB-C Cable', sku: 'UC-005', barcode: '5678901234567', category: 'Accessories', brand: 'ConnectPlus', price: 12.99, stock: 190, reorderLevel: 100, status: 'ACTIVE' },
];

export const mockCompanies = [
    { id: '1', name: 'Acme Corporation', code: 'ACME', email: 'contact@acme.com', phone: '+44 20 1234 5678', address: '100 Business Park, London', status: 'ACTIVE', createdAt: '2024-01-15' },
    { id: '2', name: 'Global Logistics Ltd', code: 'GLLOG', email: 'info@globallogistics.com', phone: '+44 161 987 6543', address: '50 Trade Center, Manchester', status: 'ACTIVE', createdAt: '2024-02-20' },
    { id: '3', name: 'Tech Solutions Inc', code: 'TECH', email: 'hello@techsolutions.com', phone: '+44 121 555 1234', address: '25 Innovation Hub, Birmingham', status: 'ACTIVE', createdAt: '2024-03-10' },
];

export const mockReports = [
    { id: '1', reportName: 'Monthly Inventory Report', category: 'Inventory', schedule: 'Monthly', format: 'PDF', status: 'ACTIVE', lastRun: '2024-01-25', createdAt: '2024-01-01' },
    { id: '2', name: 'Sales Performance Q1', category: 'Orders', schedule: 'Quarterly', format: 'Excel', status: 'ACTIVE', lastRun: '2024-01-20', createdAt: '2024-01-05' },
    { id: '3', name: 'Low Stock Alert', category: 'Inventory', schedule: 'Daily', format: 'CSV', status: 'ACTIVE', lastRun: '2024-01-28', createdAt: '2024-01-10' },
];

export const mockSettings = [
    { id: '1', key: 'company_name', value: 'Yash Logistics Global', category: 'general' },
    { id: '2', key: 'currency', value: 'GBP', category: 'localization' },
    { id: '3', key: 'scanner_type', value: 'handheld', category: 'hardware' },
];

export const mockLabels = [
    { id: '1', name: 'Shipping Label A4', type: 'shipping', format: 'PDF', size: 'A4', template: 'standard', status: 'ACTIVE' },
    { id: '2', name: 'Product Barcode 50x30', type: 'product', format: 'ZPL', size: '50x30mm', template: 'barcode_only', status: 'ACTIVE' },
    { id: '3', name: 'Pallet Label', type: 'shipping', format: 'PDF', size: 'A5', template: 'pallet', status: 'ACTIVE' },
];

export const mockCustomers = [
    { id: '1', name: 'John Smith', email: 'john.smith@email.com', phone: '+44 7700 900123', address: '10 Customer St, London', totalOrders: 45, status: 'ACTIVE' },
    { id: '2', name: 'Jane Doe', email: 'jane.doe@email.com', phone: '+44 7700 900456', address: '20 Buyer Ave, Manchester', totalOrders: 32, status: 'ACTIVE' },
    { id: '3', name: 'Bob Wilson', email: 'bob.wilson@email.com', phone: '+44 7700 900789', address: '30 Shopper Rd, Birmingham', totalOrders: 28, status: 'ACTIVE' },
];

export const mockSuppliers = [
    { id: '1', name: 'Tech Supplies Ltd', email: 'sales@techsupplies.com', phone: '+44 20 8765 4321', address: '500 Supplier Park, London', productsSupplied: 125, status: 'ACTIVE' },
    { id: '2', name: 'Global Parts Inc', email: 'orders@globalparts.com', phone: '+44 161 234 5678', address: '600 Vendor St, Manchester', productsSupplied: 89, status: 'ACTIVE' },
    { id: '3', name: 'Quality Goods Co', email: 'info@qualitygoods.com', phone: '+44 121 987 6543', address: '700 Trade Ave, Birmingham', productsSupplied: 67, status: 'ACTIVE' },
];

export const mockInventory = [
    { id: '1', product: { name: 'Wireless Headphones', sku: 'WH-001' }, warehouse: { name: 'London Hub' }, quantity: 450, reserved: 50, available: 400, location: 'A-01-05' },
    { id: '2', product: { name: 'Smart Watch', sku: 'SW-002' }, warehouse: { name: 'Manchester Depot' }, quantity: 320, reserved: 30, available: 290, location: 'B-02-10' },
    { id: '3', product: { name: 'Bluetooth Speaker', sku: 'BS-003' }, warehouse: { name: 'Birmingham Center' }, quantity: 280, reserved: 40, available: 240, location: 'C-03-15' },
];

export const mockDashboardStats = {
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
        { id: 1, action: 'System data sync completed', user: 'System', time: 'Just now', color: '#52c41a' },
        { id: 2, action: 'User login: admin@kiaan-wms.com', user: 'Admin', time: '5 mins ago', color: '#1890ff' },
        { id: 3, action: 'New order received: ORD-2024-005', user: 'System', time: '15 mins ago', color: '#faad14' },
    ],
};

// Extra mocks for pages that need list data
export const mockPackingTasks = [
    { id: '1', packingSlip: 'PS-001', orderNumber: 'ORD-001', customer: 'John Smith', status: 'PENDING', items: 3 },
    { id: '2', packingSlip: 'PS-002', orderNumber: 'ORD-002', customer: 'Jane Doe', status: 'IN_PROGRESS', items: 2 },
];
export const mockSalesOrders = [
    { id: '1', orderNumber: 'SO-001', customer: 'John Smith', total: 199.99, status: 'CONFIRMED', createdAt: '2024-01-25' },
    { id: '2', orderNumber: 'SO-002', customer: 'Jane Doe', total: 89.98, status: 'PENDING', createdAt: '2024-01-26' },
];
export const mockPurchaseOrders = [
    { id: '1', poNumber: 'PO-001', supplier: { name: 'Tech Supplies' }, supplierId: '1', total: 1500, totalAmount: 1500, status: 'APPROVED', orderDate: '2024-01-20', createdAt: '2024-01-20' },
];
export const mockClients = [
    { id: '1', name: 'Client A', code: 'CA', email: 'a@client.com', status: 'ACTIVE' },
];
export const mockZones = [
    { id: '1', name: 'Zone A', code: 'Z-A', warehouseId: '1' },
];
export const mockLocations = [
    { id: '1', name: 'A-01-01', zoneId: '1', barcode: 'LOC001' },
];
export const mockCategories = [
    { id: '1', name: 'Electronics', description: 'Electronic items' },
];
export const mockBundles = [];
export const mockShipments = [];
export const mockReturns = [];
export const mockMovements = [];
export const mockAdjustments = [];
export const mockCycleCounts = [];
export const mockGoodsReceiving = [];
export const mockMarketplaceConnections = [];
export const mockPickerStats = { tasksToday: 12, completed: 8 };
export const mockPackerStats = { tasksToday: 10, completed: 6 };
export const mockManagerDashboard = { summary: {}, charts: [] };
export const mockMargins = [];
export const mockBarcodeStats = { scanned: 0 };
