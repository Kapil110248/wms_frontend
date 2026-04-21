import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    // Normalize to 12 decimal places to remove floating point artifacts (e.g. .000000000002)
    const normalized = Math.round(Number(num) * 1e12) / 1e12;
    return new Intl.NumberFormat('en-IE', {
        maximumFractionDigits: 20,
        minimumFractionDigits: 0,
        useGrouping: true
    }).format(normalized);
}

export function formatCurrency(amount, currency = 'EUR') {
    if (amount === null || amount === undefined) return '—';
    try {
        const normalized = Math.round(Number(amount) * 1e12) / 1e12;
        return new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency,
            maximumFractionDigits: 20,
            minimumFractionDigits: 0
        }).format(normalized);
    } catch (e) {
        return `${currency} ${formatNumber(amount)}`;
    }
}

export function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export function getStatusColor(status) {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s.includes('pending') || s.includes('draft')) return 'orange';
    if (s.includes('approved') || s.includes('active') || s.includes('shipped')) return 'blue';
    if (s.includes('received') || s.includes('delivered') || s.includes('completed')) return 'green';
    if (s.includes('reject') || s.includes('cancel') || s.includes('error')) return 'red';
    if (s.includes('process') || s.includes('picking') || s.includes('packing')) return 'purple';
    return 'default';
}
