import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BoxPlotOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getDefaultRouteForRole } from '../../permissions';
import { APP_NAME } from '../../constants';
import logoImg from '../../assets/newlogo-removebg-preview.png';



    export default function LoginPage() {
        const navigate = useNavigate();
        const { login, user, isAuthenticated, _hasHydrated } = useAuthStore();
        const [loading, setLoading] = useState(false);


        // Agar already logged in ho to apne dashboard pe bhejo
        React.useEffect(() => {
            if (!_hasHydrated) return;
            if (isAuthenticated && user) {
                const defaultRoute = getDefaultRouteForRole(user.role);
                navigate(defaultRoute, { replace: true });
            }
        }, [_hasHydrated, isAuthenticated, user, navigate]);

        const onFinish = async (values) => {
            setLoading(true);
            try {
                await login(values.email, values.password);
                message.success('Login successful!');
                const { user: u } = useAuthStore.getState();
                const defaultRoute = getDefaultRouteForRole(u?.role);
                navigate(defaultRoute, { replace: true });
            } catch (err) {
                message.error(err.message || 'Login failed. Please check your credentials.');
            } finally {
                setLoading(false);
            }
        };



        if (!_hasHydrated) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                    <div className="animate-pulse text-gray-500">Loading...</div>
                </div>
            );
        }

        if (isAuthenticated && user) {
            return null;
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e8eef4] py-12 px-4 sm:px-6">
                <div className="w-full max-w-md">
                    <Card className="shadow-lg rounded-2xl border border-gray-100 overflow-hidden" bodyStyle={{ padding: '32px 28px' }}>
                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-4">
                                <div className="w-56 h-32 flex items-center justify-center">
                                    <img src={logoImg} alt="MAVIE" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <p className="mt-1.5 text-sm text-gray-500">Sign in to your account</p>
                        </div>

                        <Form name="login" onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
                            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Enter your email' }]}>
                                <Input
                                    prefix={<MailOutlined className="text-gray-400" />}
                                    placeholder="admin@kiaan-wms.com"
                                    type="email"
                                    className="rounded-lg"
                                />
                            </Form.Item>
                            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
                                <Input.Password
                                    prefix={<LockOutlined className="text-gray-400" />}
                                    placeholder="••••••••"
                                    className="rounded-lg"
                                />
                            </Form.Item>
                            <Form.Item className="mb-0">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading}
                                    block
                                    size="large"
                                    className="h-11 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 border-0"
                                >
                                    Sign In
                                </Button>
                            </Form.Item>
                        </Form>



                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-3 text-sm">
                            <Link to="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
                                Forgot password?
                            </Link>
                        </div>
                </Card>
            </div>
        </div>
    );
}
