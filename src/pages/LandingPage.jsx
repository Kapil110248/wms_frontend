import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Drawer } from 'antd';
import {
    MenuOutlined,
    RocketOutlined,
    SafetyOutlined,
    ThunderboltOutlined,
    TeamOutlined,
    CheckCircleOutlined,
    DashboardOutlined,
    BoxPlotOutlined,
    InboxOutlined,
    ShoppingCartOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    ApiOutlined,
    StarFilled,
    TrophyOutlined,
    WarningOutlined,
    CloudOutlined,
    LockOutlined,
    GlobalOutlined,
    LineChartOutlined,
    AmazonOutlined,
    TagsOutlined,
    CarOutlined,
    MailOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import logoImg from '../assets/newlogo.jfif';

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const glowAnimation = {
        boxShadow: [
            "0 0 20px rgba(59, 130, 246, 0.5)",
            "0 0 60px rgba(59, 130, 246, 0.8)",
            "0 0 20px rgba(59, 130, 246, 0.5)"
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
        }
    };

    const roles = [
        {
            name: 'Administrator',
            icon: <TrophyOutlined />,
            color: 'from-blue-500 to-blue-700',
            description: 'Complete system oversight with full access to all features',
            features: ['Multi-warehouse management', 'User & team control', 'Advanced reporting', 'System integrations']
        },
        {
            name: 'Warehouse Manager',
            icon: <TeamOutlined />,
            color: 'from-green-500 to-green-700',
            description: 'Optimize warehouse operations and team performance',
            features: ['Team performance tracking', 'Order queue management', 'Inventory oversight', 'Operational reports']
        },
        {
            name: 'Warehouse Staff',
            icon: <BoxPlotOutlined />,
            color: 'from-purple-500 to-purple-700',
            description: 'Efficient daily operations and stock management',
            features: ['Daily task management', 'Stock movements', 'Order processing', 'Inventory adjustments']
        },
        {
            name: 'Picker',
            icon: <InboxOutlined />,
            color: 'from-orange-500 to-orange-700',
            description: 'Streamlined picking with real-time wave assignments',
            features: ['Active pick lists', 'Wave picking', 'Performance metrics', 'Location optimization']
        },
        {
            name: 'Packer',
            icon: <ShoppingCartOutlined />,
            color: 'from-cyan-500 to-cyan-700',
            description: 'Fast packing operations with shipment tracking',
            features: ['Pack queue', 'Shipment prep', 'Station management', 'Real-time tracking']
        },
    ];

    const features = [
        {
            icon: <SafetyOutlined className="text-4xl" />,
            title: 'Role-Based Access Control',
            description: 'Granular permissions ensure users only see what they need, enhancing security and focus.'
        },
        {
            icon: <ThunderboltOutlined className="text-4xl" />,
            title: 'Lightning Fast Performance',
            description: 'Built with React and optimized for speed, delivering sub-second page loads.'
        },
        {
            icon: <DashboardOutlined className="text-4xl" />,
            title: 'Real-Time Dashboards',
            description: 'Live KPIs and metrics tailored to each role for instant operational insights.'
        },
        {
            icon: <DatabaseOutlined className="text-4xl" />,
            title: 'Smart Inventory Management',
            description: 'Track stock levels, batches, serial numbers, and expiry dates effortlessly.'
        },
        {
            icon: <BarChartOutlined className="text-4xl" />,
            title: 'Advanced Analytics',
            description: 'Comprehensive reports and charts to make data-driven warehouse decisions.'
        },
        {
            icon: <ApiOutlined className="text-4xl" />,
            title: 'Seamless Integrations',
            description: 'Connect with Amazon, Shopify, eBay and more through our powerful API.'
        },
    ];

    const stats = [
        { label: 'Orders Processed Daily', value: 50000, suffix: '+' },
        { label: 'Active Warehouses', value: 500, suffix: '+' },
        { label: 'Pick Accuracy', value: 99.8, suffix: '%' },
        { label: 'Customer Satisfaction', value: 98, suffix: '%' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:64px_64px]"></div>

            {/* Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            {/* Content */}
            <div className="relative z-10">
                {/* Navigation */}
                <motion.nav
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 shadow-2xl z-50"
                >
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to="/dashboard" className="flex items-center gap-3">
                                <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-transparent uppercase italic">
                                    MAVIE
                                </span>
                            </Link>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-gray-300 hover:text-cyan-400 transition-all duration-300 hover:scale-110">Features</a>
                            <a href="#roles" className="text-gray-300 hover:text-cyan-400 transition-all duration-300 hover:scale-110">Roles</a>
                            <a href="#stats" className="text-gray-300 hover:text-cyan-400 transition-all duration-300 hover:scale-110">Stats</a>
                            <Link to="/dashboard">
                                <Button
                                    size="large"
                                    icon={<RocketOutlined />}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-none text-white shadow-lg shadow-blue-500/50 h-12 px-8"
                                >
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                        <Button
                            type="text"
                            icon={<MenuOutlined className="text-xl text-white" />}
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-700/50"
                            aria-label="Open menu"
                        />
                    </div>
                </motion.nav>
                <Drawer
                    title={null}
                    placement="right"
                    onClose={() => setMobileMenuOpen(false)}
                    open={mobileMenuOpen}
                    width={280}
                    className="landing-mobile-drawer"
                    styles={{ body: { padding: 0, background: '#0f172a' }, header: { display: 'none' } }}
                    closeIcon={<span className="text-white text-lg">×</span>}
                >
                    <div className="flex flex-col pt-6">
                        <a href="#features" className="px-6 py-4 text-gray-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors" onClick={() => setMobileMenuOpen(false)}>Features</a>
                        <a href="#roles" className="px-6 py-4 text-gray-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors" onClick={() => setMobileMenuOpen(false)}>Roles</a>
                        <a href="#stats" className="px-6 py-4 text-gray-300 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors" onClick={() => setMobileMenuOpen(false)}>Stats</a>
                        <div className="px-6 pt-4 pb-6">
                            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                                <Button
                                    size="large"
                                    icon={<RocketOutlined />}
                                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-none text-white shadow-lg h-12"
                                >
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Drawer>

                {/* Hero Section */}
                <section className="pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 border border-cyan-500/30 rounded-full mb-8 backdrop-blur-sm"
                            >
                                <StarFilled className="text-cyan-400 animate-pulse" />
                                <span className="text-cyan-300 font-semibold tracking-wide">NEXT-GEN WAREHOUSE MANAGEMENT</span>
                            </motion.div>

                            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
                                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl">
                                    Warehouse Operations
                                </span>
                                <br />
                                <motion.span
                                    animate={{
                                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                                    }}
                                    transition={{ duration: 5, repeat: Infinity }}
                                    className="bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-[length:200%_auto] bg-clip-text text-transparent"
                                >
                                    Reimagined
                                </motion.span>
                            </h1>

                            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                                The most <span className="text-cyan-400 font-semibold">advanced role-based</span> warehouse management system.
                                Built for <span className="text-blue-400">speed</span>, designed for <span className="text-purple-400">scale</span>,
                                and optimized for every team member from pickers to executives.
                            </p>

                            <div className="flex gap-6 justify-center flex-wrap mb-8">
                                <Link to="/dashboard">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                            size="large"
                                            icon={<RocketOutlined />}
                                            className="h-16 px-10 text-lg font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 border-none text-white shadow-2xl shadow-cyan-500/50 rounded-xl"
                                        >
                                            Start Free Trial
                                        </Button>
                                    </motion.div>
                                </Link>
                            </div>

                            <div className="flex items-center justify-center gap-6 text-gray-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircleOutlined className="text-green-400" />
                                    <span>No credit card required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircleOutlined className="text-green-400" />
                                    <span>14-day free trial</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircleOutlined className="text-green-400" />
                                    <span>Cancel anytime</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Stats Section */}
                <section id="stats" className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="text-center text-white"
                                >
                                    <div className="text-5xl font-bold mb-2">
                                        <CountUp end={stat.value} duration={2.5} decimals={stat.suffix === '%' ? 1 : 0} />
                                        {stat.suffix}
                                    </div>
                                    <div className="text-blue-100 text-lg">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Powerful Features
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Everything you need to run a modern warehouse operation
                            </p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            whileInView="animate"
                            viewport={{ once: true }}
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    variants={fadeInUp}
                                    whileHover={{ y: -10, transition: { duration: 0.2 } }}
                                    className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mb-4">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-gray-800">{feature.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Roles Section */}
                <section id="roles" className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Tailored for Every Role
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                                Each user gets a personalized experience with role-specific dashboards and permissions
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {roles.map((role, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white rounded-2xl overflow-hidden shadow-xl"
                                >
                                    <div className={`bg-gradient-to-r ${role.color} p-6 text-white`}>
                                        <div className="text-4xl mb-3">{role.icon}</div>
                                        <h3 className="text-2xl font-bold">{role.name}</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-gray-600 mb-4">{role.description}</p>
                                        <ul className="space-y-2">
                                            {role.features.map((feature, i) => (
                                                <li key={i} className="flex items-center gap-2 text-gray-700">
                                                    <CheckCircleOutlined className="text-green-500" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 px-6">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 text-center text-white shadow-2xl"
                        >
                            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Warehouse?</h2>
                            <p className="text-xl mb-8 text-blue-100">
                                Join hundreds of warehouses already using MAVIE
                            </p>
                            <div className="flex gap-4 justify-center flex-wrap">
                                <Link to="/dashboard">
                                    <Button size="large" className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-blue-50">
                                        Get Started <RocketOutlined />
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-gray-900 text-white py-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-4 gap-8 mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl font-black italic tracking-tighter uppercase text-white">MAVIE</span>
                                </div>
                                <p className="text-gray-400">Next-generation warehouse management for modern operations.</p>
                            </div>
                            <div>
                                <h4 className="font-bold mb-4">Product</h4>
                                <ul className="space-y-2 text-gray-400">
                                    <li><a href="#features" className="hover:text-white">Features</a></li>
                                    <li><a href="#roles" className="hover:text-white">Roles</a></li>
                                    <li><Link to="/dashboard" className="hover:text-white">Demo</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-4">Company</h4>
                                <ul className="space-y-2 text-gray-400">
                                    <li><a href="#" className="hover:text-white">About Us</a></li>
                                    <li><a href="#" className="hover:text-white">Contact</a></li>
                                    <li><a href="#" className="hover:text-white">Careers</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold mb-4">Legal</h4>
                                <ul className="space-y-2 text-gray-400">
                                    <li><a href="#" className="hover:text-white">Privacy</a></li>
                                    <li><a href="#" className="hover:text-white">Terms</a></li>
                                    <li><a href="#" className="hover:text-white">Security</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
                            <p>&copy; 2026 MAVIE. All rights reserved. Built with React & Ant Design.</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
