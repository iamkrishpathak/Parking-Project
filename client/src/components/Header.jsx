import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isDriverRoute = location.pathname.startsWith('/driver');
  const isHostRoute = location.pathname.startsWith('/host');

  const handleModeClick = (mode) => {
    setMobileMenuOpen(false);
    if (mode === 'driver') navigate('/driver');
    if (mode === 'host') navigate('/host');
  };

  const accountPath = user?.role === 'host' ? '/host/profile' : user?.role === 'driver' ? '/driver/profile' : '/admin';
  const closeMenu = () => setMobileMenuOpen(false);

  const userInitial = user?.name?.[0]?.toUpperCase() || '';

  return (
    <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3">
        <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center">
          <img
            src="/Media/ParkBandhu_Logo_Transparent.svg"
            alt="ParkBandhu — Bharat Ka Apna Parking App"
            className="h-11 w-auto sm:h-14 md:h-[4.5rem]"
          />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-3 md:flex">
          <div className="inline-flex rounded-full border border-blue-100 bg-sky-50 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleModeClick('driver')}
              className={`px-3 py-1 rounded-full transition ${
                isDriverRoute ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              Driver
            </button>
            <button
              type="button"
              onClick={() => handleModeClick('host')}
              className={`px-3 py-1 rounded-full transition ${
                isHostRoute ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              Host
            </button>
          </div>
          {user ? (
            <>
              {user.emailVerified !== true && user.role !== 'admin' && (
                <Link to="/verify-email" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">
                  Verify email
                </Link>
              )}
              <button
                onClick={() => navigate(accountPath)}
                className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-sky-50"
              >
                <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-park-blue text-xs font-bold text-white shadow-sm">
                  {userInitial}
                </div>
                <span className="hidden max-w-40 truncate text-xs font-semibold text-slate-700 sm:block">
                  {user.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); logout(); }}
                className="rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-park-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500"
            >
              Login
            </Link>
          )}
        </nav>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-100 bg-white text-slate-700 shadow-sm transition hover:bg-sky-50 md:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-main-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeWidth="2" strokeLinecap="round" /></svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" strokeWidth="2" strokeLinecap="round" /></svg>
          )}
        </button>
      </div>
      {mobileMenuOpen && (
        <nav id="mobile-main-navigation" aria-label="Mobile navigation" className="border-t border-blue-100 bg-white px-4 pb-4 pt-3 shadow-lg md:hidden">
          <div className="mx-auto grid max-w-6xl gap-3">
            <div className="grid grid-cols-2 rounded-2xl border border-blue-100 bg-sky-50 p-1 text-sm font-bold">
              <button type="button" onClick={() => handleModeClick('driver')} className={`min-h-11 rounded-xl px-3 ${isDriverRoute ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}>Driver</button>
              <button type="button" onClick={() => handleModeClick('host')} className={`min-h-11 rounded-xl px-3 ${isHostRoute ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}>Host</button>
            </div>
            {user ? (
              <>
                {user.emailVerified !== true && user.role !== 'admin' && (
                  <Link to="/verify-email" onClick={closeMenu} className="flex min-h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800">
                    Verify email
                  </Link>
                )}
                <Link to={accountPath} onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-slate-700 hover:bg-sky-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-park-blue text-xs font-bold text-white">{userInitial}</span>
                  <span className="min-w-0 flex-1 truncate">{user.name || 'My account'}</span>
                  <span className="text-slate-400">Profile</span>
                </Link>
                <button type="button" onClick={() => { closeMenu(); logout(); }} className="min-h-12 rounded-full bg-rose-500 px-4 text-sm font-bold text-white hover:bg-rose-600">Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={closeMenu} className="flex min-h-12 items-center justify-center rounded-full bg-park-blue px-5 text-sm font-bold text-white shadow-sm hover:bg-sky-500">Login</Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;

