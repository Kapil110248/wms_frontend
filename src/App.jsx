import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const Companies = lazy(() => import('./pages/Companies'));
const SuperAdminDashboard = lazy(() => import('./pages/dashboards/SuperAdminDashboard'));
const CompanyDashboard = lazy(() => import('./pages/dashboards/CompanyDashboard'));
const InventoryManagerDashboard = lazy(() => import('./pages/dashboards/InventoryManagerDashboard'));
const PickerDashboard = lazy(() => import('./pages/dashboards/PickerDashboard'));
const PackerDashboard = lazy(() => import('./pages/dashboards/PackerDashboard'));
const ManagerDashboard = lazy(() => import('./pages/dashboards/ManagerDashboard'));
const WarehouseStaffDashboard = lazy(() => import('./pages/dashboards/WarehouseStaffDashboard'));
const ViewerDashboard = lazy(() => import('./pages/dashboards/ViewerDashboard'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const WarehouseZones = lazy(() => import('./pages/warehouses/Zones'));
const WarehouseLocations = lazy(() => import('./pages/warehouses/Locations'));
const WarehouseDetail = lazy(() => import('./pages/warehouses/WarehouseDetail'));
const InventoryAdjustments = lazy(() => import('./pages/inventory/Adjustments'));
const InventoryCycleCounts = lazy(() => import('./pages/inventory/CycleCounts'));
const InventoryBatches = lazy(() => import('./pages/inventory/Batches'));
const InventoryMovements = lazy(() => import('./pages/inventory/Movements'));
const InventoryByBestBeforeDate = lazy(() => import('./pages/inventory/ByBestBeforeDate'));
const InventoryByLocation = lazy(() => import('./pages/inventory/ByLocation'));
const ProductCategories = lazy(() => import('./pages/products/Categories'));
const ProductBundles = lazy(() => import('./pages/products/Bundles'));
const ImportExportProducts = lazy(() => import('./pages/products/ImportExportProducts'));
const AddProduct = lazy(() => import('./pages/products/AddProduct'));
const EditProduct = lazy(() => import('./pages/products/EditProduct'));
const ViewProduct = lazy(() => import('./pages/products/ViewProduct'));
const Clients = lazy(() => import('./pages/Clients'));
const AnalyticsPricing = lazy(() => import('./pages/analytics/PricingCalculator'));
const AnalyticsMargins = lazy(() => import('./pages/analytics/MarginAnalysis'));
const Reports = lazy(() => import('./pages/Reports'));
const VatCodes = lazy(() => import('./pages/settings/VatCodes'));
const MarketplaceApi = lazy(() => import('./pages/integrations/MarketplaceApi'));
const Roles = lazy(() => import('./pages/Roles'));
const Products = lazy(() => import('./pages/Products'));
const Predictions = lazy(() => import('./pages/Predictions'));
const Inventory = lazy(() => import('./pages/Inventory'));
const SalesOrders = lazy(() => import('./pages/outbound/SalesOrders'));
const CreateSalesOrder = lazy(() => import('./pages/outbound/CreateSalesOrder'));
const EditSalesOrder = lazy(() => import('./pages/outbound/EditSalesOrder'));
const ViewSalesOrder = lazy(() => import('./pages/outbound/ViewSalesOrder'));
const Users = lazy(() => import('./pages/Users'));
const Picking = lazy(() => import('./pages/Picking'));
const PickingDetail = lazy(() => import('./pages/PickingDetail'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const PurchaseOrders = lazy(() => import('./pages/inbound/PurchaseOrders'));
const GoodsReceiving = lazy(() => import('./pages/inbound/GoodsReceiving'));
const Packing = lazy(() => import('./pages/outbound/Packing'));
const Shipments = lazy(() => import('./pages/outbound/Shipments'));
const Returns = lazy(() => import('./pages/outbound/Returns'));
const ReplenishmentTasks = lazy(() => import('./pages/replenishment/Tasks'));
const ReplenishmentSettings = lazy(() => import('./pages/replenishment/Settings'));
const Settings = lazy(() => import('./pages/Settings'));
const ScanScreen = lazy(() => import('./pages/ScanScreen'));
const StockIn = lazy(() => import('./pages/StockIn'));
const StockOut = lazy(() => import('./pages/StockOut'));
const LiveStock = lazy(() => import('./pages/inventory/LiveStock'));
const Production = lazy(() => import('./pages/Production'));
const ProductionFormulas = lazy(() => import('./pages/products/Formulas'));
const FastScan = lazy(() => import('./pages/FastScan'));



// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
    </div>
);

function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                {/* <Route path="/auth/register" element={<RegisterPage />} /> */}
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

                {/* Protected Routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/companies"
                    element={
                        <ProtectedRoute>
                            <Companies />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboards/picker"
                    element={
                        <ProtectedRoute>
                            <PickerDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboards/packer"
                    element={
                        <ProtectedRoute>
                            <PackerDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/dashboards/super-admin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
                <Route path="/dashboards/company" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
                <Route path="/dashboards/inventory-manager" element={<ProtectedRoute><InventoryManagerDashboard /></ProtectedRoute>} />
                <Route path="/dashboards/viewer" element={<ProtectedRoute><ViewerDashboard /></ProtectedRoute>} />
                <Route
                    path="/dashboards/manager"
                    element={
                        <ProtectedRoute>
                            <ManagerDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboards/warehouse-staff"
                    element={
                        <ProtectedRoute>
                            <WarehouseStaffDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/warehouses"
                    element={
                        <ProtectedRoute>
                            <Warehouses />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/warehouses/:id"
                    element={
                        <ProtectedRoute>
                            <WarehouseDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/warehouses/zones"
                    element={
                        <ProtectedRoute>
                            <WarehouseZones />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <Products />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/predictions"
                    element={
                        <ProtectedRoute>
                            <Predictions />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products/add"
                    element={
                        <ProtectedRoute>
                            <AddProduct />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products/:id/edit"
                    element={
                        <ProtectedRoute>
                            <EditProduct />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products/:id"
                    element={
                        <ProtectedRoute>
                            <ViewProduct />
                        </ProtectedRoute>
                    }
                />
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/inventoryProduct" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/sales-orders/new" element={<ProtectedRoute><CreateSalesOrder /></ProtectedRoute>} />
                <Route path="/sales-orders/:id/edit" element={<ProtectedRoute><EditSalesOrder /></ProtectedRoute>} />
                <Route path="/sales-orders/:id" element={<ProtectedRoute><ViewSalesOrder /></ProtectedRoute>} />
                <Route path="/sales-orders" element={<ProtectedRoute><SalesOrders /></ProtectedRoute>} />
                <Route
                    path="/users"
                    element={
                        <ProtectedRoute>
                            <Users />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/picking"
                    element={
                        <ProtectedRoute>
                            <Picking />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/picking/:id"
                    element={
                        <ProtectedRoute>
                            <PickingDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/customers"
                    element={
                        <ProtectedRoute>
                            <Customers />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/suppliers"
                    element={
                        <ProtectedRoute>
                            <Suppliers />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/purchase-orders"
                    element={
                        <ProtectedRoute>
                            <PurchaseOrders />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/goods-receiving"
                    element={
                        <ProtectedRoute>
                            <GoodsReceiving />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/packing"
                    element={
                        <ProtectedRoute>
                            <Packing />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/shipments"
                    element={
                        <ProtectedRoute>
                            <Shipments />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/returns"
                    element={
                        <ProtectedRoute>
                            <Returns />
                        </ProtectedRoute>
                    }
                />
                <Route path="/replenishment/tasks" element={<ProtectedRoute><ReplenishmentTasks /></ProtectedRoute>} />
                <Route path="/replenishment/settings" element={<ProtectedRoute><ReplenishmentSettings /></ProtectedRoute>} />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />
                <Route path="/warehouses/locations" element={<ProtectedRoute><WarehouseLocations /></ProtectedRoute>} />
                <Route path="/products/categories" element={<ProtectedRoute><ProductCategories /></ProtectedRoute>} />
                <Route path="/products/bundles" element={<ProtectedRoute><ProductBundles /></ProtectedRoute>} />
                <Route path="/products/import-export" element={<ProtectedRoute><ImportExportProducts /></ProtectedRoute>} />
                <Route path="/inventory/adjustments" element={<ProtectedRoute><InventoryAdjustments /></ProtectedRoute>} />
                <Route path="/inventory/cycle-counts" element={<ProtectedRoute><InventoryCycleCounts /></ProtectedRoute>} />
                <Route path="/inventory/batches" element={<ProtectedRoute><InventoryBatches /></ProtectedRoute>} />
                <Route path="/inventory/movements" element={<ProtectedRoute><InventoryMovements /></ProtectedRoute>} />
                <Route path="/inventory/by-best-before-date" element={<ProtectedRoute><InventoryByBestBeforeDate /></ProtectedRoute>} />
                <Route path="/inventory/by-location" element={<ProtectedRoute><InventoryByLocation /></ProtectedRoute>} />
                <Route path="/inventory/live" element={<ProtectedRoute><LiveStock /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute><MarketplaceApi /></ProtectedRoute>} />
                <Route path="/settings/marketplace-api" element={<ProtectedRoute><MarketplaceApi /></ProtectedRoute>} />
                <Route path="/analytics/pricing-calculator" element={<ProtectedRoute><AnalyticsPricing /></ProtectedRoute>} />
                <Route path="/analytics/margins" element={<ProtectedRoute><AnalyticsMargins /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/vat-codes" element={<ProtectedRoute><VatCodes /></ProtectedRoute>} />
                <Route path="/scan" element={<ProtectedRoute><ScanScreen /></ProtectedRoute>} />
                <Route path="/stock-in" element={<ProtectedRoute><StockIn /></ProtectedRoute>} />
                <Route path="/stock-out" element={<ProtectedRoute><StockOut /></ProtectedRoute>} />
                <Route path="/roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
                <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
                <Route path="/production/formulas" element={<ProtectedRoute><ProductionFormulas /></ProtectedRoute>} />
                <Route path="/fast-scan" element={<ProtectedRoute><FastScan /></ProtectedRoute>} />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />


                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;
