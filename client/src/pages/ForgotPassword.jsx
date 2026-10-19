import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-park-sky via-white to-emerald-50 flex items-center px-6 py-12">
      <div className="max-w-md mx-auto w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-park-navy">Forgot your password?</h2>
          <p className="text-sm text-slate-500 mt-2">Enter the email address on your account and we’ll send you a reset link.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>
          {message && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{message}</p>}
          {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-park-blue text-white font-semibold py-3 hover:bg-indigo-600 disabled:opacity-70"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className="text-sm text-center text-slate-500 mt-5">
          Remembered it? <Link to="/login" className="text-park-blue font-semibold">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
