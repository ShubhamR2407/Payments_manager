import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../api';
import dayjs from 'dayjs';

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`stat-card stat-card-${color || 'blue'}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardAPI.summary().then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: profit } = useQuery({
    queryKey: ['monthly-profit'],
    queryFn: () => dashboardAPI.monthlyProfit().then(r => r.data),
  });

  if (isLoading) return <div className="loading">Loading dashboard...</div>;

  const attendancePct = summary?.today_total_scheduled > 0
    ? Math.round((summary.today_attendance / summary.today_total_scheduled) * 100)
    : 0;

  return (
    <div className="dashboard">
      <h2>Dashboard — {dayjs().format('MMMM YYYY')}</h2>

      <div className="stats-grid">
        <StatCard label="Active Students" value={summary?.total_students} color="blue" />
        <StatCard label="Active Trainers" value={summary?.total_trainers} color="purple" />
        <StatCard label="Active Batches" value={summary?.total_batches} color="teal" />
        <StatCard
          label="Unpaid Balance"
          value={`₹${Number(summary?.unpaid_balance || 0).toLocaleString('en-IN')}`}
          sub={`${summary?.unpaid_cycles_count} cycles pending`}
          color="red"
        />
        <StatCard
          label="Today's Attendance"
          value={`${summary?.today_attendance}/${summary?.today_total_scheduled}`}
          sub={`${attendancePct}% attendance rate`}
          color="green"
        />
        <StatCard
          label="This Month Collected"
          value={`₹${Number(summary?.monthly_collected || 0).toLocaleString('en-IN')}`}
          color="green"
        />
        <StatCard
          label="Monthly Expenses"
          value={`₹${Number(summary?.monthly_expenses || 0).toLocaleString('en-IN')}`}
          color="orange"
        />
        <StatCard
          label="Salary Pending"
          value={`₹${Number(summary?.salary_due || 0).toLocaleString('en-IN')}`}
          color="orange"
        />
      </div>

      {profit && (
        <div className="profit-preview">
          <h3>Monthly Profit Snapshot</h3>
          <div className="profit-table-wrapper">
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
                {profit.slice(0, 3).map(row => (
                  <tr key={`${row.month}-${row.year}`}>
                    <td>{row.month_name} {row.year}</td>
                    <td className="text-green">₹{Number(row.collected).toLocaleString('en-IN')}</td>
                    <td className="text-red">₹{Number(row.expenses).toLocaleString('en-IN')}</td>
                    <td className="text-orange">₹{Number(row.salaries).toLocaleString('en-IN')}</td>
                    <td className={row.profit >= 0 ? 'text-green bold' : 'text-red bold'}>
                      ₹{Number(row.profit).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
