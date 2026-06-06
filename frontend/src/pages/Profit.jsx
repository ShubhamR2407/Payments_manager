import { useQuery } from '@tanstack/react-query';
import { dashboardAPI, expensesAPI } from '../api';
import { useState } from 'react';
import dayjs from 'dayjs';

export default function Profit() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ label: '', amount: '', month: dayjs().month()+1, year: dayjs().year(), notes: '' });

  const { data: profit, isLoading } = useQuery({
    queryKey: ['monthly-profit'],
    queryFn: () => dashboardAPI.monthlyProfit().then(r => r.data),
  });

  const saveExpense = async () => {
    await expensesAPI.create(expenseForm);
    setShowExpenseForm(false);
  };

  if (isLoading) return <div className="loading">Loading...</div>;

  const totalProfit = profit?.reduce((a, r) => a + r.profit, 0) || 0;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Monthly Profit & Loss</h2>
        <button className="btn btn-primary" onClick={() => setShowExpenseForm(true)}>+ Add Expense</button>
      </div>

      {showExpenseForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Expense</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Label</label>
                <input value={expenseForm.label} onChange={e => setExpenseForm(f => ({ ...f, label: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Month</label>
                <select value={expenseForm.month} onChange={e => setExpenseForm(f => ({ ...f, month: e.target.value }))}>
                  {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{dayjs().month(m-1).format('MMMM')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Year</label>
                <input type="number" value={expenseForm.year} onChange={e => setExpenseForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label>Notes</label>
                <textarea rows={2} value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowExpenseForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveExpense}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="profit-total">
        <span>12-Month Total: </span>
        <span className={totalProfit >= 0 ? 'text-green bold' : 'text-red bold'}>
          ₹{totalProfit.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Collected</th>
              <th>Expenses</th>
              <th>Salaries</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {profit?.map(row => (
              <tr key={`${row.month}-${row.year}`}>
                <td>{row.month_name} {row.year}</td>
                <td className="text-green">₹{Number(row.collected).toLocaleString('en-IN')}</td>
                <td className="text-red">₹{Number(row.expenses).toLocaleString('en-IN')}</td>
                <td className="text-orange">₹{Number(row.salaries).toLocaleString('en-IN')}</td>
                <td className={row.profit >= 0 ? 'text-green bold' : 'text-red bold'}>
                  {row.profit >= 0 ? '+' : ''}₹{Number(row.profit).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
