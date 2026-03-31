// Role-based access control configuration

export const ROLE_ACTIONS = {
    'super_admin': ['create', 'read', 'update', 'delete'],
    'company_admin': ['create', 'read', 'update', 'delete'],
    'warehouse_manager': ['create', 'read', 'update', 'delete'],
    'inventory_manager': ['create', 'read', 'update', 'delete'],
    'admin': ['create', 'read', 'update', 'delete'],
    'manager': ['create', 'read', 'update'],
    'picker': ['read', 'update'],
    'packer': ['read', 'update'],
    'warehouse_staff': ['create', 'read', 'update'],
    'viewer': ['read'],
};

export const ROLE_FEATURES = {
    'super_admin': ['company_management', 'user_management', 'system_settings', 'all_companies', 'delete_records'],
    'company_admin': ['user_management', 'company_settings', 'delete_records'],
    'warehouse_manager': ['user_management', 'warehouse_settings', 'delete_records'],
    'inventory_manager': ['inventory_settings', 'delete_records'],
    'admin': ['user_management', 'system_settings', 'delete_records'],
    'manager': ['daily_operations'],
    'picker': ['picking_operations'],
    'packer': ['packing_operations'],
    'warehouse_staff': ['warehouse_operations'],
    'viewer': ['view_reports'],
};

const ALL_ROLES = ['super_admin', 'company_admin', 'warehouse_manager', 'inventory_manager', 'admin', 'manager', 'picker', 'packer', 'warehouse_staff', 'viewer'];
const ADMIN_ROLES = ['super_admin', 'company_admin', 'admin'];
const USER_MANAGEMENT_ROLES = ['super_admin', 'company_admin', 'warehouse_manager', 'admin'];
const MANAGEMENT_ROLES = ['super_admin', 'company_admin', 'warehouse_manager', 'inventory_manager', 'admin', 'manager'];
const FULL_ACCESS_ROLES = ['super_admin', 'company_admin', 'warehouse_manager', 'inventory_manager', 'admin', 'manager', 'warehouse_staff'];
const PICKER_ROUTES = ['picker', ...MANAGEMENT_ROLES];
const PACKER_ROUTES = ['packer', ...MANAGEMENT_ROLES];
const VIEWER_ROUTES = ['viewer', ...MANAGEMENT_ROLES];

export const ROUTE_PERMISSIONS = {
    '/dashboards/super-admin': ['super_admin'],
    '/dashboards/company': ['company_admin'],
    '/dashboards/inventory-manager': ['inventory_manager'],
    '/dashboards/picker': PICKER_ROUTES,
    '/dashboards/packer': PACKER_ROUTES,
    '/dashboards/manager': ['warehouse_manager', ...MANAGEMENT_ROLES],
    '/dashboards/warehouse-staff': ['warehouse_staff', ...MANAGEMENT_ROLES],
    '/dashboards/viewer': VIEWER_ROUTES,
    '/dashboard': ALL_ROLES,
    '/profile': ALL_ROLES,
    '/settings': FULL_ACCESS_ROLES,
    '/users': USER_MANAGEMENT_ROLES,
    '/roles': ADMIN_ROLES,
    '/companies': ['super_admin', 'company_admin'],
    '/warehouses': FULL_ACCESS_ROLES,
    '/inventory': FULL_ACCESS_ROLES,
    '/inventory/by-best-before-date': FULL_ACCESS_ROLES,
    '/inventory/by-location': FULL_ACCESS_ROLES,
    '/inventory/adjustments': FULL_ACCESS_ROLES,
    '/inventory/cycle-counts': FULL_ACCESS_ROLES,
    '/inventory/batches': FULL_ACCESS_ROLES,
    '/products': FULL_ACCESS_ROLES,
    '/products/add': FULL_ACCESS_ROLES,
    '/products/import-export': FULL_ACCESS_ROLES,
    '/purchase-orders': FULL_ACCESS_ROLES,
    '/goods-receiving': FULL_ACCESS_ROLES,
    '/suppliers': FULL_ACCESS_ROLES,
    '/sales-orders': FULL_ACCESS_ROLES,
    '/customers': FULL_ACCESS_ROLES,
    '/clients': FULL_ACCESS_ROLES,
    '/picking': PICKER_ROUTES,
    '/packing': PACKER_ROUTES,
    '/shipments': PACKER_ROUTES,
    '/returns': FULL_ACCESS_ROLES,
    '/transfers': FULL_ACCESS_ROLES,
    '/replenishment': FULL_ACCESS_ROLES,
    '/replenishment/tasks': FULL_ACCESS_ROLES,
    '/replenishment/settings': FULL_ACCESS_ROLES,
    '/integrations': MANAGEMENT_ROLES,
    '/analytics': VIEWER_ROUTES,
    '/reports': VIEWER_ROUTES,
    '/vat-codes': ['super_admin', 'company_admin', 'warehouse_manager', 'inventory_manager', 'viewer'],
    '/scanner': ALL_ROLES,
    '/scan': ALL_ROLES,
    '/fast-scan': ALL_ROLES,
    '/production': FULL_ACCESS_ROLES,
    '/auth/login': ALL_ROLES,
    '/auth/register': ALL_ROLES,
    '/auth/forgot-password': ALL_ROLES,
};

export function getDefaultRouteForRole(role) {
    const normalizedRole = normalizeRole(role);
    switch (normalizedRole) {
        case 'super_admin': return '/dashboards/super-admin';
        case 'company_admin': return '/dashboards/company';
        case 'inventory_manager': return '/dashboards/inventory-manager';
        case 'warehouse_manager': return '/dashboards/manager';
        case 'picker': return '/dashboards/picker';
        case 'packer': return '/dashboards/packer';
        case 'viewer': return '/dashboards/viewer';
        case 'warehouse_staff': return '/dashboards/warehouse-staff';
        default: return '/dashboard';
    }
}

export function normalizeRole(role) {
    return role.toLowerCase().replace(/-/g, '_');
}

export function hasRoutePermission(userRole, route) {
    if (!userRole) return false;
    const normalizedRole = normalizeRole(userRole);
    let allowedRoles = ROUTE_PERMISSIONS[route];
    if (!allowedRoles) {
        const parentRoutes = Object.keys(ROUTE_PERMISSIONS)
            .filter(r => route.startsWith(r) && r !== '/')
            .sort((a, b) => b.length - a.length);
        if (parentRoutes.length > 0) allowedRoles = ROUTE_PERMISSIONS[parentRoutes[0]];
    }
    if (normalizedRole === 'picker' || normalizedRole === 'packer' || normalizedRole === 'viewer') {
        if (!allowedRoles) return false;
        return allowedRoles.some(role => normalizeRole(role) === normalizedRole);
    }
    if (!allowedRoles) return FULL_ACCESS_ROLES.some(role => normalizeRole(role) === normalizedRole);
    return allowedRoles.some(role => normalizeRole(role) === normalizedRole);
}

export function getAccessibleRoutes(userRole) {
    if (!userRole) return [];
    const normalizedRole = normalizeRole(userRole);
    return Object.entries(ROUTE_PERMISSIONS)
        .filter(([_, roles]) => roles.some(role => normalizeRole(role) === normalizedRole))
        .map(([route]) => route);
}

export function hasAnyRole(userRole, roles) {
    if (!userRole) return false;
    const normalizedUserRole = normalizeRole(userRole);
    return roles.some(role => normalizeRole(role) === normalizedUserRole);
}

export function isAdmin(userRole) { return hasAnyRole(userRole, ADMIN_ROLES); }
export function isManagement(userRole) { return hasAnyRole(userRole, MANAGEMENT_ROLES); }
export function isSuperAdmin(userRole) { return normalizeRole(userRole) === 'super_admin'; }
export function isCompanyAdmin(userRole) { return normalizeRole(userRole) === 'company_admin'; }
export function isInventoryManager(userRole) { return normalizeRole(userRole) === 'inventory_manager'; }
export function isWarehouseManager(userRole) { return normalizeRole(userRole) === 'warehouse_manager'; }
export function isPicker(userRole) { return normalizeRole(userRole) === 'picker'; }
export function isPacker(userRole) { return normalizeRole(userRole) === 'packer'; }
export function isViewer(userRole) { return normalizeRole(userRole) === 'viewer'; }

export function formatRole(role) {
    if (!role) return 'Unknown';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export function getRoleColor(role) {
    const normalizedRole = normalizeRole(role);
    const colors = { 'super_admin': 'gold', 'company_admin': 'blue', 'warehouse_manager': 'green', 'inventory_manager': 'purple', 'admin': 'red', 'manager': 'cyan', 'picker': 'orange', 'packer': 'magenta', 'warehouse_staff': 'geekblue', 'viewer': 'default' };
    return colors[normalizedRole] || 'default';
}

export function getRoleDescription(role) {
    const normalizedRole = normalizeRole(role);
    const descriptions = { 'super_admin': 'Full system access including all companies', 'company_admin': 'Full access to company resources and settings', 'warehouse_manager': 'Manage warehouse operations and staff', 'inventory_manager': 'Manage inventory, products, and stock', 'admin': 'Administrative access to system settings', 'manager': 'Manage daily operations and reports', 'picker': 'Picking tasks only', 'packer': 'Packing and shipping', 'warehouse_staff': 'General warehouse operations access', 'viewer': 'Read-only access to reports and analytics' };
    return descriptions[normalizedRole] || 'Standard user access';
}

export function canPerformAction(userRole, action) {
    if (!userRole) return false;
    const normalizedRole = normalizeRole(userRole);
    const allowedActions = ROLE_ACTIONS[normalizedRole];
    if (!allowedActions) return false;
    return allowedActions.includes(action);
}

export function canDelete(userRole) { return canPerformAction(userRole, 'delete'); }
export function canCreate(userRole) { return canPerformAction(userRole, 'create'); }
export function canUpdate(userRole) { return canPerformAction(userRole, 'update'); }

export function hasFeature(userRole, feature) {
    if (!userRole) return false;
    const normalizedRole = normalizeRole(userRole);
    const features = ROLE_FEATURES[normalizedRole];
    if (!features) return false;
    return features.includes(feature);
}

export function canManageUsers(userRole) {
    return hasFeature(userRole, 'user_management');
}
