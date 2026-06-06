import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eloTiersAPI, bankAccountsAPI } from '../api';

export default function Settings() {
  const qc = useQueryClient();
  const [showTierForm, setShowTierForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [tierForm, setTierForm] = useState({ session_type: 'individual', elo_min: 0, elo_max: '', rate_per_day: '' });
  const [bankForm, setBankForm] = useState({ label: '', account_last4: '', upi_id: '', is_active: true });

  const { data: tiers } = useQuery({
    queryKey: ['elo-tiers'],
    queryFn: () => eloTiersAPI.list().then(r => r.data),
  });

  const { data: banks } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => bankAccountsAPI.list().then(r => r.data),
  });

  const createTierMut = useMutation({
    mutationFn: (data) => eloTiersAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['elo-tiers'] }); setShowTierForm(false); },
  });

  const deleteTierMut = useMutation({
    mutationFn: (id) => eloTiersAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elo-tiers'] }),
  });

  const createBankMut = useMutation({
    mutationFn: (data) => bankAccountsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); setShowBankForm(false); },
  });

  const tierList = tiers?.results || tiers || [];
  const bankList = banks?.results || banks || [];

  return (
    <div className="page">
      <h2>Settings</h2>

      <div className="settings-section">
        <div className="section-header">
          <h3>ELO Rate Tiers</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowTierForm(true)}>+ Add Tier</button>
        </div>
        <p className="section-desc">Configure fee rates based on trainer ELO rating for residential/individual/home tutoring sessions.</p>

        {showTierForm && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add ELO Rate Tier</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Session Type</label>
                  <select value={tierForm.session_type} onChange={e => setTierForm(f => ({ ...f, session_type: e.target.value }))}>
                    <option value="residential">Residential</option>
                    <option value="individual">Individual</option>
                    <option value="home_tutoring">Home Tutoring</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ELO Min</label>
                  <input type="number" value={tierForm.elo_min} onChange={e => setTierForm(f => ({ ...f, elo_min: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>ELO Max (blank = no limit)</label>
                  <input type="number" value={tierForm.elo_max} onChange={e => setTierForm(f => ({ ...f, elo_max: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Rate per Day (₹)</label>
                  <input type="number" value={tierForm.rate_per_day} onChange={e => setTierForm(f => ({ ...f, rate_per_day: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowTierForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => createTierMut.mutate(tierForm)}>Save</button>
              </div>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Session Type</th><th>ELO Range</th><th>Rate/Day</th><th></th></tr></thead>
            <tbody>
              {tierList.map(t => (
                <tr key={t.id}>
                  <td>{t.session_type.replace('_', ' ')}</td>
                  <td>{t.elo_min} – {t.elo_max || '∞'}</td>
                  <td>₹{Number(t.rate_per_day).toLocaleString('en-IN')}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteTierMut.mutate(t.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {tierList.length === 0 && <tr><td colSpan={4} className="empty">No tiers configured</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h3>Bank Accounts</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBankForm(true)}>+ Add Account</button>
        </div>

        {showBankForm && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add Bank Account</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Label</label>
                  <input value={bankForm.label} onChange={e => setBankForm(f => ({ ...f, label: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Last 4 digits</label>
                  <input value={bankForm.account_last4} onChange={e => setBankForm(f => ({ ...f, account_last4: e.target.value }))} maxLength={4} />
                </div>
                <div className="form-group">
                  <label>UPI ID</label>
                  <input value={bankForm.upi_id} onChange={e => setBankForm(f => ({ ...f, upi_id: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowBankForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => createBankMut.mutate(bankForm)}>Save</button>
              </div>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Label</th><th>Account</th><th>UPI</th><th>Status</th></tr></thead>
            <tbody>
              {bankList.map(b => (
                <tr key={b.id}>
                  <td>{b.label}</td>
                  <td>****{b.account_last4}</td>
                  <td>{b.upi_id || '-'}</td>
                  <td><span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {bankList.length === 0 && <tr><td colSpan={4} className="empty">No accounts configured</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
