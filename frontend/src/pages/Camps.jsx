import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { campsAPI, trainersAPI } from '../api';
import dayjs from 'dayjs';

export default function Camps() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', trainer: '', start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(7, 'day').format('YYYY-MM-DD'), daily_rate: 2000, is_active: true
  });

  const { data, isLoading } = useQuery({
    queryKey: ['camps'],
    queryFn: () => campsAPI.list().then(r => r.data),
  });

  const { data: trainers } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => campsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camps'] }); setShowForm(false); },
  });

  const camps = data?.results || data || [];
  const trainerList = trainers?.results || trainers || [];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Camps</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Camp</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Camp</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Camp Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Trainer</label>
                  <select value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))} required>
                    <option value="">-- Select --</option>
                    {trainerList.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Daily Rate (₹)</label>
                  <input type="number" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? <div className="loading">Loading...</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Trainer</th><th>Dates</th><th>Days</th><th>Daily Rate</th><th>Students</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {camps.map(c => (
                <tr key={c.id}>
                  <td><Link to={`/camps/${c.id}`} className="link">{c.name}</Link></td>
                  <td>{c.trainer_name}</td>
                  <td>{dayjs(c.start_date).format('DD MMM')} – {dayjs(c.end_date).format('DD MMM YYYY')}</td>
                  <td>{c.total_days}</td>
                  <td>₹{Number(c.daily_rate).toLocaleString('en-IN')}</td>
                  <td>{c.enrollment_count}</td>
                  <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Active' : 'Done'}</span></td>
                  <td><Link to={`/camps/${c.id}`} className="btn btn-sm btn-secondary">View</Link></td>
                </tr>
              ))}
              {camps.length === 0 && <tr><td colSpan={8} className="empty">No camps found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
