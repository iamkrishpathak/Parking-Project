import React, { useState } from 'react';
import api from '../api/client';

const HostKYC = () => {
  const [identityProof, setIdentityProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [identityPreview, setIdentityPreview] = useState(null);
  const [addressPreview, setAddressPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [approvalDeadline, setApprovalDeadline] = useState(null);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'identity') {
        setIdentityProof(file);
        setIdentityPreview(URL.createObjectURL(file));
      } else {
        setAddressProof(file);
        setAddressPreview(URL.createObjectURL(file));
      }
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!identityProof || !addressProof) {
      setError('Please upload both documents');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('identityProof', identityProof);
      formData.append('addressProof', addressProof);

      // Get token from localStorage
      const token = localStorage.getItem('parksetu_token');
      
      if (!token) {
        setError('Session expired. Please login again.');
        setIsSubmitting(false);
        return;
      }

      const response = await api.post('/api/auth/kyc-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.data.success || response.status === 200) {
        // Set deadline to 24 hours from now
        const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setApprovalDeadline(deadline);
        setShowSuccess(true);
        setIdentityProof(null);
        setAddressProof(null);
        setIdentityPreview(null);
        setAddressPreview(null);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Upload failed. Please try again.';
      setError(errorMsg);
      console.error('KYC upload error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (type) => {
    if (type === 'identity') {
      setIdentityProof(null);
      setIdentityPreview(null);
    } else {
      setAddressProof(null);
      setAddressPreview(null);
    }
  };

  if (showSuccess) {
    const formatTime = (date) => {
      return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="my-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-2xl animate-in fade-in duration-300 sm:rounded-[2rem] sm:p-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-black text-park-navy">Documents uploaded!</h2>
          <div className="mb-6 rounded-2xl border border-blue-100 bg-sky-50/70 p-4">
            <p className="mb-2 font-bold text-sky-900">Status: Pending admin verification</p>
            <p className="mb-3 text-sm text-sky-700">
              Your KYC documents have been successfully uploaded and are pending approval from our admin.
            </p>
            <div className="rounded-xl border border-blue-100 bg-white p-3">
              <p className="mb-1 text-xs font-semibold text-slate-500">Expected decision by</p>
              <p className="font-mono text-sm font-bold text-park-navy">{approvalDeadline ? formatTime(approvalDeadline) : 'Within 24 hours'}</p>
            </div>
          </div>
          
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Note:</span> You'll receive an email notification once your documents are verified. The admin may request additional documents if needed.
            </p>
          </div>

          <button
            onClick={() => setShowSuccess(false)}
            className="w-full rounded-full bg-park-blue px-4 py-3 font-bold text-white shadow-sm transition hover:bg-sky-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-10 sm:px-6 lg:py-14">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/50 sm:p-8">
          <p className="text-center text-xs font-extrabold uppercase tracking-[.2em] text-sky-600">Host account</p>
          <h1 className="mb-2 mt-2 text-center text-3xl font-black tracking-tight text-park-navy">KYC verification</h1>
          <p className="mb-8 text-center text-slate-600">
            Please upload the required documents to complete your verification
          </p>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identity Proof */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Identity Proof (Aadhaar) *
              </label>
              <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-sky-50/40 px-4 pb-6 pt-5 transition-colors hover:border-sky-400 sm:px-6">
                <div className="space-y-1 text-center">
                  {identityPreview ? (
                    <div className="relative">
                      <img
                        src={identityPreview}
                        alt="Identity proof preview"
                        className="mx-auto h-32 w-auto object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('identity')}
                        className="absolute right-0 top-0 rounded-full bg-rose-500 p-1 text-white transition hover:bg-rose-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <p className="text-sm text-gray-600 mt-2">{identityProof.name}</p>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-sky-500"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-slate-600">
                        <label
                          htmlFor="identity-proof"
                          className="relative cursor-pointer rounded-lg bg-white font-bold text-sky-700 hover:text-sky-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="identity-proof"
                            name="identity-proof"
                            type="file"
                            className="sr-only"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange(e, 'identity')}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, GIF, PDF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Address Proof */}
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Address Proof (Electricity Bill) *
              </label>
              <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-sky-50/40 px-4 pb-6 pt-5 transition-colors hover:border-sky-400 sm:px-6">
                <div className="space-y-1 text-center">
                  {addressPreview ? (
                    <div className="relative">
                      <img
                        src={addressPreview}
                        alt="Address proof preview"
                        className="mx-auto h-32 w-auto object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('address')}
                        className="absolute right-0 top-0 rounded-full bg-rose-500 p-1 text-white transition hover:bg-rose-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      <p className="text-sm text-gray-600 mt-2">{addressProof.name}</p>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-sky-500"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-slate-600">
                        <label
                          htmlFor="address-proof"
                          className="relative cursor-pointer rounded-lg bg-white font-bold text-sky-700 hover:text-sky-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="address-proof"
                            name="address-proof"
                            type="file"
                            className="sr-only"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange(e, 'address')}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, GIF, PDF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !identityProof || !addressProof}
                className="w-full rounded-full bg-park-blue px-4 py-3 font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Uploading...' : 'Submit Documents'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default HostKYC;
