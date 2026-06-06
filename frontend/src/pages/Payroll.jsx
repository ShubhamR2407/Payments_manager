import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollAPI } from '../api';
import dayjs from 'dayjs';

export default function Payroll() {
  const qc = useQueryClient();
  const today = dayjs();
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payroll', { month, year }],
    queryFn: () => payrollAPI.list({ month, year }).then(r => r.data),
  });

  const generateMut = useMutation({
    mutationFn: () => payrollAPI.generate({ month, year }),
    onSuccess: () => refetch(),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id, amount }) => payrollAPI.markPaid(id, { amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setPayingId(null); },
  });

  const payrolls = data?.results || data || [];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Trainer Payroll</h2>
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
        <button className="btn btn-secondary" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
          {generateMut.isPending ? 'Generating...' : 'Generate Payroll'}
        </button>
      </div>

      {payingId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Mark as Paid</h3>
            <div className="form-group">
              <label>Amount Paid (₹)</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setPayingId(null)}>Cancel</button>
              <button className="btn btn-primary"
                onClick={() => markPaidMut.mutate({ id: payingId, amount: payAmount })}>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Trainer</th>
                <th>Month/Year</th>
                <th>Hours</th>
                <th>Salary Due</th>
                <th>Salary Paid</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map(p => (
                <tr key={p.id}>
                  <td>{p.trainer_name}</td>
                  <td>{p.month}/{p.year}</td>
                  <td>{p.hours_logged}h</td>
                  <td>₹{Number(p.salary_due).toLocaleString('en-IN')}</td>
                  <td>₹{Number(p.salary_paid).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${p.status === 'paid' ? 'green' : 'orange'}`}>{p.status}</span>
                  </td>
                  <td>
                    {p.status !== 'paid' && (
                      <button className="btn btn-sm btn-primary"
                        onClick={() => { setPayingId(p.id); setPayAmount(p.salary_due); }}>
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payrolls.length === 0 && <tr><td colSpan={7} className="empty">No payroll records. Click "Generate Payroll".</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
