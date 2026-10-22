import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, markEmailVerified } = useAuth();
  const token = searchParams.get('token');
  const deliveryStatus = searchParams.get('sent');
  const [status, setStatus] = useState(token ? 'verifying' : 'ready');
  const [message, setMessage] = useState(deliveryStatus === '0'
    ? 'We could not send the verification email. Check the server SMTP configuration, then request another link below.'
    : '');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.post('/api/auth/verify-email', { token })
      .then(({ data }) => {
        if (!active) return;
        setStatus('verified');
        setMessage(data.message || 'Email verified successfully.');
        markEmailVerified();
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setMessage(error.response?.data?.message || 'This verification link could not be used. Request another one.');
      });
    return () => { active = false; };
  }, [token, markEmailVerified]);

  const resendVerification = async () => {
    setResending(true);
    setMessage('');
    try {
      const { data } = await api.post('/api/auth/resend-verification');
      setMessage(data.message || 'Verification email sent. Check your inbox and spam folder.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not send a verification email right now.');
    } finally {
      setResending(false);
    }
  };

  const verified = status === 'verified' || (user?.emailVerified && !token);

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-12">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/60 sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-700">Account security</p>
        <h1 className="mt-3 text-3xl font-black text-park-navy">
          {status === 'verifying' ? 'Verifying your email' : verified ? 'Email verified' : 'Check your email'}
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          {status === 'verifying'
            ? 'Please wait while we confirm your verification link.'
            : verified
              ? 'Your email is confirmed. You can now book spaces or manage host listings.'
              : `We sent a verification link${user?.email ? ` to ${user.email}` : ''}. It expires after 24 hours.`}
        </p>
        {message && <p role="status" className={`mt-5 rounded-2xl px-4 py-3 text-sm ${status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-800'}`}>{message}</p>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {!verified && isAuthenticated && (
            <button type="button" onClick={resendVerification} disabled={resending} className="rounded-full bg-park-blue px-6 py-3 font-bold text-white disabled:opacity-60">
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <Link to={isAuthenticated ? (user?.role === 'host' ? '/host' : '/driver') : '/login'} className="rounded-full border border-blue-100 px-6 py-3 text-center font-bold text-park-navy hover:bg-sky-50">
            {isAuthenticated ? 'Continue to ParkBandhu' : 'Go to login'}
          </Link>
        </div>
        {!isAuthenticated && !verified && <p className="mt-4 text-sm text-slate-500">Sign in to request a new link if this one expired.</p>}
      </section>
    </main>
  );
};

export default VerifyEmail;
