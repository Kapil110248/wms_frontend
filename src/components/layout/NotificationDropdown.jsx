import React, { useState, useEffect } from 'react';
import { Badge, Button, Dropdown, List, Avatar, Typography, Empty, Spin, message, Tooltip } from 'antd';
import { BellOutlined, CheckCircleOutlined, InfoCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

const NotificationDropdown = () => {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Fetch ONLY UNREAD notifications for the dropdown
            const res = await apiRequest('/api/notifications?isRead=false&limit=20', { method: 'GET' }, token);
            if (res.success) {
                setNotifications(res.data);
                setUnreadCount(res.data.length);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [token]);

    const handleMarkAsRead = async (id) => {
        try {
            await apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' }, token);
            // Remove from list since it's no longer unread
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            message.error('Failed to mark notification as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiRequest('/api/notifications/read-all', { method: 'PUT' }, token);
            setNotifications([]); // Clear all since we only show unread
            setUnreadCount(0);
            message.success('All notifications cleared');
        } catch (err) {
            message.error('Failed to mark all as read');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
            case 'error': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
            default: return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
        }
    };

    const notificationList = (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden w-80 sm:w-96">
            <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <Text strong className="text-gray-800">Notifications</Text>
                {unreadCount > 0 && (
                    <Button type="link" size="small" onClick={handleMarkAllAsRead} className="text-xs p-0 h-auto">
                        Mark all as read
                    </Button>
                )}
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {loading && notifications.length === 0 ? (
                    <div className="p-8 text-center"><Spin /></div>
                ) : notifications.length === 0 ? (
                    <Empty description="No notifications" className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={notifications}
                        renderItem={item => (
                            <List.Item 
                                className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!item.isRead ? 'bg-blue-50/30' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering dropdown close prematurely if needed
                                    handleMarkAsRead(item.id);
                                    if (item.link) navigate(item.link);
                                }}
                            >
                                <List.Item.Meta
                                    avatar={<Avatar icon={getIcon(item.type)} style={{ backgroundColor: 'transparent' }} />}
                                    title={
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <Text strong={!item.isRead} className="text-sm line-clamp-1 block">{item.title}</Text>
                                                <Text type="secondary" className="text-[10px] block">{dayjs(item.createdAt).fromNow()}</Text>
                                            </div>
                                            <Tooltip title="Mark as Read">
                                                <Button 
                                                    type="text" 
                                                    size="small" 
                                                    icon={<CheckCircleOutlined className="text-gray-300 hover:text-green-500" />} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(item.id);
                                                    }}
                                                />
                                            </Tooltip>
                                        </div>
                                    }
                                    description={
                                        <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                            {item.message}
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </div>
            
            <div className="px-4 py-2 border-t border-gray-50 text-center bg-gray-50/30">
                <Button type="link" size="small" className="text-xs text-gray-400" onClick={() => navigate('/settings')}>
                    Notification Settings
                </Button>
            </div>
        </div>
    );

    return (
        <Dropdown popupRender={() => notificationList} trigger={['click']} placement="bottomRight">
            <Badge count={unreadCount} offset={[-2, 2]} size="small" style={{ backgroundColor: '#ef4444' }}>
                <Button 
                    type="text" 
                    icon={<BellOutlined className={`text-base ${unreadCount > 0 ? 'text-blue-500' : 'text-gray-500'}`} />} 
                    className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center p-0" 
                />
            </Badge>
        </Dropdown>
    );
};

export default NotificationDropdown;
