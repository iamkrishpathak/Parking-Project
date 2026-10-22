import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PasswordRequirements from '../components/PasswordRequirements';
import { isPasswordValid } from '../utils/passwordPolicy';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!isPasswordValid(password)) {
      setError('Please meet all password requirements before resetting your password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', { token, password });
      setMessage(data.message);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reset your password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-4.5rem)] items-start bg-gradient-to-br from-white via-blue-50 to-white px-4 py-6 sm:items-center sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/70 sm:rounded-[2rem] sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-park-navy">Choose a new password</h2>
          <p className="text-sm text-slate-500 mt-2">Use a strong password that meets each requirement below.</p>
        </div>
        {!token ? (
          <div>
            <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">This reset link is incomplete. Request a new one to continue.</p>
            <Link to="/forgot-password" className="block mt-5 text-center text-park-blue font-semibold">Request a reset link</Link>
          </div>
        ) : message ? (
          <div>
            <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{message}</p>
            <Link to="/login" className="block mt-5 text-center text-park-blue font-semibold">Go to login</Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-slate-600 mb-1">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-blue-100 rounded-2xl px-4 py-3"
                minLength={8}
                maxLength={72}
                aria-describedby="reset-password-requirements"
                required
              />
              <PasswordRequirements password={password} id="reset-password-requirements" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-600 mb-1">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full border border-blue-100 rounded-2xl px-4 py-3"
                minLength={8}
                required
              />
            </div>
            {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-park-blue text-white font-semibold py-3 hover:bg-sky-500 disabled:opacity-70"
            >
              {loading ? 'Updating...' : 'Reset password'}
            </button>
          </form>
        )}
        {!message && token && (
          <p className="text-sm text-center text-slate-500 mt-5">
            <Link to="/forgot-password" className="text-park-blue font-semibold">Request a new link</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
