import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { batchesAPI, trainersAPI } from '../api';
import dayjs from 'dayjs';

export default function Batches() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', batch_type: 'beginner', shift: 'morning', trainer: '',
    start_date: dayjs().format('YYYY-MM-DD'), monthly_fee: '', full_day_rate: '',
    half_day_rate: '', classes_per_month: 12, is_active: true
  });

  const { data, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchesAPI.list().then(r => r.data),
  });

  const { data: trainers } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => batchesAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setShowForm(false); },
  });

  const batches = data?.results || data || [];
  const trainerList = trainers?.results || trainers || [];

  const BATCH_TYPE_COLORS = {
    beginner: 'blue', intermediate: 'purple', advanced: 'teal',
    residential: 'orange', individual: 'red', home_tutoring: 'gray'
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Batches</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Batch</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add Batch</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Batch Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.batch_type} onChange={e => setForm(f => ({ ...f, batch_type: e.target.value }))}>
                    {['beginner','intermediate','advanced','residential','individual','home_tutoring'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Shift</label>
                  <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}>
                    {['morning','evening','both','na'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Trainer</label>
                  <select value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))} required>
                    <option value="">-- Select Trainer --</option>
                    {trainerList.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
                </div>
                {['beginner','intermediate'].includes(form.batch_type) && (
                  <>
                    <div className="form-group">
                      <label>Monthly Fee (₹)</label>
                      <input type="number" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Classes/Month</label>
                      <input type="number" value={form.classes_per_month} onChange={e => setForm(f => ({ ...f, classes_per_month: e.target.value }))} />
                    </div>
                  </>
                )}
                {form.batch_type === 'advanced' && (
                  <>
                    <div className="form-group">
                      <label>Full Day Rate (₹)</label>
                      <input type="number" value={form.full_day_rate} onChange={e => setForm(f => ({ ...f, full_day_rate: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Half Day Rate (₹)</label>
                      <input type="number" value={form.half_day_rate} onChange={e => setForm(f => ({ ...f, half_day_rate: e.target.value }))} />
                    </div>
                  </>
                )}
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
        <div className="card-grid">
          {batches.map(b => (
            <Link to={`/batches/${b.id}`} key={b.id} className="batch-card">
              <div className="batch-header">
                <span className={`badge badge-${BATCH_TYPE_COLORS[b.batch_type] || 'blue'}`}>{b.batch_type.replace('_',' ')}</span>
                <span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="batch-name">{b.name}</div>
              <div className="batch-meta">
                <span>Trainer: {b.trainer_name}</span>
                <span>{b.enrollment_count} students</span>
              </div>
              {b.shift !== 'na' && <div className="batch-shift">{b.shift} shift</div>}
            </Link>
          ))}
          {batches.length === 0 && <p className="empty">No batches found</p>}
        </div>
      )}
    </div>
  );
}
