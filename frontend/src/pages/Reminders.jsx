import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentCyclesAPI, remindersAPI } from '../api';
import dayjs from 'dayjs';

export default function Reminders() {
  const qc = useQueryClient();
  const today = dayjs();
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  const [sendResult, setSendResult] = useState(null);

  const { data: unpaid, isLoading } = useQuery({
    queryKey: ['unpaid-cycles', { month, year }],
    queryFn: () => paymentCyclesAPI.list({ month, year, status: 'pending' }).then(r => r.data),
  });

  const { data: partial } = useQuery({
    queryKey: ['partial-cycles', { month, year }],
    queryFn: () => paymentCyclesAPI.list({ month, year, status: 'partial' }).then(r => r.data),
  });

  const sendBulkMut = useMutation({
    mutationFn: () => remindersAPI.sendBulk({ month, year }),
    onSuccess: (data) => { setSendResult(data.data); qc.invalidateQueries(); },
  });

  const unpaidList = unpaid?.results || unpaid || [];
  const partialList = partial?.results || partial || [];
  const allDue = [...unpaidList, ...partialList];

  return (
    <div className="page">
      <div className="page-header">
        <h2>WhatsApp Reminders</h2>
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
        <button
          className="btn btn-primary"
          onClick={() => sendBulkMut.mutate()}
          disabled={sendBulkMut.isPending || allDue.length === 0}
        >
          {sendBulkMut.isPending ? 'Sending...' : `Send Reminders (${allDue.length})`}
        </button>
      </div>

      {sendResult && (
        <div className="alert alert-success">
          Reminders sent: {sendResult.sent} | Failed: {sendResult.failed}
        </div>
      )}

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Student</th><th>Period</th><th>Balance</th><th>Status</th></tr>
            </thead>
            <tbody>
              {allDue.map(c => (
                <tr key={c.id}>
                  <td>{c.student_name}</td>
                  <td>{dayjs().month(c.month - 1).format('MMMM')} {c.year}</td>
                  <td className="text-red">₹{Number(c.balance).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'partial' ? 'orange' : 'red'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
              {allDue.length === 0 && <tr><td colSpan={4} className="empty">No outstanding payments for this period</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
