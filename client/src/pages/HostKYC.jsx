import React, { useState } from 'react';
import axios from 'axios';

const HostKYC = () => {
  const [identityProof, setIdentityProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [identityPreview, setIdentityPreview] = useState(null);
  const [addressPreview, setAddressPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

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

      const response = await axios.post('/api/auth/kyc-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setShowSuccess(true);
        setIdentityProof(null);
        setAddressProof(null);
        setIdentityPreview(null);
        setAddressPreview(null);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your KYC documents have been successfully uploaded and are pending approval. You will be notified once the verification is complete.
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Upload Another Document
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">KYC Verification</h1>
          <p className="text-gray-600 text-center mb-8">
            Please upload the required documents to complete your verification
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identity Proof */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identity Proof (Aadhaar) *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
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
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                        className="mx-auto h-12 w-12 text-gray-400"
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
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="identity-proof"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
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
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, PDF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Address Proof */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Proof (Electricity Bill) *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
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
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                        className="mx-auto h-12 w-12 text-gray-400"
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
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="address-proof"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
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
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, PDF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !identityProof || !addressProof}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 font-medium"
              >
                {isSubmitting ? 'Uploading...' : 'Submit Documents'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostKYC;