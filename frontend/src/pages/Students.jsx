import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { studentsAPI } from '../api';
import dayjs from 'dayjs';

export default function Students() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', parent_name: '', phone: '', whatsapp_number: '', join_date: dayjs().format('YYYY-MM-DD'),
    is_active: true, dob: '', city: '', address: '', elo_rating: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => studentsAPI.list({ search }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data) => editing ? studentsAPI.update(editing.id, data) : studentsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setShowForm(false); setEditing(null); resetForm(); },
  });

  const resetForm = () => setForm({ name: '', parent_name: '', phone: '', whatsapp_number: '', join_date: dayjs().format('YYYY-MM-DD'), is_active: true, dob: '', city: '', address: '', elo_rating: '' });

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      name: student.name, parent_name: student.parent_name, phone: student.phone,
      whatsapp_number: student.whatsapp_number, join_date: student.join_date, is_active: student.is_active,
      dob: student.dob || '', city: student.city || '', address: student.address || '',
      elo_rating: student.elo_rating || ''
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => { e.preventDefault(); createMut.mutate(form); };

  const students = data?.results || data || [];
  const totalDue = (s) => s.total_due - s.total_paid;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Students</h2>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>+ Add Student</button>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search by name, parent or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editing ? 'Edit Student' : 'Add Student'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Student Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Parent Name</label>
                  <input value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>WhatsApp Number</label>
                  <input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Join Date</label>
                  <input type="date" value={form.join_date} onChange={e => setForm(f => ({ ...f, join_date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>City / Town</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Address (optional)</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>ELO Rating (optional)</label>
                  <input type="number" value={form.elo_rating} onChange={e => setForm(f => ({ ...f, elo_rating: e.target.value }))} placeholder="e.g. 1200" />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    {' '}Active
                  </label>
                </div>
              </div>
              {createMut.isError && <div className="error-message">Error saving student</div>}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading students...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Phone</th>
                <th>Join Date</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const balance = totalDue(s);
                return (
                  <tr key={s.id}>
                    <td><Link to={`/students/${s.id}`} className="link">{s.name}</Link></td>
                    <td>{s.parent_name}</td>
                    <td>{s.phone}</td>
                    <td>{dayjs(s.join_date).format('DD MMM YYYY')}</td>
                    <td>
                      <span className={balance > 0 ? 'badge badge-red' : 'badge badge-green'}>
                        ₹{Number(balance).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(s)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && <tr><td colSpan={7} className="empty">No students found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
