import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${API_BASE}/auth/login/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
};

// Students
export const studentsAPI = {
  list: (params) => api.get('/students/', { params }),
  get: (id) => api.get(`/students/${id}/`),
  create: (data) => api.post('/students/', data),
  update: (id, data) => api.patch(`/students/${id}/`, data),
  delete: (id) => api.delete(`/students/${id}/`),
  paymentHistory: (id) => api.get(`/students/${id}/payment_history/`),
  enrollments: (id) => api.get(`/students/${id}/enrollments/`),
};

// Trainers
export const trainersAPI = {
  list: (params) => api.get('/trainers/', { params }),
  get: (id) => api.get(`/trainers/${id}/`),
  create: (data) => api.post('/trainers/', data),
  createWithUser: (data) => api.post('/trainers/create_with_user/', data),
  update: (id, data) => api.patch(`/trainers/${id}/`, data),
  stats: (id) => api.get(`/trainers/${id}/stats/`),
};

// Batches
export const batchesAPI = {
  list: (params) => api.get('/batches/', { params }),
  get: (id) => api.get(`/batches/${id}/`),
  create: (data) => api.post('/batches/', data),
  update: (id, data) => api.patch(`/batches/${id}/`, data),
  students: (id) => api.get(`/batches/${id}/students/`),
};

// Enrollments
export const enrollmentsAPI = {
  list: (params) => api.get('/enrollments/', { params }),
  create: (data) => api.post('/enrollments/', data),
  update: (id, data) => api.patch(`/enrollments/${id}/`, data),
  deactivate: (id, data) => api.post(`/enrollments/${id}/deactivate/`, data),
};

// Camps
export const campsAPI = {
  list: (params) => api.get('/camps/', { params }),
  get: (id) => api.get(`/camps/${id}/`),
  create: (data) => api.post('/camps/', data),
  update: (id, data) => api.patch(`/camps/${id}/`, data),
  students: (id) => api.get(`/camps/${id}/students/`),
};

// Camp Enrollments
export const campEnrollmentsAPI = {
  list: (params) => api.get('/camp-enrollments/', { params }),
  create: (data) => api.post('/camp-enrollments/', data),
};

// Attendance
export const attendanceAPI = {
  list: (params) => api.get('/attendance/', { params }),
  bulkEntry: (data) => api.post('/attendance/bulk_entry/', data),
  bulkCampEntry: (data) => api.post('/attendance/bulk_camp_entry/', data),
  studentSummary: (params) => api.get('/attendance/student_summary/', { params }),
};

// Trainer Attendance
export const trainerAttendanceAPI = {
  list: (params) => api.get('/trainer-attendance/', { params }),
  bulkEntry: (data) => api.post('/trainer-attendance/bulk_entry/', data),
  summary: (params) => api.get('/trainer-attendance/summary/', { params }),
};

// Payment Cycles
export const paymentCyclesAPI = {
  list: (params) => api.get('/payment-cycles/', { params }),
  get: (id) => api.get(`/payment-cycles/${id}/`),
  generate: (data) => api.post('/payment-cycles/generate_for_month/', data),
  update: (id, data) => api.patch(`/payment-cycles/${id}/`, data),
};

// Payments
export const paymentsAPI = {
  list: (params) => api.get('/payments/', { params }),
  create: (data) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    return api.post('/payments/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Bank Accounts
export const bankAccountsAPI = {
  list: () => api.get('/bank-accounts/'),
  create: (data) => api.post('/bank-accounts/', data),
  update: (id, data) => api.patch(`/bank-accounts/${id}/`, data),
};

// Payroll
export const payrollAPI = {
  list: (params) => api.get('/payroll/', { params }),
  generate: (data) => api.post('/payroll/generate_for_month/', data),
  markPaid: (id, data) => api.post(`/payroll/${id}/mark_paid/`, data),
};

// Expenses
export const expensesAPI = {
  list: (params) => api.get('/expenses/', { params }),
  create: (data) => api.post('/expenses/', data),
  update: (id, data) => api.patch(`/expenses/${id}/`, data),
  delete: (id) => api.delete(`/expenses/${id}/`),
};

// ELO Rate Tiers
export const eloTiersAPI = {
  list: () => api.get('/elo-tiers/'),
  create: (data) => api.post('/elo-tiers/', data),
  update: (id, data) => api.patch(`/elo-tiers/${id}/`, data),
  delete: (id) => api.delete(`/elo-tiers/${id}/`),
};

// Reminders
export const remindersAPI = {
  list: (params) => api.get('/reminders/', { params }),
  sendBulk: (data) => api.post('/reminders/send_bulk/', data),
  send: (id) => api.post(`/reminders/${id}/send/`),
};

// Dashboard
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary/'),
  monthlyProfit: () => api.get('/dashboard/monthly_profit/'),
};
