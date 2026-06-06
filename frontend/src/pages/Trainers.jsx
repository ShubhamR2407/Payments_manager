import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { trainersAPI } from '../api';

export default function Trainers() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ elo_rating: 1200, monthly_salary: '', max_level: 'advanced', is_active: true });

  const { data, isLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.list().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => trainersAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trainers'] }); setShowForm(false); },
  });

  const trainers = data?.results || data || [];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Trainers</h2>
      </div>

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
