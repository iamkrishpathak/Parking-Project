import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStates, getCities, getPlaces } from '../data/locations';
import { HeroGeometric } from '../components/ui/shape-landing-hero';

const Home = () => {
  const navigate = useNavigate();
  const [searchForm, setSearchForm] = useState({
    state: '',
    city: '',
    place: '',
    startTime: '',
    endTime: '',
  });

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/driver');
  };

  return (
    <main className="bg-white min-h-screen">
      {/* Hero Geometric Component */}
      <HeroGeometric 
        badge="ParkBandhu" 
        title1="Elevate Your" 
        title2="Parking Experience" 
      />

      {/* Video Section */}
      <section className="bg-white px-4 py-8">
        <div className="max-w-6xl mx-auto w-full overflow-hidden rounded-2xl">
          <video 
            width="100%" 
            height="auto" 
            autoPlay 
            muted 
            loop
            className="rounded-2xl shadow-2xl border border-park-blue/30 w-full h-auto"
            style={{ maxHeight: '600px', objectFit: 'cover', display: 'block', transform: 'scale(1.15)', transformOrigin: 'center top' }}
          >
            <source src="/parking-demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      {/* Hero with Search */}
      <section className="bg-gradient-to-br from-white via-blue-50 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <p className="text-sm font-semibold tracking-wider text-park-blue uppercase text-left">
                  Bharat Ka Apna Parking App
                </p>
                <h1
                  className="text-5xl md:text-6xl lg:text-7xl font-black text-park-navy text-left leading-tight"
                  style={{
                    letterSpacing: '0.01em',
                    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                  }}
                >
                  The Smarter way to find Parking in India.
                </h1>
                <div className="mt-2 text-left">
                  <p className="text-xl text-slate-600 max-w-2xl">
                    Thousands of reservable spaces located right where you need them. Join drivers and enjoy stress-free, affordable parking.
                  </p>
                </div>
              </div>

              {/* Key Benefits */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4">
                {/* <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-yellow-300"></span>
                </div> */}
                <div className="flex items-center gap-2 bg-blue-100 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-park-blue/30">
                  <svg className="w-5 h-5 text-park-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-park-blue">Best price guarantee</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-100 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-park-blue/30">
                  <svg className="w-5 h-5 text-park-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-park-blue">Trusted by drivers</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-100 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border border-park-blue/30">
                  <svg className="w-5 h-5 text-park-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-park-blue">Reservable spaces</span>
                </div>
              </div>
            </div>

            {/* Right Side - Search Section */}
            <div className="w-full">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8">
                <h2 className="text-2xl font-black text-park-navy mb-6">Find parking near you</h2>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Park at</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={searchForm.state}
                        onChange={(e) => setSearchForm({ ...searchForm, state: e.target.value, city: '', place: '' })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                      >
                        <option value="">State</option>
                        {getStates().map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      <select
                        value={searchForm.city}
                        onChange={(e) => setSearchForm({ ...searchForm, city: e.target.value, place: '' })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                        disabled={!searchForm.state || getCities(searchForm.state).length === 0}
                      >
                        <option value="">City</option>
                        {(getCities(searchForm.state) || []).map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <select
                        value={searchForm.place}
                        onChange={(e) => setSearchForm({ ...searchForm, place: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                        disabled={!searchForm.city}
                      >
                        <option value="">Place</option>
                        {getPlaces(searchForm.state, searchForm.city).map((place) => (
                          <option key={place.name} value={place.name}>{place.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">From</label>
                      <input
                        type="datetime-local"
                        value={searchForm.startTime}
                        onChange={(e) => setSearchForm({ ...searchForm, startTime: e.target.value })}
                        min={getCurrentDateTime()}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">Until</label>
                      <input
                        type="datetime-local"
                        value={searchForm.endTime}
                        onChange={(e) => setSearchForm({ ...searchForm, endTime: e.target.value })}
                        min={searchForm.startTime || getCurrentDateTime()}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-park-blue text-white font-bold py-4 text-lg hover:bg-indigo-600 transition shadow-lg shadow-blue-500/50"
                  >
                    Show parking spaces
                  </button>
                </form>
                <p className="text-xs text-gray-400 text-center mt-4">
                  Or <Link to="/host" className="text-indigo-500 font-semibold hover:underline">list your space</Link> and start earning
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    {/* Stats Section */}
    <section className="bg-blue-50 py-12 border-y border-blue-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { 
              label: 'Active Drivers', 
              value: 'Growing', 
              icon: (
                <svg className="w-8 h-8 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )
            },
            { 
              label: 'Live Spaces', 
              value: 'Available', 
              icon: (
                <svg className="w-8 h-8 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )
            },
            { 
              label: 'Cities Covered', 
              value: 'Expanding', 
              icon: (
                <svg className="w-8 h-8 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            },
            { 
              label: 'Service Quality', 
              value: 'Premium', 
              icon: (
                <svg className="w-8 h-8 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex justify-center mb-3">{stat.icon}</div>
              <p className="text-2xl font-black text-park-navy mb-1">{stat.value}</p>
              <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="bg-white max-w-full px-4 py-20">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-park-blue uppercase tracking-[0.3em] mb-2">
          Why Parkbandhu
        </p>
        <h2 className="text-4xl md:text-5xl font-black text-park-navy mt-2">Built for Movement</h2>
        <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
          Experience the future of parking with real-time availability, secure payments, and seamless booking.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: (
              <svg className="w-12 h-12 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
            title: 'Real-time Search',
            desc: 'Find verified spots within 5km using live geospatial queries. See availability instantly.',
          },
          {
            icon: (
              <svg className="w-12 h-12 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ),
            title: 'Secure Payments',
            desc: 'Collect and settle instantly your money instantly. Your money is always safe.',
          },
          {
            icon: (
              <svg className="w-12 h-12 text-park-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <text x="12" y="14" textAnchor="middle" fontSize="20" fill="currentColor" fontFamily="Arial, sans-serif" fontWeight="normal" dominantBaseline="middle">₹</text>
              </svg>
            ),
            title: 'Earn Money',
            desc: 'Turn your idle driveway or office parking into monthly income. Start earning today.',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-white rounded-3xl p-8 border border-blue-200 shadow-sm hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-2xl font-bold text-park-navy mb-3">{feature.title}</h3>
            <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
    </section>

    {/* How it Works */}
    <section className="bg-gradient-to-br from-white via-blue-50 to-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-park-blue uppercase tracking-[0.3em] mb-2">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-park-navy mt-2">Search to park in minutes</h2>
          <p className="text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
            Three simple steps to find and book your perfect parking spot
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {[
            { 
              step: '01', 
              icon: (
                <svg className="w-12 h-12 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ),
              title: 'Search', 
              desc: 'Enter your location and time. Discover nearby verified parking spaces instantly with our live map.',
              color: 'from-park-blue to-indigo-600'
            },
            { 
              step: '02', 
              icon: (
                <svg className="w-12 h-12 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Book & Pay', 
              desc: 'Select your preferred slot, confirm your booking, and pay securely through our integrated payment system.',
              color: 'from-park-blue to-indigo-600'
            },
            { 
              step: '03', 
              icon: (
                <svg className="w-12 h-12 text-park-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: 'Park', 
              desc: 'Follow clear directions to your reserved parking bay. Arrive, park, and enjoy stress-free parking.',
              color: 'from-park-blue to-indigo-600'
            },
          ].map((item, index) => (
            <div key={item.step} className="relative">
              <div className={`bg-gradient-to-br ${item.color} rounded-full w-16 h-16 flex items-center justify-center text-white text-xl font-black mb-6 mx-auto relative z-10 shadow-lg`}>
                {item.step}
              </div>
              <div className="bg-white rounded-3xl p-8 border border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-300 text-center">
                <div className="flex justify-center mb-4">{item.icon}</div>
                <h3 className="text-2xl font-bold text-park-navy mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="bg-gradient-to-br from-white via-blue-50 to-white text-park-navy py-20">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
        <h2 className="text-4xl md:text-5xl font-black leading-tight">
          Ready to find your perfect parking spot?
        </h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Join drivers who trust <span className="font-black text-park-blue tracking-wider">PARKBANDHU</span> for stress-free parking. Start searching now or list your space to earn extra income.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            to="/driver"
            className="px-8 py-4 rounded-full bg-park-blue text-white font-bold text-lg shadow-xl hover:bg-indigo-600 transition hover:-translate-y-1"
          >
            Find Parking Now
          </Link>
          <Link
            to="/host"
            className="px-8 py-4 rounded-full border-2 border-park-blue text-park-blue font-bold text-lg hover:bg-blue-50 transition hover:-translate-y-1"
          >
            List Your Space
          </Link>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-blue-50 text-park-navy py-8 border-t border-blue-200">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-4 text-sm">
        <p>© {new Date().getFullYear()} <span className="text-park-blue font-bold">ParkBandhu</span> All rights reserved.</p>
        <div className="flex gap-4">
          <Link to="/login" className="hover:text-park-blue">
            Login
          </Link>
          <Link to="/register" className="hover:text-park-blue">
            Register
          </Link>
          <a
            className="hover:text-park-blue"
            href="https://mail.google.com/mail/?view=cm&to=parkbandhu@gmail.com&su=Contact%20from%20PARKBANDHU"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
    </main>
  );
};

export default Home;

