import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
    persist(
        (set) => ({
            theme: 'light',
            sidebarCollapsed: false,
            selectedWarehouseId: null,
            selectedCompanyId: null,

            toggleTheme: () => {
                set((state) => ({
                    theme: state.theme === 'light' ? 'dark' : 'light',
                }));
            },

            toggleSidebar: () => {
                set((state) => ({
                    sidebarCollapsed: !state.sidebarCollapsed,
                }));
            },

            setSelectedWarehouse: (id) => {
                set({ selectedWarehouseId: id });
            },

            setSelectedCompany: (id) => {
                set({ selectedCompanyId: id });
            },
        }),
        {
            name: 'wms-ui-storage',
        }
    )
);
