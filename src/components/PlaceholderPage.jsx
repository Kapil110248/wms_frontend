import React from 'react';
import { Card, Breadcrumb, Empty, Button, Space, Tag } from 'antd';
import { HomeOutlined, LoadingOutlined } from '@ant-design/icons';
import { MainLayout } from './layout/MainLayout';
import { Link } from 'react-router-dom';

export const PlaceholderPage = ({ title, category = 'Module' }) => {
    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <Breadcrumb
                            items={[
                                { title: <Link to="/dashboard"><HomeOutlined /></Link> },
                                { title: category },
                                { title: title },
                            ]}
                            className="mb-2"
                        />
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-500">
                            {title}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">This module is currently being migrated from the Next.js backup.</p>
                    </div>
                    <Space>
                        <Button icon={<LoadingOutlined />} disabled>System Syncing</Button>
                        <Button type="primary" className="rounded-lg">Action Overview</Button>
                    </Space>
                </div>

                <Card className="shadow-sm rounded-xl border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-700">{title} Module</p>
                                <p className="text-gray-400">The full functionality for this module is on the way.</p>
                                <div className="mt-4 flex gap-2 justify-center">
                                    <Tag color="blue">React Port</Tag>
                                    <Tag color="purple">Responsive UI</Tag>
                                    <Tag color="green">Ready for Logic</Tag>
                                </div>
                            </div>
                        }
                    >
                        <Link to="/dashboard">
                            <Button type="primary" className="rounded-lg">Return to Dashboard</Button>
                        </Link>
                    </Empty>
                </Card>
            </div>
        </MainLayout>
    );
};
