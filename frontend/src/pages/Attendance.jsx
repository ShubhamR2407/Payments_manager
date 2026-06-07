import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchesAPI, enrollmentsAPI, attendanceAPI, trainerAttendanceAPI, trainersAPI } from '../api';
import AttendanceGrid from '../components/AttendanceGrid';
import dayjs from 'dayjs';

export default function Attendance() {
  const [tab, setTab] = useState('daily');

  return (
    <div className="page">
      <div className="page-header">
        <h2>Attendance</h2>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
          Daily Entry
        </button>
        <button className={`tab-btn ${tab === 'coach' ? 'active' : ''}`} onClick={() => setTab('coach')}>
          Coach Punch
        </button>
        <button className={`tab-btn ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          Summary Report
        </button>
      </div>

      {tab === 'daily' && <DailyTab />}
      {tab === 'coach' && <CoachTab />}
      {tab === 'summary' && <SummaryTab />}
    </div>
  );
}

function DailyTab() {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: batches } = useQuery({
    queryKey: ['batches', { is_active: 'true' }],
    queryFn: () => batchesAPI.list({ is_active: 'true' }).then(r => r.data),
  });

  const { data: enrollments } = useQuery({
    queryKey: ['batch-students', selectedBatch],
    queryFn: () => batchesAPI.students(selectedBatch).then(r => r.data),
    enabled: !!selectedBatch,
  });

  const { data: existingRecords } = useQuery({
    queryKey: ['attendance', { batch: selectedBatch, date }],
    queryFn: () => attendanceAPI.list({ batch: selectedBatch, date }).then(r => r.data),
    enabled: !!selectedBatch,
  });

  const batchList = batches?.results || batches || [];
  const selectedBatchObj = batchList.find(b => String(b.id) === String(selectedBatch));
  const records = existingRecords?.results || existingRecords || [];

  return (
    <div>
      <div className="attendance-controls">
        <div className="form-group">
          <label>Batch</label>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
            <option value="">-- Select Batch --</option>
            {batchList.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.batch_type})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {selectedBatch ? (
        <AttendanceGrid
          enrollments={enrollments || []}
          existingRecords={records}
          batchId={selectedBatch}
          date={date}
          batchType={selectedBatchObj?.batch_type}
        />
      ) : (
        <div className="empty-state"><p>Select a batch to mark attendance</p></div>
      )}
    </div>
  );
}

function CoachTab() {
  const qc = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [trainerPresent, setTrainerPresent] = useState({});

  const { data: batches } = useQuery({
    queryKey: ['batches', { is_active: 'true' }],
    queryFn: () => batchesAPI.list({ is_active: 'true' }).then(r => r.data),
  });

  const { data: existingCoach } = useQuery({
    queryKey: ['trainer-attendance', { batch: selectedBatch, date }],
    queryFn: () => trainerAttendanceAPI.list({ batch: selectedBatch, date }).then(r => r.data),
    enabled: !!selectedBatch,
    onSuccess: (data) => {
      const init = {};
      (data?.results || data || []).forEach(r => {
        init[r.trainer] = { present: r.present, hours_logged: r.hours_logged, cancelled_by_trainer: r.cancelled_by_trainer };
      });
      setTrainerPresent(init);
    },
  });

  const batchList = batches?.results || batches || [];
  const selectedBatchObj = batchList.find(b => String(b.id) === String(selectedBatch));

  const saveMut = useMutation({
    mutationFn: (records) => trainerAttendanceAPI.bulkEntry({ batch_id: selectedBatch, date, records }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer-attendance'] }),
  });

  const trainerId = selectedBatchObj?.trainer;

  const toggle = () => {
    setTrainerPresent(prev => ({
      ...prev,
      [trainerId]: { ...(prev[trainerId] || {}), present: !(prev[trainerId]?.present ?? true) }
    }));
  };

  const setHours = (hours) => {
    setTrainerPresent(prev => ({
      ...prev,
      [trainerId]: { ...(prev[trainerId] || {}), hours_logged: hours }
    }));
  };

  const save = () => {
    if (!trainerId) return;
    const record = trainerPresent[trainerId] || {};
    saveMut.mutate([{
      trainer_id: trainerId,
      present: record.present ?? true,
      cancelled_by_trainer: record.cancelled_by_trainer ?? false,
      hours_logged: record.hours_logged || 0,
    }]);
  };

  const coachData = trainerPresent[trainerId] || {};

  return (
    <div>
      <div className="attendance-controls">
        <div className="form-group">
          <label>Batch</label>
          <select value={selectedBatch} onChange={e => { setSelectedBatch(e.target.value); setTrainerPresent({}); }}>
            <option value="">-- Select Batch --</option>
            {batchList.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.batch_type})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {selectedBatchObj ? (
        <div className="attendance-grid">
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr><th>Coach</th><th>Present</th><th>Hours Logged</th></tr>
              </thead>
              <tbody>
                <tr className={coachData.present !== false ? 'present-row' : 'absent-row'}>
                  <td>{selectedBatchObj.trainer_name}</td>
                  <td>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={coachData.present ?? true} onChange={toggle} />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <input
                      type="number" min="0" step="0.5" style={{ width: '70px' }}
                      value={coachData.hours_logged ?? ''}
                      onChange={e => setHours(e.target.value)}
                      disabled={coachData.present === false}
                      placeholder="hrs"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="attendance-save">
            <button className="btn btn-primary" onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving...' : 'Save'}
            </button>
            {saveMut.isSuccess && <span className="success-text">Saved!</span>}
          </div>
        </div>
      ) : (
        <div className="empty-state"><p>Select a batch to log coach attendance</p></div>
      )}
    </div>
  );
}

function SummaryTab() {
  const [type, setType] = useState('student');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [month, setMonth] = useState(String(dayjs().month() + 1));
  const [year, setYear] = useState(String(dayjs().year()));
  const [queryParams, setQueryParams] = useState(null);

  const { data: trainers } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.list().then(r => r.data),
    enabled: type === 'coach',
  });

  const { data: studentSummary, isLoading: loadingStudent } = useQuery({
    queryKey: ['attendance-student-summary', queryParams],
    queryFn: () => attendanceAPI.studentSummary(queryParams).then(r => r.data),
    enabled: !!queryParams && type === 'student',
  });

  const { data: coachSummary, isLoading: loadingCoach } = useQuery({
    queryKey: ['attendance-coach-summary', queryParams],
    queryFn: () => trainerAttendanceAPI.summary(queryParams).then(r => r.data),
    enabled: !!queryParams && type === 'coach',
  });

  const trainerList = trainers?.results || trainers || [];
  const summary = type === 'student' ? studentSummary : coachSummary;
  const loading = type === 'student' ? loadingStudent : loadingCoach;

  const runReport = () => {
    if (type === 'student' && enrollmentId) {
      setQueryParams({ enrollment_id: enrollmentId, month, year });
    } else if (type === 'coach' && trainerId) {
      setQueryParams({ trainer_id: trainerId, month, year });
    }
  };

  return (
    <div>
      <div className="attendance-controls" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={e => { setType(e.target.value); setQueryParams(null); }}>
            <option value="student">Student</option>
            <option value="coach">Coach</option>
          </select>
        </div>
        {type === 'student' && (
          <div className="form-group">
            <label>Enrollment ID</label>
            <input type="number" value={enrollmentId} onChange={e => setEnrollmentId(e.target.value)} placeholder="Enter enrollment ID" />
          </div>
        )}
        {type === 'coach' && (
          <div className="form-group">
            <label>Trainer</label>
            <select value={trainerId} onChange={e => setTrainerId(e.target.value)}>
              <option value="">-- Select Trainer --</option>
              {trainerList.map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Month</label>
          <select value={month} onChange={e => setMonth(e.target.value)}>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={i+1} value={String(i+1)}>{m}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Year</label>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} style={{ width: '90px' }} />
        </div>
        <div className="form-group" style={{ alignSelf: 'flex-end' }}>
          <button className="btn btn-primary" onClick={runReport}>Generate Report</button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {summary && (
        <div>
          <div className="summary-amounts" style={{ display: 'flex', gap: '2rem', margin: '1rem 0', flexWrap: 'wrap' }}>
            <div className="detail-card" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.attendance_pct}%</div>
              <div style={{ color: '#666' }}>Attendance</div>
            </div>
            <div className="detail-card" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.present}</div>
              <div style={{ color: '#666' }}>Present</div>
            </div>
            <div className="detail-card" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.absent}</div>
              <div style={{ color: '#666' }}>Absent</div>
            </div>
            <div className="detail-card" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.total_sessions}</div>
              <div style={{ color: '#666' }}>Total</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  {type === 'student' && <th>Session</th>}
                  {type === 'student' && <th>Hours</th>}
                  {type === 'coach' && <th>Hours Logged</th>}
                </tr>
              </thead>
              <tbody>
                {(summary.records || []).map((r, i) => (
                  <tr key={i}>
                    <td>{dayjs(r.date).format('DD MMM YYYY')}</td>
                    <td>
                      <span className={`badge ${r.present ? 'badge-green' : 'badge-red'}`}>
                        {r.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    {type === 'student' && <td>{r.session_type}</td>}
                    {type === 'student' && <td>{r.hours ?? '-'}</td>}
                    {type === 'coach' && <td>{r.hours_logged ?? '-'}</td>}
                  </tr>
                ))}
                {!summary.records?.length && (
                  <tr><td colSpan={4} className="empty">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
