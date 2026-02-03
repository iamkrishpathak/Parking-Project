import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isDriverRoute = location.pathname.startsWith('/driver');
  const isHostRoute = location.pathname.startsWith('/host');

  const handleModeClick = (mode) => {
    if (mode === 'driver') navigate('/driver');
    if (mode === 'host') navigate('/host');
  };

  const userInitial = user?.name?.[0]?.toUpperCase() || '';

  return (
    <header className="bg-white/90 shadow-sm sticky top-0 z-30 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex flex-col leading-tight">
          <div className="text-2xl font-black tracking-wider text-park-blue bg-gradient-to-r from-park-blue to-indigo-600 bg-clip-text text-transparent">PARKBANDHU</div>
          <span className="text-[0.65rem] sm:text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">
            Bharat Ka Apna Parking App
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleModeClick('driver')}
              className={`px-3 py-1 rounded-full transition ${
                isDriverRoute ? 'bg-white text-park-blue shadow-sm' : 'text-slate-600'
              }`}
            >
              Driver
            </button>
            <button
              type="button"
              onClick={() => handleModeClick('host')}
              className={`px-3 py-1 rounded-full transition ${
                isHostRoute ? 'bg-white text-park-blue shadow-sm' : 'text-slate-600'
              }`}
            >
              Host
            </button>
          </div>
          {user ? (
            <>
              <button
                onClick={() => navigate(user.role === 'driver' ? '/driver/profile' : '/host')}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <div className="w-8 h-8 rounded-full bg-park-blue text-white flex items-center justify-center text-xs font-semibold cursor-pointer">
                  {userInitial}
                </div>
                <span className="hidden sm:block text-xs font-medium text-slate-700">
                  {user.name}
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1 text-xs font-semibold text-white bg-rose-500 rounded-full hover:bg-rose-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-park-blue rounded-full hover:bg-indigo-600"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;

