import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceAPI } from '../api';

export default function AttendanceGrid({ enrollments, existingRecords, batchId, date, batchType }) {
  const qc = useQueryClient();

  // Build initial state from existing records
  const initialState = {};
  enrollments?.forEach(e => {
    const rec = existingRecords?.find(r => r.enrollment === e.id);
    initialState[e.id] = {
      present: rec?.present ?? false,
      session_type: rec?.session_type ?? 'full',
    };
  });

  const [attendance, setAttendance] = useState(initialState);

  const mutation = useMutation({
    mutationFn: (records) => attendanceAPI.bulkEntry({ batch_id: batchId, date, records }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const toggle = (enrollmentId) => {
    setAttendance(prev => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], present: !prev[enrollmentId]?.present }
    }));
  };

  const setSessionType = (enrollmentId, type) => {
    setAttendance(prev => ({
      ...prev,
      [enrollmentId]: { ...prev[enrollmentId], session_type: type }
    }));
  };

  const save = () => {
    const records = Object.entries(attendance).map(([enrollment_id, val]) => ({
      enrollment_id: parseInt(enrollment_id),
      present: val.present,
      session_type: val.session_type || 'full',
    }));
    mutation.mutate(records);
  };

  const markAll = (present) => {
    const next = {};
    enrollments?.forEach(e => {
      next[e.id] = { ...attendance[e.id], present };
    });
    setAttendance(next);
  };

  const isAdvanced = batchType === 'advanced';

  return (
    <div className="attendance-grid">
      <div className="attendance-toolbar">
        <button className="btn btn-sm btn-success" onClick={() => markAll(true)}>Mark All Present</button>
        <button className="btn btn-sm btn-danger" onClick={() => markAll(false)}>Mark All Absent</button>
      </div>

      <div className="attendance-table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Present</th>
              {isAdvanced && <th>Session</th>}
            </tr>
          </thead>
          <tbody>
            {enrollments?.map(e => (
              <tr key={e.id} className={attendance[e.id]?.present ? 'present-row' : 'absent-row'}>
                <td>{e.student_name}</td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={attendance[e.id]?.present ?? false}
                      onChange={() => toggle(e.id)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </td>
                {isAdvanced && (
                  <td>
                    <select
                      value={attendance[e.id]?.session_type || 'full'}
                      onChange={(ev) => setSessionType(e.id, ev.target.value)}
                      disabled={!attendance[e.id]?.present}
                    >
                      <option value="full">Full Day</option>
                      <option value="half">Half Day</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="attendance-save">
        <span className="attendance-summary">
          {Object.values(attendance).filter(v => v.present).length} / {enrollments?.length || 0} present
        </span>
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Saving...' : 'Save Attendance'}
        </button>
        {mutation.isSuccess && <span className="success-text">Saved!</span>}
      </div>
    </div>
  );
}
