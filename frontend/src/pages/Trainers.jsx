import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { trainersAPI } from '../api';

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '',
  elo_rating: 1200, monthly_salary: '', max_level: 'advanced',
};

export default function Trainers() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => trainersAPI.createWithUser(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['trainers'] });
      setShowForm(false);
      setForm(emptyForm);
      setCreatedCredentials(res.data.credentials);
    },
  });

  const trainers = data?.results || data || [];
  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <h2>Trainers</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setCreatedCredentials(null); }}>
          + Add Trainer
        </button>
      </div>

      {createdCredentials && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Trainer Created</h3>
            <p>Credentials have been emailed to the trainer. Please also note them down:</p>
            <table className="info-table">
              <tbody>
                <tr><td>Username</td><td><strong>{createdCredentials.username}</strong></td></tr>
                <tr><td>Password</td><td><strong>{createdCredentials.password}</strong></td></tr>
              </tbody>
            </table>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => setCreatedCredentials(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Trainer</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input value={form.first_name} onChange={f('first_name')} required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={form.last_name} onChange={f('last_name')} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={f('email')} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={f('phone')} />
                </div>
                <div className="form-group">
                  <label>ELO Rating</label>
                  <input type="number" value={form.elo_rating} onChange={f('elo_rating')} required />
                </div>
                <div className="form-group">
                  <label>Monthly Salary (₹)</label>
                  <input type="number" value={form.monthly_salary} onChange={f('monthly_salary')} required />
                </div>
                <div className="form-group">
                  <label>Max Level</label>
                  <select value={form.max_level} onChange={f('max_level')}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              {createMut.isError && (
                <div className="error-message">
                  {createMut.error?.response?.data?.error || 'Error creating trainer'}
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Creating...' : 'Create Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="card-grid">
          {trainers.map(t => (
            <Link to={`/trainers/${t.id}`} key={t.id} className="trainer-card">
              <div className="trainer-avatar">{t.full_name?.charAt(0) || '?'}</div>
              <div className="trainer-info">
                <div className="trainer-name">{t.full_name}</div>
                <div className="trainer-elo">ELO: {t.elo_rating}</div>
                <div className="trainer-level">{t.max_level} level</div>
                <div className="trainer-salary">₹{Number(t.monthly_salary).toLocaleString('en-IN')}/mo</div>
              </div>
              <span className={`badge ${t.is_active ? 'badge-green' : 'badge-gray'}`}>
                {t.is_active ? 'Active' : 'Inactive'}
              </span>
            </Link>
          ))}
          {trainers.length === 0 && <p className="empty">No trainers found</p>}
        </div>
      )}
    </div>
  );
}
