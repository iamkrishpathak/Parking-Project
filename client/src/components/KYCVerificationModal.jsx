import React, { useState } from 'react';

const KYCVerificationModal = ({ kyc, onApprove, onReject, onRequestDocuments, onClose }) => {
  const [action, setAction] = useState(null); // 'approve', 'reject', 'request'
  const [reason, setReason] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [documents, setDocuments] = useState([]);

  const handleApprove = () => {
    onApprove(kyc._id, kyc.kycDocuments || []);
  };

  const handleRejectSubmit = () => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(kyc._id, reason);
  };

  const handleRequestSubmit = () => {
    if (!requestMessage.trim()) {
      alert('Please provide details about required documents');
      return;
    }
    onRequestDocuments(kyc._id, {
      message: requestMessage,
      documents: documents
    });
  };

  const calculateDaysAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center border-b">
          <div>
            <h2 className="text-2xl font-bold text-white">{kyc.name}</h2>
            <p className="text-blue-100 text-sm">{kyc.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Role</p>
              <p className="text-sm font-medium text-gray-900">{kyc.role === 'host' ? 'Parking Owner' : 'Driver'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Phone</p>
              <p className="text-sm font-medium text-gray-900">{kyc.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Submitted</p>
              <p className="text-sm font-medium text-gray-900">
                {kyc.kycSubmittedAt ? calculateDaysAgo(kyc.kycSubmittedAt) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
              <p className="text-sm font-medium text-yellow-600 capitalize">{kyc.kycStatus}</p>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Uploaded Documents</h3>
            <div className="space-y-3">
              {kyc.kycDocuments && kyc.kycDocuments.length > 0 ? (
                kyc.kycDocuments.map((doc, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 capitalize">{doc.type} Document</p>
                        <p className="text-sm text-gray-600">{doc.originalName || doc.filename}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No documents uploaded</p>
              )}
            </div>
          </div>

          {/* Action Forms */}
          {action === null && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <button
                onClick={() => setAction('approve')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Approve KYC
              </button>
              <button
                onClick={() => setAction('request')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Request Documents
              </button>
              <button
                onClick={() => setAction('reject')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Reject KYC
              </button>
            </div>
          )}

          {/* Approve Confirmation */}
          {action === 'approve' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-900 font-semibold mb-4">
                Are you sure you want to approve this KYC?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Yes, Approve
                </button>
                <button
                  onClick={() => setAction(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Request Documents */}
          {action === 'request' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Request Additional Documents</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What documents do you need?
                  </label>
                  <div className="space-y-2">
                    {['Passport', 'Driving License', 'Bank Statement', 'Property Papers', 'Other'].map((doc) => (
                      <label key={doc} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={documents.includes(doc)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocuments([...documents, doc]);
                            } else {
                              setDocuments(documents.filter(d => d !== doc));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Message
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Explain why you need these documents..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRequestSubmit}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Send Request
                  </button>
                  <button
                    onClick={() => {
                      setAction(null);
                      setRequestMessage('');
                      setDocuments([]);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reject KYC */}
          {action === 'reject' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Reject KYC Request</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you're rejecting this KYC..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRejectSubmit}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => {
                      setAction(null);
                      setReason('');
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCVerificationModal;
