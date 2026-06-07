import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsAPI, enrollmentsAPI } from '../api';
import dayjs from 'dayjs';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deactivateModal, setDeactivateModal] = useState(null); // enrollment object or 'all'

  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsAPI.get(id).then(r => r.data),
  });

  const { data: cycles } = useQuery({
    queryKey: ['student-payment-history', id],
    queryFn: () => studentsAPI.paymentHistory(id).then(r => r.data),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['student-enrollments', id],
    queryFn: () => studentsAPI.enrollments(id).then(r => r.data),
  });

  const deactivateMut = useMutation({
    mutationFn: ({ enrollmentId, deactivate_all }) =>
      enrollmentsAPI.deactivate(enrollmentId, { deactivate_all }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-enrollments', id] });
      setDeactivateModal(null);
    },
  });

  if (!student) return <div className="loading">Loading...</div>;

  const totalDue = (cycles || []).reduce((acc, c) => acc + parseFloat(c.fee_due || 0), 0);
  const totalPaid = (cycles || []).reduce((acc, c) => acc + parseFloat(c.fee_paid || 0), 0);
  const balance = totalDue - totalPaid;

  return (
    <div className="page">
      {deactivateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Deactivate Enrollment</h3>
            <p>
              {deactivateModal === 'all'
                ? `Deactivate all active batches for ${student.name}?`
                : `Deactivate ${deactivateModal.batch_name}?`}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              If the student attended ≤ half the classes this month, the fee will be halved.
            </p>
            {deactivateMut.isError && <div className="error-message">Failed to deactivate</div>}
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setDeactivateModal(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={deactivateMut.isPending}
                onClick={() => {
                  const enrollmentId = deactivateModal === 'all'
                    ? (enrollments || []).find(e => e.is_active)?.id
                    : deactivateModal.id;
                  if (!enrollmentId) return;
                  deactivateMut.mutate({ enrollmentId, deactivate_all: deactivateModal === 'all' });
                }}
              >
                {deactivateMut.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <h2>{student.name}</h2>
        </div>
        <span className={`badge ${student.is_active ? 'badge-green' : 'badge-gray'}`}>
          {student.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Student Info</h3>
          <table className="info-table">
            <tbody>
              <tr><td>Parent</td><td>{student.parent_name}</td></tr>
              <tr><td>Phone</td><td>{student.phone}</td></tr>
              <tr><td>WhatsApp</td><td>{student.whatsapp_number}</td></tr>
              <tr><td>Join Date</td><td>{dayjs(student.join_date).format('DD MMM YYYY')}</td></tr>
              {student.dob && <tr><td>DOB</td><td>{dayjs(student.dob).format('DD MMM YYYY')}</td></tr>}
              {student.city && <tr><td>City</td><td>{student.city}</td></tr>}
              {student.address && <tr><td>Address</td><td>{student.address}</td></tr>}
              {student.elo_rating && <tr><td>ELO Rating</td><td>{student.elo_rating}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="detail-card">
          <h3>Payment Summary</h3>
          <div className="summary-amounts">
            <div className="amount-row"><span>Total Due:</span><span>₹{totalDue.toLocaleString('en-IN')}</span></div>
            <div className="amount-row"><span>Total Paid:</span><span className="text-green">₹{totalPaid.toLocaleString('en-IN')}</span></div>
            <div className="amount-row bold"><span>Balance:</span>
              <span className={balance > 0 ? 'text-red' : 'text-green'}>₹{balance.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Enrollments</h3>
          {(enrollments || []).some(e => e.is_active) && (
            <button className="btn btn-sm btn-danger" onClick={() => setDeactivateModal('all')}>
              Deactivate All Batches
            </button>
          )}
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch</th><th>Join Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(enrollments || []).map(e => (
                <tr key={e.id}>
                  <td>{e.batch_name}</td>
                  <td>{dayjs(e.join_date).format('DD MMM YYYY')}</td>
                  <td><span className={`badge ${e.is_active ? 'badge-green' : 'badge-gray'}`}>{e.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    {e.is_active && (
                      <button className="btn btn-sm btn-danger" onClick={() => setDeactivateModal(e)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!enrollments?.length && <tr><td colSpan={4} className="empty">No enrollments</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h3>Payment History</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Month/Year</th><th>Fee Due</th><th>Fee Paid</th><th>Balance</th><th>Status</th></tr>
            </thead>
            <tbody>
              {(cycles || []).map(c => (
                <tr key={c.id}>
                  <td>{c.month}/{c.year}</td>
                  <td>₹{Number(c.fee_due).toLocaleString('en-IN')}</td>
                  <td>₹{Number(c.fee_paid).toLocaleString('en-IN')}</td>
                  <td className={c.balance > 0 ? 'text-red' : 'text-green'}>₹{Number(c.balance).toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'paid' ? 'green' : c.status === 'partial' ? 'orange' : 'red'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!cycles?.length && <tr><td colSpan={5} className="empty">No payment records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
