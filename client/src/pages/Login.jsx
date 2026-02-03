import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      console.log('Attempting login with:', form);
      const { data } = await api.post('/api/auth/login', { email: form.email, password: form.password });
      console.log('Login successful:', data);
      login(data);
      navigate('/driver');
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(err.response?.data?.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-park-sky via-white to-emerald-50 flex items-center">
      <div className="max-w-4xl mx-auto w-full grid md:grid-cols-2 gap-10 px-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-park-navy">Login to ParkBandhu</h2>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Username/Name</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
                required
                placeholder="Enter your name or username"
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-park-blue text-white font-semibold py-3 hover:bg-indigo-600 disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <p className="text-sm text-center text-slate-500 mt-4">
            New to ParkBandhu?{' '}
            <Link to="/register" className="text-park-blue font-semibold">
              Create account
            </Link>
          </p>
        </div>
        <div className="hidden md:flex flex-col justify-center space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg">
            <p className="text-sm uppercase font-semibold text-park-blue">Why drivers ❤️ ParkBandhu!</p>
            <h3 className="text-2xl font-black text-park-navy mt-2">Tap, Park, Relax</h3>
            <p className="text-slate-500 mt-3">
              We pair verified hosts with drivers in real time. Cashless, queue-less, stress-less parking experiences across crowded cities.
              We believe in making your Park experience hassle-free and make it democratic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

