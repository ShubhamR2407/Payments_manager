import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentCyclesAPI, paymentsAPI } from '../api';
import PaymentForm from '../components/PaymentForm';
import dayjs from 'dayjs';

export default function Payments() {
  const today = dayjs();
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: cycles, isLoading, refetch } = useQuery({
    queryKey: ['payment-cycles', { month, year, status: statusFilter }],
    queryFn: () => paymentCyclesAPI.list({ month, year, status: statusFilter || undefined }).then(r => r.data),
  });

  const cycleList = cycles?.results || cycles || [];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Payments</h2>
      </div>

      <div className="filters-row">
        <div className="form-group">
          <label>Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({length: 12}, (_, i) => i+1).map(m => (
              <option key={m} value={m}>{dayjs().month(m-1).format('MMMM')}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{width:90}} />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => paymentCyclesAPI.generate({ month, year }).then(() => refetch())}>
          Generate Cycles
        </button>
      </div>

      {selectedCycle && (
        <div className="modal-overlay">
          <div className="modal">
            <PaymentForm
              cycle={selectedCycle}
              onSuccess={() => { setSelectedCycle(null); refetch(); }}
              onCancel={() => setSelectedCycle(null)}
            />
          </div>
        </div>
      )}

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Period</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cycleList.map(c => (
                <tr key={c.id}>
                  <td>{c.student_name}</td>
                  <td>{c.month}/{c.year}</td>
                  <td>₹{Number(c.fee_due).toLocaleString('en-IN')}</td>
                  <td>₹{Number(c.fee_paid).toLocaleString('en-IN')}</td>
                  <td className={c.balance > 0 ? 'text-red' : 'text-green'}>₹{Number(c.balance).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'paid' ? 'green' : c.status === 'partial' ? 'orange' : 'red'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.status !== 'paid' && (
                      <button className="btn btn-sm btn-primary" onClick={() => setSelectedCycle(c)}>
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {cycleList.length === 0 && <tr><td colSpan={7} className="empty">No payment cycles. Click "Generate Cycles" to create them.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
