import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { MailOutlined, BoxPlotOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../../constants';

export default function ForgotPasswordPage() {
    const [loading, setLoading] = React.useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            message.success('Password reset link sent to your email!');
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md shadow-2xl">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                            <BoxPlotOutlined className="text-3xl text-white" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Forgot Password?</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter your email and we'll send you a reset link
                    </p>
                </div>

                <Form
                    name="forgot-password"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please input your email!' },
                            { type: 'email', message: 'Please enter a valid email!' },
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            placeholder="admin@example.com"
                            type="email"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            className="h-12 text-base font-medium"
                        >image.png
                            Send Reset Link
                        </Button>
                    </Form.Item>

                    <div className="text-center mt-4">
                        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                            Back to Dashboard
                        </Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
}
