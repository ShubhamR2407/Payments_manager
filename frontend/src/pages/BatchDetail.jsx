import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchesAPI, studentsAPI, enrollmentsAPI, attendanceAPI } from '../api';
import AttendanceGrid from '../components/AttendanceGrid';
import dayjs from 'dayjs';

export default function BatchDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showEnroll, setShowEnroll] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  const { data: batch } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => batchesAPI.get(id).then(r => r.data),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['batch-students', id],
    queryFn: () => batchesAPI.students(id).then(r => r.data),
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendance', { batch: id, date: attendanceDate }],
    queryFn: () => attendanceAPI.list({ batch: id, date: attendanceDate }).then(r => r.data),
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsAPI.list({ is_active: 'true' }).then(r => r.data),
    enabled: showEnroll,
  });

  const enrollMut = useMutation({
    mutationFn: (data) => enrollmentsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batch-students', id] }); setShowEnroll(false); },
  });

  if (!batch) return <div className="loading">Loading...</div>;

  const allStudents = students?.results || students || [];
  const enrolledIds = new Set((enrollments || []).map(e => e.student));
  const available = allStudents.filter(s => !enrolledIds.has(s.id));
  const records = attendanceRecords?.results || attendanceRecords || [];

  return (
    <div className="page">
      <div className="page-header">
        <h2>{batch.name}</h2>
        <span className={`badge badge-blue`}>{batch.batch_type}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Batch Info</h3>
          <table className="info-table">
            <tbody>
              <tr><td>Type</td><td>{batch.batch_type}</td></tr>
              <tr><td>Shift</td><td>{batch.shift}</td></tr>
              <tr><td>Trainer</td><td>{batch.trainer_name}</td></tr>
              <tr><td>Start Date</td><td>{dayjs(batch.start_date).format('DD MMM YYYY')}</td></tr>
              <tr><td>Students</td><td>{batch.enrollment_count}</td></tr>
              {batch.monthly_fee && <tr><td>Monthly Fee</td><td>₹{batch.monthly_fee}</td></tr>}
              {batch.full_day_rate && <tr><td>Full Day Rate</td><td>₹{batch.full_day_rate}</td></tr>}
              {batch.half_day_rate && <tr><td>Half Day Rate</td><td>₹{batch.half_day_rate}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="detail-card">
          <div className="section-header">
            <h3>Enrolled Students</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setShowEnroll(true)}>+ Enroll</button>
          </div>
          {(enrollments || []).map(e => (
            <div key={e.id} className="student-chip">
              {e.student_name}
              <span className={`badge badge-sm ${e.is_active ? 'badge-green' : 'badge-gray'}`}>{e.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      </div>

      {showEnroll && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Enroll Student</h3>
            <div className="form-group">
              <label>Select Student</label>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">-- Select --</option>
                {available.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowEnroll(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!selectedStudent || enrollMut.isPending}
                onClick={() => enrollMut.mutate({ student: selectedStudent, batch: id, join_date: dayjs().format('YYYY-MM-DD') })}>
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h3>Mark Attendance</h3>
          <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
        </div>
        <AttendanceGrid
          enrollments={enrollments || []}
          existingRecords={records}
          batchId={id}
          date={attendanceDate}
          batchType={batch.batch_type}
        />
      </div>
    </div>
  );
}
