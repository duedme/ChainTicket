import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ServicesManager from './pages/admin/ServicesManager';
import ClientLayout from './pages/client/ClientLayout';
import VendorSelection from './pages/client/VendorSelection';
import VendorMenu from './pages/client/VendorMenu';
import Cart from './pages/client/Cart';
import ClientOrders from './pages/client/ClientOrders';

function App() {
  return (
    <Router>
      <DataProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="services" element={<ServicesManager />} />
            </Route>

            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<VendorSelection />} />
              <Route path="vendor/:vendorId" element={<VendorMenu />} />
              <Route path="cart" element={<Cart />} />
              <Route path="orders" element={<ClientOrders />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </DataProvider>
    </Router>
  );
}

export default App;
