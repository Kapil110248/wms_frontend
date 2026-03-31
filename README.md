# Kiaan WMS - React Frontend

Modern Warehouse Management System built with React, Vite, and Ant Design.

## 🚀 Features

- **Role-Based Access Control (RBAC)** - Different dashboards and permissions for each user role
- **Professional UI** - Same beautiful design as the Next.js version
- **Fast Performance** - Built with Vite for lightning-fast development and builds
- **State Management** - Zustand for simple and efficient state management
- **Routing** - React Router v7 for client-side routing
- **Authentication** - Secure login with JWT tokens and demo mode fallback
- **Responsive Design** - Works perfectly on all devices

## 📦 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Next-generation frontend tooling
- **React Router 7** - Client-side routing
- **Ant Design 5** - Enterprise-class UI components
- **Tailwind CSS 3** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Zustand** - State management
- **Axios** - HTTP client

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔑 Demo Accounts

All demo accounts use password: `Admin@123`

- **Super Admin**: admin@kiaan-wms.com
- **Company Admin**: companyadmin@kiaan-wms.com
- **Warehouse Manager**: warehousemanager@kiaan-wms.com
- **Inventory Manager**: inventorymanager@kiaan-wms.com
- **Picker**: picker@kiaan-wms.com
- **Packer**: packer@kiaan-wms.com
- **Viewer**: viewer@kiaan-wms.com

## 📁 Project Structure

```
src/
├── components/         # Reusable components
│   └── ProtectedRoute.jsx
├── lib/               # Utilities and helpers
│   ├── constants.js   # App constants
│   └── permissions.js # RBAC logic
├── pages/             # Page components
│   ├── auth/          # Authentication pages
│   ├── Dashboard.jsx
│   ├── LandingPage.jsx
│   └── ProfilePage.jsx
├── store/             # Zustand stores
│   ├── authStore.js
│   └── uiStore.js
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## 🎨 UI Components

The project uses the same professional UI as the Next.js version:

- Beautiful landing page with animations
- Role-specific dashboards
- Professional login/register pages
- Responsive design
- Smooth transitions and animations

## 🔐 Authentication

The app supports both backend API authentication and demo mode:

1. **Backend Mode**: Connects to the API at `http://localhost:8010/api`
2. **Demo Mode**: Falls back to client-side authentication if backend is unavailable

## 🚦 Routing

Protected routes automatically redirect based on user role:

- Pickers → `/dashboards/picker`
- Packers → `/dashboards/packer`
- Viewers → `/reports`
- Others → `/dashboard`

## 📝 Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8010
```

## 🎯 Next Steps

This is the initial conversion from Next.js to React. The following features are ready:

✅ Authentication system
✅ Role-based access control
✅ Landing page
✅ Login/Register pages
✅ Basic dashboard
✅ Profile page
✅ Protected routes
✅ State management

To be added (from Next.js version):

- All protected pages (Products, Inventory, Orders, etc.)
- Main layout with sidebar
- All dashboard variants
- Complete CRUD operations
- Charts and analytics
- And more...

## 📄 License

Private - Kiaan WMS

## 👨‍💻 Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

---

**Note**: This is a professional conversion from Next.js to React with the exact same UI and functionality. All features will be progressively added while maintaining the same high-quality design standards.
