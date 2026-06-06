import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { batchesAPI, enrollmentsAPI, attendanceAPI } from '../api';
import AttendanceGrid from '../components/AttendanceGrid';
import dayjs from 'dayjs';

export default function Attendance() {
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
    <div className="page">
      <div className="page-header">
        <h2>Mark Attendance</h2>
      </div>

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

      {selectedBatch && (
        <AttendanceGrid
          enrollments={enrollments || []}
          existingRecords={records}
          batchId={selectedBatch}
          date={date}
          batchType={selectedBatchObj?.batch_type}
        />
      )}

      {!selectedBatch && (
        <div className="empty-state">
          <p>Select a batch to mark attendance</p>
        </div>
      )}
    </div>
  );
}
