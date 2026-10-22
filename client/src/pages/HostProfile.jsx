import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const statusStyles = {
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  action_required: 'bg-amber-50 text-amber-800',
  pending: 'bg-sky-50 text-sky-700',
  under_review: 'bg-indigo-50 text-indigo-700',
  draft: 'bg-slate-100 text-slate-600',
};

const HostProfile = () => {
  const navigate = useNavigate();
  const { user, isHost, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [spaces, setSpaces] = useState([]);
  const [summary, setSummary] = useState({ moneyCollected: 0, bookingsCount: 0 });
  const [kycStatus, setKycStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isHost) {
      navigate('/host');
      return;
    }

    let cancelled = false;
    const loadOverview = async () => {
      setLoading(true);
      setError('');
      const [spacesResult, summaryResult, kycResult] = await Promise.allSettled([
        api.get('/api/spaces/mine'),
        api.get('/api/bookings/host/summary'),
        api.get('/api/auth/kyc-status'),
      ]);

      if (cancelled) return;
      if (spacesResult.status === 'fulfilled') {
        setSpaces(Array.isArray(spacesResult.value.data) ? spacesResult.value.data : []);
      }
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value.data || { moneyCollected: 0, bookingsCount: 0 });
      }
      if (kycResult.status === 'fulfilled') {
        setKycStatus(kycResult.value.data?.kycStatus || kycResult.value.data?.kyc_status || 'pending');
      }

      if ([spacesResult, summaryResult, kycResult].some((result) => result.status === 'rejected')) {
        setError('Some host profile information could not be loaded. Refresh to try again.');
      }
      setLoading(false);
    };

    loadOverview();
    return () => { cancelled = true; };
  }, [isHost, navigate, refreshKey]);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.put('/api/auth/profile', profileForm);
      updateUser(data.user);
      setMessage('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isHost) return null;

  const approvedSpaces = spaces.filter((space) => space.verification?.status === 'approved').length;
  const userInitial = user?.name?.trim()?.[0]?.toUpperCase() || 'H';
  const formattedRevenue = Number(summary.moneyCollected || 0).toLocaleString('en-IN');
  const kycLabel = String(kycStatus).replaceAll('_', ' ');
  const kycTone = statusStyles[kycStatus] || statusStyles.pending;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <section className="relative isolate mb-7 overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-6 shadow-sm sm:p-9">
          <div aria-hidden="true" className="absolute -right-12 -top-20 -z-10 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-sky-700 shadow-sm">
                <Building2 size={14} /> Host account
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-park-navy sm:text-4xl">
                Your host profile, <span className="bg-gradient-to-r from-sky-500 via-park-blue to-indigo-400 bg-clip-text text-transparent">all in one place.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Keep your account details up to date and see how your parking listings are doing.
              </p>
              <Link to="/host" className="mt-6 inline-flex items-center gap-2 rounded-full bg-park-blue px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-500">
                Manage listings <ArrowRight size={16} />
              </Link>
            </div>
            <div className="flex w-full items-center gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur-sm md:w-auto md:min-w-60">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-park-blue text-xl font-black text-white shadow-md shadow-sky-200">{userInitial}</div>
              <div className="min-w-0">
                <p className="truncate font-extrabold text-park-navy">{user?.name || 'Host'}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">{user?.email || 'ParkBandhu host'}</p>
                <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${kycTone}`}>
                  <ShieldCheck size={13} /> KYC {kycLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}
        {message && <div role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{message}</div>}

        <section aria-label="Host account overview" className="mb-7 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total listings', value: loading ? '…' : spaces.length, note: 'Spaces you manage', icon: Building2, tone: 'bg-sky-50 text-sky-700' },
            { label: 'Approved listings', value: loading ? '…' : approvedSpaces, note: 'Visible to drivers', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Paid bookings', value: loading ? '…' : summary.bookingsCount || 0, note: `₹${formattedRevenue} collected`, icon: ClipboardList, tone: 'bg-indigo-50 text-indigo-700' },
          ].map(({ label, value, note, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-park-navy">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{note}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
              </div>
            </article>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Your account</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Profile details</h2>
              </div>
              <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-blue-100 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60" title="Refresh host information">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label htmlFor="host-profile-name" className="mb-1.5 block text-sm font-bold text-slate-600">Name</label>
                <input id="host-profile-name" type="text" autoComplete="name" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} className="w-full px-4 py-3" required />
              </div>
              <div>
                <label htmlFor="host-profile-email" className="mb-1.5 block text-sm font-bold text-slate-600">Email</label>
                <input id="host-profile-email" type="email" autoComplete="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} className="w-full px-4 py-3" required />
              </div>
              <div>
                <label htmlFor="host-profile-phone" className="mb-1.5 block text-sm font-bold text-slate-600">Phone</label>
                <input id="host-profile-phone" type="tel" autoComplete="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} className="w-full px-4 py-3" />
              </div>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-park-blue px-6 py-3 font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500 disabled:cursor-wait disabled:opacity-60">
                <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Listing status</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Your parking spaces</h2>
            </div>
            {loading && spaces.length === 0 ? (
              <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-slate-100" /><div className="h-20 animate-pulse rounded-2xl bg-slate-100" /></div>
            ) : spaces.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-sky-50/80 to-white px-5 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm"><Building2 size={21} /></span>
                <h3 className="mt-4 font-extrabold text-park-navy">No listings yet</h3>
                <p className="mt-1 text-sm text-slate-500">Add a parking space to start hosting.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {spaces.slice(0, 4).map((space) => {
                  const status = space.verification?.status || 'draft';
                  return (
                    <article key={space._id} className="flex items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Building2 size={18} /></span>
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-park-navy">{space.title || 'Parking space'}</h3>
                          <p className="mt-1 truncate text-sm text-slate-500">{space.address || 'Address not provided'}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusStyles[status] || statusStyles.pending}`}>{status.replaceAll('_', ' ')}</span>
                    </article>
                  );
                })}
                {spaces.length > 4 && <p className="text-center text-xs text-slate-500">Showing 4 of {spaces.length} listings</p>}
              </div>
            )}
            {kycStatus !== 'approved' && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold capitalize text-amber-900">Host verification {kycLabel}</p>
                  <p className="mt-1 text-sm leading-5 text-amber-800">Complete host verification to submit parking listings for review.</p>
                  <Link to="/host-kyc" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-800">Review verification <ArrowRight size={14} /></Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default HostProfile;
