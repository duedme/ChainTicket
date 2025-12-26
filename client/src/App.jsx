import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Login from './pages/Login';
import Registration from './pages/Registration';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ServicesManager from './pages/admin/ServicesManager';
import AdminProfile from './pages/admin/AdminProfile';
import ClientLayout from './pages/client/ClientLayout';
import VendorSelection from './pages/client/VendorSelection';
import VendorMenu from './pages/client/VendorMenu';
import Cart from './pages/client/Cart';
import ClientOrders from './pages/client/ClientOrders';
import Profile from './pages/client/Profile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Registration />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="services" element={<ServicesManager />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>

            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<VendorSelection />} />
              <Route path="vendor/:vendorId" element={<VendorMenu />} />
              <Route path="cart" element={<Cart />} />
              <Route path="orders" element={<ClientOrders />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
