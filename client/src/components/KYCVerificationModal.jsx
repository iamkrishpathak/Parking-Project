import React, { useState } from 'react';
import api from '../api/client';

const KYCVerificationModal = ({ kyc, onApprove, onReject, onRequestDocuments, onClose }) => {
  const [action, setAction] = useState(null); // 'approve', 'reject', 'request'
  const [reason, setReason] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [documents, setDocuments] = useState([]);

  const openDocument = async (url) => {
    try {
      if (!url?.startsWith('/api/')) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      const { data } = await api.get(url, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to open this verification document');
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-blue-100 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-white sm:text-2xl">{kyc.name}</h2>
            <p className="break-all text-sm text-blue-100">{kyc.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white transition hover:bg-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          {/* User Info */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-sky-50/60 p-4 min-[420px]:grid-cols-2 md:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Role</p>
              <p className="text-sm font-bold text-park-navy">{kyc.role === 'host' ? 'Parking Owner' : 'Driver'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Phone</p>
              <p className="text-sm font-bold text-park-navy">{kyc.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Submitted</p>
              <p className="text-sm font-bold text-park-navy">
                {kyc.kycSubmittedAt ? calculateDaysAgo(kyc.kycSubmittedAt) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Status</p>
              <p className="text-sm font-bold capitalize text-amber-700">{kyc.kycStatus}</p>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="mb-4 text-lg font-black text-park-navy">Uploaded documents</h3>
            <div className="space-y-3">
              {kyc.kycDocuments && kyc.kycDocuments.length > 0 ? (
                kyc.kycDocuments.map((doc, idx) => (
                  <div key={idx} className="rounded-2xl border border-blue-100 p-4 transition hover:bg-sky-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold capitalize text-park-navy">{doc.type} document</p>
                        <p className="text-sm text-slate-600">{doc.originalName || doc.filename}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDocument(doc.url)}
                        className="rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">No documents uploaded</p>
              )}
            </div>
          </div>

          {/* Action Forms */}
          {action === null && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-sky-50/70 p-4 md:grid-cols-3">
              <button
                onClick={() => setAction('approve')}
                className="rounded-full bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700"
              >
                Approve KYC
              </button>
              <button
                onClick={() => setAction('request')}
                className="rounded-full bg-amber-600 px-4 py-3 font-bold text-white transition hover:bg-amber-700"
              >
                Request Documents
              </button>
              <button
                onClick={() => setAction('reject')}
                className="rounded-full bg-rose-600 px-4 py-3 font-bold text-white transition hover:bg-rose-700"
              >
                Reject KYC
              </button>
            </div>
          )}

          {/* Approve Confirmation */}
          {action === 'approve' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-4 font-bold text-emerald-900">
                Are you sure you want to approve this KYC?
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleApprove}
                  className="flex-1 rounded-full bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700"
                >
                  Yes, Approve
                </button>
                <button
                  onClick={() => setAction(null)}
                  className="flex-1 rounded-full border border-blue-100 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-sky-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Request Documents */}
          {action === 'request' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-3 font-bold text-park-navy">Request additional documents</h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
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
                        <span className="ml-2 text-sm text-slate-700">{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Additional Message
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Explain why you need these documents..."
                    className="w-full px-4 py-3"
                    rows="3"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleRequestSubmit}
                    className="flex-1 rounded-full bg-amber-600 px-4 py-3 font-bold text-white transition hover:bg-amber-700"
                  >
                    Send Request
                  </button>
                  <button
                    onClick={() => {
                      setAction(null);
                      setRequestMessage('');
                      setDocuments([]);
                    }}
                    className="flex-1 rounded-full border border-blue-100 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-sky-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reject KYC */}
          {action === 'reject' && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <h4 className="mb-3 font-bold text-park-navy">Reject KYC request</h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Reason for Rejection
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you're rejecting this KYC..."
                    className="w-full px-4 py-3"
                    rows="3"
                  />
                </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleRejectSubmit}
                    className="flex-1 rounded-full bg-rose-600 px-4 py-3 font-bold text-white transition hover:bg-rose-700"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => {
                      setAction(null);
                      setReason('');
                    }}
                    className="flex-1 rounded-full border border-blue-100 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-sky-50"
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
