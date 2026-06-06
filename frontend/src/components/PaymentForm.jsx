import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsAPI, bankAccountsAPI } from '../api';

export default function PaymentForm({ cycle, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { mode: 'cash', collected_by: 'admin' }
  });

  const { data: accounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => bankAccountsAPI.list().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => paymentsAPI.create({ ...data, cycle: cycle.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-cycles'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      onSuccess?.();
    },
  });

  const mode = watch('mode');

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <form className="payment-form" onSubmit={handleSubmit(onSubmit)}>
      <h3>Record Payment</h3>
      <div className="form-info">
        <p>Student: <strong>{cycle?.student_name}</strong></p>
        <p>Balance Due: <strong className="amount-due">₹{cycle?.balance}</strong></p>
      </div>

      <div className="form-group">
        <label>Amount (₹)</label>
        <input
          type="number"
          step="0.01"
          {...register('amount', { required: 'Amount required', min: { value: 0.01, message: 'Must be positive' } })}
          placeholder={cycle?.balance}
        />
        {errors.amount && <span className="error">{errors.amount.message}</span>}
      </div>

      <div className="form-group">
        <label>Payment Mode</label>
        <select {...register('mode', { required: true })}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>

      {(mode === 'upi' || mode === 'bank_transfer') && (
        <div className="form-group">
          <label>Bank Account</label>
          <select {...register('bank_account')}>
            <option value="">-- Select Account --</option>
            {accounts?.results?.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Collected By</label>
        <select {...register('collected_by')}>
          <option value="admin">Admin</option>
          <option value="trainer">Trainer</option>
        </select>
      </div>

      <div className="form-group">
        <label>Screenshot (optional)</label>
        <input type="file" accept="image/*" {...register('screenshot')} />
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea rows={2} {...register('notes')} placeholder="Optional notes..." />
      </div>

      {mutation.isError && (
        <div className="error-message">Error recording payment. Please try again.</div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}
