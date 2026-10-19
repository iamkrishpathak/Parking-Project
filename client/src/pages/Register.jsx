import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'host' ? 'host' : 'driver';
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: initialRole,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      login(data);
      navigate(form.role === 'host' ? '/host' : '/driver');
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Unable to register';
      console.log('Register error →', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/google', {
        credential,
        role: form.role,
      });
      login(data);
      navigate(data.user.role === 'host' ? '/host' : data.user.role === 'admin' ? '/admin' : '/driver');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to continue with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-white via-park-sky to-emerald-50 flex items-center">
      <div className="max-w-5xl mx-auto w-full grid md:grid-cols-2 gap-8 px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-park-navy">Create your ParkBandhu account</h2>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
              >
                <option value="driver">Driver</option>
                <option value="host">Parking Owner</option>
              </select>
            </div>
            {error && (
              <p className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-park-blue text-white font-semibold py-3 hover:bg-indigo-600 disabled:opacity-70"
            >
              {loading ? 'Creating...' : form.role === 'host' ? 'Create host account' : 'Create driver account'}
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>or sign up with</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} disabled={loading} />
          <p className="text-sm text-center text-slate-500 mt-4">
            Already on ParkBandhu?{' '}
            <Link to="/login" className="text-park-blue font-semibold">
              Login
            </Link>
          </p>
        </div>
        <div className="hidden md:flex flex-col justify-center space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg">
            <p className="text-xs font-semibold text-park-blue">Trusted by most of the Parking Owners and Drivers!</p>
            <h3 className="text-2xl font-black text-park-navy mt-2">Earn from idle parking and Park your Vehicle hassle-free</h3>
            <p className="text-slate-500 mt-3">
              Share availability, set your rates, and let drivers discover you through our geospatial search layer.
              Similarly the driver can access the parking spaces hassle-free, no need of congestion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

