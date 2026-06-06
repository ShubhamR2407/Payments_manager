import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Trainers from './pages/Trainers';
import TrainerDetail from './pages/TrainerDetail';
import Batches from './pages/Batches';
import BatchDetail from './pages/BatchDetail';
import Camps from './pages/Camps';
import CampDetail from './pages/CampDetail';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Reconciliation from './pages/Reconciliation';
import Payroll from './pages/Payroll';
import Reminders from './pages/Reminders';
import Profit from './pages/Profit';
import Settings from './pages/Settings';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/students/:id" element={<StudentDetail />} />
                <Route path="/trainers" element={<Trainers />} />
                <Route path="/trainers/:id" element={<TrainerDetail />} />
                <Route path="/batches" element={<Batches />} />
                <Route path="/batches/:id" element={<BatchDetail />} />
                <Route path="/camps" element={<Camps />} />
                <Route path="/camps/:id" element={<CampDetail />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/reconciliation" element={<Reconciliation />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/profit" element={<Profit />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
