import React, { useState, useEffect } from 'react';
import axios from '../api/client';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [pendingKycs, setPendingKycs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPendingKycs();
  }, []);

  const fetchPendingKycs = async () => {
    try {
      const { data } = await axios.get('/api/auth/admin/pending-kyc');
      setPendingKycs(data);
    } catch (error) {
      console.error('Error fetching pending KYCs:', error);
      setMessage('Failed to fetch pending KYC applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (kycId) => {
    try {
      await axios.put(`/api/auth/admin/kyc/${kycId}/status`, { 
        status: 'verified',
        reviewed_by: user._id 
      });
      setMessage('KYC approved successfully');
      fetchPendingKycs();
    } catch (error) {
      console.error('Error approving KYC:', error);
      setMessage('Failed to approve KYC');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMessage('Please provide a reason for rejection');
      return;
    }

    try {
      await axios.put(`/api/auth/admin/kyc/${selectedKyc._id}/status`, { 
        status: 'rejected',
        rejection_reason: rejectReason,
        reviewed_by: user._id 
      });
      setMessage('KYC rejected successfully');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedKyc(null);
      fetchPendingKycs();
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      setMessage('Failed to reject KYC');
    }
  };

  const openRejectModal = (kyc) => {
    setSelectedKyc(kyc);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedKyc(null);
  };

  const getDocumentUrl = (doc) => {
    return `http://localhost:5000${doc.document_url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KYC applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Review and verify KYC applications</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending KYC Applications ({pendingKycs.length})
            </h2>
          </div>

          {pendingKycs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending applications</h3>
              <p className="text-gray-600">All KYC applications have been reviewed.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingKycs.map((kycGroup) => (
                <div key={kycGroup.provider_id._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {kycGroup.provider_id.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {kycGroup.provider_id.name}
                          </h3>
                          <p className="text-sm text-gray-600">{kycGroup.provider_id.email}</p>
                          <p className="text-sm text-gray-600">{kycGroup.provider_id.phone}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {kycGroup.documents.map((doc) => (
                          <div key={doc._id} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">
                              {doc.document_type === 'aadhaar' ? 'Identity Proof (Aadhaar)' : 'Address Proof (Electricity Bill)'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">{doc.original_filename}</p>
                            
                            {doc.document_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                              <img
                                src={getDocumentUrl(doc)}
                                alt={doc.document_type}
                                className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-90"
                                onClick={() => window.open(getDocumentUrl(doc), '_blank')}
                              />
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <p className="text-sm text-gray-600 mt-2">PDF Document</p>
                                <button
                                  onClick={() => window.open(getDocumentUrl(doc), '_blank')}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  View Document
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col space-y-2">
                      <button
                        onClick={() => handleApprove(kycGroup.documents[0]._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(kycGroup.documents[0])}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject KYC Application</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this KYC application.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={closeRejectModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
