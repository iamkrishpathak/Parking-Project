import React, { useState, useEffect } from 'react';
import api from '../api/client';
import KYCVerificationModal from '../components/KYCVerificationModal';

const AdminDashboard = () => {
  const [pendingKYC, setPendingKYC] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KYC requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage KYC verifications and user requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Pending Verifications</p>
            <p className="text-3xl font-bold text-blue-600">{filteredKYC.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-green-600">{pendingKYC.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Parking Owners</p>
            <p className="text-3xl font-bold text-purple-600">
              {pendingKYC.filter(k => k.role === 'host').length}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name or Email
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="host">Parking Owner</option>
                <option value="driver">Driver</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchPendingKYC}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KYC Requests Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredKYC.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="mt-4 text-gray-600 font-medium">No pending KYC requests</p>
              <p className="text-gray-500 text-sm">All verifications are up to date!</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredKYC.map((kyc) => (
                  <tr key={kyc._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kyc.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{kyc.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {kyc.role === 'host' ? 'Parking Owner' : 'Driver'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {kyc.kycSubmittedAt ? new Date(kyc.kycSubmittedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {kyc.kycStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedKYC(kyc)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* KYC Verification Modal */}
      {selectedKYC && (
        <KYCVerificationModal
          kyc={selectedKYC}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestDocuments={handleRequestDocuments}
          onClose={() => setSelectedKYC(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
