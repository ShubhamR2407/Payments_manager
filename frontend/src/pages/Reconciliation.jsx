import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentCyclesAPI } from '../api';
import dayjs from 'dayjs';

export default function Reconciliation() {
  const today = dayjs();
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());

  const { data: cycles, isLoading } = useQuery({
    queryKey: ['reconciliation', { month, year }],
    queryFn: () => paymentCyclesAPI.list({ month, year }).then(r => r.data),
  });

  const cycleList = cycles?.results || cycles || [];

  const totalDue = cycleList.reduce((a, c) => a + parseFloat(c.fee_due || 0), 0);
  const totalPaid = cycleList.reduce((a, c) => a + parseFloat(c.fee_paid || 0), 0);
  const totalBalance = totalDue - totalPaid;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Reconciliation</h2>
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
      </div>

      <div className="reconciliation-summary">
        <div className="rec-card">
          <div className="rec-label">Total Due</div>
          <div className="rec-value text-orange">₹{totalDue.toLocaleString('en-IN')}</div>
        </div>
        <div className="rec-card">
          <div className="rec-label">Total Collected</div>
          <div className="rec-value text-green">₹{totalPaid.toLocaleString('en-IN')}</div>
        </div>
        <div className="rec-card">
          <div className="rec-label">Outstanding Balance</div>
          <div className={`rec-value ${totalBalance > 0 ? 'text-red' : 'text-green'}`}>₹{totalBalance.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Classes</th>
                <th>Attended</th>
                <th>Fee Due</th>
                <th>Fee Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cycleList.map(c => (
                <tr key={c.id} className={c.balance > 0 ? 'row-highlight-red' : 'row-highlight-green'}>
                  <td>{c.student_name}</td>
                  <td>{c.total_classes}</td>
                  <td>{c.classes_attended}</td>
                  <td>₹{Number(c.fee_due).toLocaleString('en-IN')}</td>
                  <td>₹{Number(c.fee_paid).toLocaleString('en-IN')}</td>
                  <td className={c.balance > 0 ? 'text-red bold' : 'text-green bold'}>
                    ₹{Number(c.balance).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status === 'paid' ? 'green' : c.status === 'partial' ? 'orange' : 'red'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {cycleList.length === 0 && <tr><td colSpan={7} className="empty">No data for this period</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
