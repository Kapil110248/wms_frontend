import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE_URL, getAuthHeaders } from '../api/client';

const normalizeRole = (role) => (role || '').toLowerCase().replace(/-/g, '_');

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            _hasHydrated: false,

            login: async (email, password) => {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email.trim(), password }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || 'Invalid email or password');
                    }
                    if (!data.success || !data.user || !data.token) {
                        throw new Error(data.message || 'Login failed');
                    }
                    const u = data.user;
                    const user = {
                        id: u.id,
                        email: u.email,
                        name: u.name,
                        role: normalizeRole(u.role),
                        companyId: u.companyId || null,
                        warehouseId: u.warehouseId || null,
                        status: u.status || 'ACTIVE',
                        Company: u.Company,
                        Warehouse: u.Warehouse,
                    };
                    set({
                        user,
                        token: data.token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                    return;
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error.message || 'Login failed',
                    });
                    throw error;
                }
            },

            register: async (email, password, name) => {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE_URL}/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, name }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message || 'Registration failed');
                    if (data.user && data.token) {
                        const u = data.user;
                        set({
                            user: { ...u, role: normalizeRole(u.role) },
                            token: data.token,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });
                    }
                } catch (error) {
                    set({ isLoading: false, error: error.message || 'Registration failed' });
                    throw error;
                }
            },

            logout: async () => {
                set({ user: null, token: null, isAuthenticated: false, error: null });
            },

            setUser: (user) => set({ user, isAuthenticated: true }),
            setToken: (token) => set({ token }),
            clearError: () => set({ error: null }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        { name: 'wms-auth-storage', onRehydrateStorage: () => (state) => state?.setHasHydrated(true) }
    )
);
