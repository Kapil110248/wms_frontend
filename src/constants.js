// Application constants

export const APP_NAME = 'MAVIE';
export const APP_VERSION = '1.0.0';

// Order statuses
// Order statuses
export const ORDER_STATUSES = [
    { value: 'DRAFT', label: 'Draft', color: 'gray' },
    { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
    { value: 'PICKING_IN_PROGRESS', label: 'Picking In Progress', color: 'purple' },
    { value: 'PICKED', label: 'Picked', color: 'cyan' },
    { value: 'PACKING_IN_PROGRESS', label: 'Packing In Progress', color: 'orange' },
    { value: 'PACKED', label: 'Packed', color: 'green' },
    { value: 'SHIPPED', label: 'Shipped', color: 'blue' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
];

export const PICK_LIST_STATUSES = [
    { value: 'NOT_STARTED', label: 'Not Started', color: 'gray' },
    { value: 'ASSIGNED', label: 'Assigned', color: 'blue' },
    { value: 'PARTIALLY_PICKED', label: 'Partially Picked', color: 'orange' },
    { value: 'PICKED', label: 'Picked', color: 'green' },
];

export const PACKING_STATUSES = [
    { value: 'NOT_STARTED', label: 'Not Started', color: 'gray' },
    { value: 'PACKING', label: 'Packing', color: 'orange' },
    { value: 'PACKED', label: 'Packed', color: 'green' },
    { value: 'ON_HOLD', label: 'On Hold', color: 'red' },
];

export const SHIPMENT_STATUSES = [
    { value: 'READY_TO_SHIP', label: 'Ready to Ship', color: 'blue' },
    { value: 'SHIPPED', label: 'Shipped', color: 'cyan' },
    { value: 'IN_TRANSIT', label: 'In Transit', color: 'purple' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'FAILED', label: 'Failed', color: 'red' },
    { value: 'RETURNED', label: 'Returned', color: 'red' },
];

// Inventory statuses
export const INVENTORY_STATUSES = [
    { value: 'available', label: 'Available', color: 'green' },
    { value: 'reserved', label: 'Reserved', color: 'blue' },
    { value: 'quarantine', label: 'Quarantine', color: 'orange' },
    { value: 'damaged', label: 'Damaged', color: 'red' },
    { value: 'expired', label: 'Expired', color: 'red' },
];

// Priority levels
export const PRIORITY_LEVELS = [
    { value: 'LOW', label: 'Low', color: 'gray' },
    { value: 'MEDIUM', label: 'Medium', color: 'blue' },
    { value: 'HIGH', label: 'High', color: 'orange' },
    { value: 'URGENT', label: 'Urgent', color: 'red' },
];

// User roles
export const USER_ROLES = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'company_admin', label: 'Company Admin' },
    { value: 'warehouse_manager', label: 'Warehouse Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'warehouse_staff', label: 'Operations Staff' },
    { value: 'picker', label: 'Picker' },
    { value: 'packer', label: 'Packer' },
    { value: 'viewer', label: 'Viewer' },
];

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Chart colors
export const CHART_COLORS = {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    purple: '#722ed1',
    cyan: '#13c2c2',
    orange: '#fa8c16',
    green: '#52c41a',
    blue: '#1890ff',
    red: '#f5222d',
};

export const CHART_COLOR_PALETTE = [
    '#1890ff',
    '#52c41a',
    '#faad14',
    '#f5222d',
    '#722ed1',
    '#13c2c2',
    '#fa8c16',
    '#2f54eb',
    '#eb2f96',
    '#a0d911',
];

// Date formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

// Local storage keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'wms_auth_token',
    USER: 'wms_user',
    THEME: 'wms_theme',
    SIDEBAR_COLLAPSED: 'wms_sidebar_collapsed',
    SELECTED_WAREHOUSE: 'wms_selected_warehouse',
    SELECTED_COMPANY: 'wms_selected_company',
    TABLE_PREFERENCES: 'wms_table_preferences',
};
