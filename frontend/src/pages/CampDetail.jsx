import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campsAPI, campEnrollmentsAPI, studentsAPI, attendanceAPI } from '../api';
import dayjs from 'dayjs';

export default function CampDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showEnroll, setShowEnroll] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  const { data: camp } = useQuery({
    queryKey: ['camp', id],
    queryFn: () => campsAPI.get(id).then(r => r.data),
  });

  const { data: campEnrollments } = useQuery({
    queryKey: ['camp-enrollments', id],
    queryFn: () => campEnrollmentsAPI.list({ camp: id }).then(r => r.data),
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsAPI.list({ is_active: 'true' }).then(r => r.data),
    enabled: showEnroll,
  });

  const enrollMut = useMutation({
    mutationFn: (data) => campEnrollmentsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['camp-enrollments', id] }); setShowEnroll(false); },
  });

  const saveAttendance = useMutation({
    mutationFn: ({ records }) => attendanceAPI.bulkCampEntry({ camp_id: id, date: attendanceDate, records }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['camp-attendance', id] }),
  });

  if (!camp) return <div className="loading">Loading...</div>;

  const enrollments = campEnrollments?.results || campEnrollments || [];
  const allStudents = students?.results || students || [];
  const enrolledIds = new Set(enrollments.map(e => e.student));
  const available = allStudents.filter(s => !enrolledIds.has(s.id));

  return (
    <div className="page">
      <div className="page-header">
        <h2>{camp.name}</h2>
        <span className={`badge ${camp.is_active ? 'badge-green' : 'badge-gray'}`}>{camp.is_active ? 'Active' : 'Done'}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Camp Info</h3>
          <table className="info-table">
            <tbody>
              <tr><td>Trainer</td><td>{camp.trainer_name}</td></tr>
              <tr><td>Start</td><td>{dayjs(camp.start_date).format('DD MMM YYYY')}</td></tr>
              <tr><td>End</td><td>{dayjs(camp.end_date).format('DD MMM YYYY')}</td></tr>
              <tr><td>Total Days</td><td>{camp.total_days}</td></tr>
              <tr><td>Daily Rate</td><td>₹{Number(camp.daily_rate).toLocaleString('en-IN')}</td></tr>
              <tr><td>Total Students</td><td>{camp.enrollment_count}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="detail-card">
          <div className="section-header">
            <h3>Enrolled Students</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setShowEnroll(true)}>+ Enroll</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Student</th><th>Payment</th></tr></thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id}>
                    <td>{e.student_name}</td>
                    <td><span className={`badge badge-${e.payment_status === 'paid' ? 'green' : e.payment_status === 'partial' ? 'orange' : 'red'}`}>{e.payment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showEnroll && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Enroll Student in Camp</h3>
            <div className="form-group">
              <label>Select Student</label>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">-- Select --</option>
                {available.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowEnroll(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!selectedStudent}
                onClick={() => enrollMut.mutate({ camp: id, student: selectedStudent })}>
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
