import React, { useState, useEffect } from 'react';
import api from '../api/client';
import KYCVerificationModal from '../components/KYCVerificationModal';
import ParkingSpaceVerificationPanel from '../components/admin/ParkingSpaceVerificationPanel';

const AdminDashboard = () => {
  const [pendingKYC, setPendingKYC] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('kyc');

  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const fetchPendingKYC = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/auth/admin/pending-kyc');
      setPendingKYC(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch pending KYC requests');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, documents) => {
    try {
      await api.put(`/api/auth/admin/kyc/${userId}/status`, {
        status: 'approved',
        documents: documents
      });
      await fetchPendingKYC();
      setSelectedKYC(null);
      alert('KYC Approved Successfully!');
    } catch (err) {
      alert('Error approving KYC: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (userId, reason) => {
    try {
      await api.put(`/api/auth/admin/kyc/${userId}/status`, {
        status: 'rejected',
        rejectionReason: reason
      });
      await fetchPendingKYC();
      setSelectedKYC(null);
      alert('KYC Rejected');
    } catch (err) {
      alert('Error rejecting KYC: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRequestDocuments = async (userId, requestDetails) => {
    try {
      await api.put(`/api/auth/admin/kyc/${userId}/request-docs`, requestDetails);
      await fetchPendingKYC();
      setSelectedKYC(null);
      alert('Request sent to user');
    } catch (err) {
      alert('Error sending request: ' + (err.response?.data?.message || err.message));
    }
  };

  // Filter and search
  const filteredKYC = pendingKYC
    .filter(kyc => {
      if (filterRole !== 'all' && kyc.role !== filterRole) return false;
      if (searchTerm && !kyc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !kyc.email.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-park-blue"></div>
          <p className="text-slate-600">Loading KYC requests...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-sky-600">ParkBandhu operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-park-navy">Admin dashboard</h1>
          <p className="mt-2 text-slate-600">Review host eligibility and parking listings independently.</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
          <button type="button" onClick={() => setActiveTab('kyc')} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'kyc' ? 'bg-park-blue text-white shadow-sm' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'}`}>Host KYC</button>
          <button type="button" onClick={() => setActiveTab('spaces')} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === 'spaces' ? 'bg-park-blue text-white shadow-sm' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'}`}>Parking Space Verification</button>
        </div>

        {activeTab === 'spaces' ? <ParkingSpaceVerificationPanel /> : <>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Pending verifications</p>
            <p className="mt-2 text-3xl font-black text-park-blue">{filteredKYC.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Total users</p>
            <p className="mt-2 text-3xl font-black text-park-navy">{pendingKYC.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Parking owners</p>
            <p className="mt-2 text-3xl font-black text-park-navy">
              {pendingKYC.filter(k => k.role === 'host').length}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-rose-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Search by Name or Email
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Filter by Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-3"
              >
                <option value="all">All Roles</option>
                <option value="host">Parking Owner</option>
                <option value="driver">Driver</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchPendingKYC}
                className="w-full rounded-full bg-park-blue px-4 py-3 font-bold text-white transition hover:bg-sky-500"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KYC Requests Table */}
        <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-sm">
          {filteredKYC.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="mt-4 font-bold text-park-navy">No pending KYC requests</p>
              <p className="text-sm text-slate-500">All verifications are up to date!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-blue-100 bg-sky-50/70">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {filteredKYC.map((kyc) => (
                  <tr key={kyc._id} className="transition hover:bg-sky-50/50">
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-park-navy sm:px-6">{kyc.name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 sm:px-6">{kyc.email}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm sm:px-6">
                      <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-bold leading-5 text-sky-800">
                        {kyc.role === 'host' ? 'Parking Owner' : 'Driver'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 sm:px-6">
                      {kyc.kycSubmittedAt ? new Date(kyc.kycSubmittedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm sm:px-6">
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold leading-5 text-amber-800">
                        {kyc.kycStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm sm:px-6">
                      <button
                        onClick={() => setSelectedKYC(kyc)}
                        className="rounded-full bg-sky-50 px-4 py-2 font-bold text-sky-700 transition hover:bg-sky-100"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
        </>}
      </div>

      {/* KYC Verification Modal */}
      {activeTab === 'kyc' && selectedKYC && (
        <KYCVerificationModal
          kyc={selectedKYC}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestDocuments={handleRequestDocuments}
          onClose={() => setSelectedKYC(null)}
        />
      )}
    </main>
  );
};

export default AdminDashboard;
