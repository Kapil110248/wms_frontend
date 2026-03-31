import React from 'react';
import { Card } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import { cn, formatNumber } from '../../utils';

export const KPICard = ({
    title,
    value,
    change,
    trend = 'stable',
    icon,
    suffix,
    loading = false,
    className,
}) => {
    const getTrendColor = () => {
        if (trend === 'up') return 'text-green-600';
        if (trend === 'down') return 'text-red-600';
        return 'text-gray-600';
    };

    const getTrendIcon = () => {
        if (trend === 'up') return <ArrowUpOutlined />;
        if (trend === 'down') return <ArrowDownOutlined />;
        return <MinusOutlined />;
    };

    return (
        <Card loading={loading} className={cn('hover:shadow-md transition-all duration-300 rounded-xl border-gray-100', className)}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-gray-500 text-sm mb-2 font-medium">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold text-gray-900">
                            {typeof value === 'number' ? formatNumber(value) : value}
                        </h3>
                        {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
                    </div>
                    {change !== undefined && (
                        <div className={cn('flex items-center gap-1 mt-2 text-sm font-semibold', getTrendColor())}>
                            {getTrendIcon()}
                            <span>
                                {change > 0 ? '+' : ''}{change}% from last period
                            </span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="flex-shrink-0 ml-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl shadow-sm">
                            {icon}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
