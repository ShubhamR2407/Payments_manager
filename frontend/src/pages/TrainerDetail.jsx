import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trainersAPI } from '../api';

export default function TrainerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: trainer } = useQuery({
    queryKey: ['trainer', id],
    queryFn: () => trainersAPI.get(id).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['trainer-stats', id],
    queryFn: () => trainersAPI.stats(id).then(r => r.data),
  });

  if (!trainer) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h2>{trainer.full_name}</h2>
        </div>
        <span className={`badge ${trainer.is_active ? 'badge-green' : 'badge-gray'}`}>
          {trainer.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Trainer Info</h3>
          <table className="info-table">
            <tbody>
              <tr><td>ELO Rating</td><td><strong>{trainer.elo_rating}</strong></td></tr>
              <tr><td>Max Level</td><td>{trainer.max_level}</td></tr>
              <tr><td>Monthly Salary</td><td>₹{Number(trainer.monthly_salary).toLocaleString('en-IN')}</td></tr>
              <tr><td>Email</td><td>{trainer.user?.email}</td></tr>
              <tr><td>Phone</td><td>{trainer.user?.phone}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="detail-card">
          <h3>This Month</h3>
          {stats && (
            <div className="summary-amounts">
              <div className="amount-row"><span>Hours Logged:</span><span>{stats.hours_this_month}h</span></div>
              <div className="amount-row"><span>Active Batches:</span><span>{stats.active_batches}</span></div>
              {stats.payroll && (
                <>
                  <div className="amount-row"><span>Salary Due:</span><span>₹{Number(stats.payroll.salary_due).toLocaleString('en-IN')}</span></div>
                  <div className="amount-row"><span>Status:</span>
                    <span className={`badge badge-${stats.payroll.status === 'paid' ? 'green' : 'orange'}`}>
                      {stats.payroll.status}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
