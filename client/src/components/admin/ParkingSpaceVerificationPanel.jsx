import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import MapView from '../MapView';

const statusLabel = (status) => String(status || 'draft').replaceAll('_', ' ');

const ParkingSpaceVerificationPanel = () => {
  const [spaces, setSpaces] = useState([]);
  const [status, setStatus] = useState('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [verificationChecks, setVerificationChecks] = useState({ propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');

  const loadSpaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();
      if (submittedFrom) params.submittedFrom = submittedFrom;
      if (submittedTo) params.submittedTo = submittedTo;
      const { data } = await api.get('/api/admin/parking-spaces', { params });
      setSpaces(data.data || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setSelectedSpace((current) => current ? (data.data || []).find((space) => space._id === current._id) || null : null);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Unable to load parking listings');
    } finally {
      setLoading(false);
    }
  }, [status, search, page, submittedFrom, submittedTo]);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const openEvidence = async (file) => {
    try {
      const { data } = await api.get(file.downloadUrl, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (fileError) {
      setError(fileError.response?.data?.message || 'Unable to open this evidence file');
    }
  };

  const review = async () => {
    if (!selectedSpace) return;
    if (['rejected', 'action_required'].includes(decision) && !reason.trim()) {
      setError('Add a reason before rejecting or requesting changes.');
      return;
    }
    if (decision === 'approved' && Object.values(verificationChecks).some((value) => value !== 'approved')) {
      setError('Approve all three review checks before publishing this listing.');
      return;
    }
    if (decision === 'action_required' && !Object.values(verificationChecks).includes('action_required')) {
      setError('Mark at least one review check as requiring changes.');
      return;
    }
    const actionText = decision === 'approved' ? 'Approve and publish' : decision === 'under_review' ? 'Move this listing under review' : decision === 'rejected' ? 'Reject' : 'Request changes for';
    if (!window.confirm(`${actionText} “${selectedSpace.title || selectedSpace.address}”?`)) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/admin/parking-spaces/${selectedSpace._id}/review`, { decision, reason, verificationChecks });
      setSelectedSpace(null);
      setReason('');
      await loadSpaces();
    } catch (reviewError) {
      setError(reviewError.response?.data?.message || 'Unable to save the review decision');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-park-navy">Parking Space Verification</h2>
          <p className="mt-1 text-sm text-slate-500">Review host evidence and approve listings separately from host KYC.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Search parking listings" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); setSearch(searchInput); } }} placeholder="Search title, address, or host" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select aria-label="Filter listing status" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="pending">Pending review</option>
            <option value="under_review">Under review</option>
            <option value="action_required">Changes requested</option>
            <option value="rejected">Rejected</option>
            <option value="approved">Approved</option>
            <option value="all">All statuses</option>
          </select>
          <label className="text-xs text-slate-500">Submitted from<input aria-label="Submitted from" type="date" value={submittedFrom} onChange={(event) => { setPage(1); setSubmittedFrom(event.target.value); }} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" /></label>
          <label className="text-xs text-slate-500">Submitted to<input aria-label="Submitted to" type="date" value={submittedTo} onChange={(event) => { setPage(1); setSubmittedTo(event.target.value); }} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" /></label>
          <button type="button" onClick={() => { if (searchInput === search) loadSpaces(); else { setPage(1); setSearch(searchInput); } }} className="rounded-full bg-park-blue px-4 py-2 text-sm font-semibold text-white">Refresh</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-3">
        {loading ? <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Loading listings…</p> : spaces.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No listings match this filter.</p> : spaces.map((space) => (
            <button type="button" key={space._id} onClick={() => { setSelectedSpace(space); setDecision('approved'); setReason(''); setVerificationChecks(space.verificationChecks || { propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' }); }} className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-sky-300 ${selectedSpace?._id === space._id ? 'border-sky-400 ring-2 ring-sky-100' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-park-navy">{space.title || 'Untitled parking space'}</p>
                  <p className="mt-1 text-sm text-slate-500">{space.address}</p>
                  <p className="mt-2 text-xs text-slate-500">Host: {space.host?.name || 'Unknown'} · {space.host?.email || ''}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold capitalize text-amber-800">{statusLabel(space.verification?.status)}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">Submitted {space.submittedAt ? new Date(space.submittedAt).toLocaleString() : 'not yet submitted'} · {space.evidenceFiles?.length || 0} evidence files</p>
            </button>
          ))}
          {!loading && total > 0 && <div className="flex items-center justify-between rounded-2xl bg-white p-3 text-sm text-slate-600">
            <span>{total} listing{total === 1 ? '' : 's'} · Page {page} of {pages}</span>
            <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div>
          </div>}
        </div>

        {selectedSpace ? (
          <div className="max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-xl font-black text-park-navy">{selectedSpace.title || 'Untitled parking space'}</h3><p className="mt-1 text-sm text-slate-500">{selectedSpace.propertyType?.replaceAll('_', ' ')} · {selectedSpace.address}</p></div>
              <button type="button" onClick={() => setSelectedSpace(null)} className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <p><span className="font-semibold">Host:</span> {selectedSpace.host?.name || 'Unknown'}</p>
              <p><span className="font-semibold">Host KYC:</span> <span className="capitalize">{selectedSpace.host?.kycStatus || 'unknown'}</span></p>
              <p><span className="font-semibold">Latitude:</span> {selectedSpace.location?.coordinates?.[1]}</p>
              <p><span className="font-semibold">Longitude:</span> {selectedSpace.location?.coordinates?.[0]}</p>
              <p><span className="font-semibold">Rates:</span> {['bike', 'car', 'suv'].filter((type) => selectedSpace.capacityByVehicle?.[type] > 0).map((type) => `${type}: ₹${selectedSpace.pricingByVehicle?.[type]}/hr`).join(' · ') || `₹${selectedSpace.pricePerHour}/hr`}</p>
              <p><span className="font-semibold">Capacity:</span> {['bike', 'car', 'suv'].filter((type) => selectedSpace.capacityByVehicle?.[type] > 0).map((type) => `${type}: ${selectedSpace.capacityByVehicle[type]}`).join(' · ') || selectedSpace.capacity}</p>
            </div>
            {Array.isArray(selectedSpace.location?.coordinates) && <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-600">Submitted location preview</p>
              <MapView spaces={[selectedSpace]} center={[selectedSpace.location.coordinates[1], selectedSpace.location.coordinates[0]]} height="240px" />
              <a className="mt-2 inline-block text-sm font-semibold text-park-blue hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${selectedSpace.location.coordinates[1]},${selectedSpace.location.coordinates[0]}`} target="_blank" rel="noreferrer">Open location in Google Maps</a>
            </div>}
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedSpace.description}</p>
            <div className="mt-4 rounded-xl border border-slate-100 p-4 text-sm">
              <p><span className="font-semibold">Dimensions:</span> {selectedSpace.physicalDetails?.lengthMeters} m × {selectedSpace.physicalDetails?.widthMeters} m</p>
              <p className="mt-1"><span className="font-semibold">Entrance width:</span> {selectedSpace.physicalDetails?.entranceWidthMeters} m</p>
              <p className="mt-2"><span className="font-semibold">Authorization evidence description:</span> {selectedSpace.authorizationEvidenceDescription || 'Not provided'}</p>
            </div>
            <div className="mt-3 rounded-xl border border-slate-100 p-4">
              <h4 className="mb-2 text-sm font-bold text-park-navy">Review checklist</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ['propertyAuthorization', 'Property authorization'],
                  ['location', 'Location and address'],
                  ['physicalSpace', 'Photos and physical space'],
                ].map(([key, label]) => <label key={key} className="rounded-xl bg-slate-50 p-3 text-xs">
                  <span className="mb-1 block font-semibold text-slate-600">{label}</span>
                  <select aria-label={`${label} check`} value={verificationChecks[key] || 'pending'} disabled={!['pending', 'under_review'].includes(selectedSpace.verification?.status)} onChange={(event) => setVerificationChecks((previous) => ({ ...previous, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 capitalize text-park-navy">
                    <option value="pending">Not reviewed</option>
                    <option value="approved">Approved</option>
                    <option value="action_required">Changes required</option>
                  </select>
                </label>)}
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-park-navy">Evidence files</h4>
              <div className="mt-2 space-y-2">
                {(selectedSpace.evidenceFiles || []).map((file) => <div key={file._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span><span className="mr-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-500">{file.purpose === 'space_photo' ? 'Photo' : 'Authorization'}</span>{file.originalName}</span><button type="button" onClick={() => openEvidence(file)} className="shrink-0 font-semibold text-park-blue">View</button></div>)}
                {(selectedSpace.evidenceFiles || []).length === 0 && <p className="text-sm text-rose-600">No evidence files uploaded.</p>}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-100 p-4">
              <h4 className="font-bold text-park-navy">Review history</h4>
              {(selectedSpace.reviewHistory || []).length === 0 ? <p className="mt-2 text-sm text-slate-500">No admin review has been recorded yet.</p> : <ol className="mt-2 space-y-2">
                {selectedSpace.reviewHistory.map((entry, index) => <li key={`${entry.action}-${entry.at || index}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-semibold capitalize text-park-navy">{statusLabel(entry.action)}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.reviewer?.name || 'Host/system'}{entry.reviewer?.email ? ` · ${entry.reviewer.email}` : ''} · {entry.at ? new Date(entry.at).toLocaleString() : 'time not recorded'}</p>
                  {entry.reason && <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.reason}</p>}
                </li>)}
              </ol>}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              {['pending', 'under_review'].includes(selectedSpace.verification?.status) ? <>
                <label htmlFor="listing-review-decision" className="mb-2 block text-sm font-bold text-park-navy">Review decision</label>
                <select id="listing-review-decision" value={decision} onChange={(event) => setDecision(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  {selectedSpace.verification?.status === 'pending' && <option value="under_review">Start review</option>}
                  <option value="approved">Approve and publish</option>
                  <option value="action_required">Request changes</option>
                  <option value="rejected">Reject listing</option>
                </select>
                {['rejected', 'action_required'].includes(decision) && <textarea aria-label="Review reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} maxLength={2000} placeholder="Required: explain what needs correction or why the listing is rejected" />}
                <button type="button" disabled={saving} onClick={review} className="mt-3 w-full rounded-full bg-park-blue px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving review…' : decision === 'under_review' ? 'Start review' : decision === 'approved' ? 'Approve and publish listing' : decision === 'rejected' ? 'Reject listing' : 'Request changes'}</button>
              </> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">This listing is read-only. The host must correct and resubmit rejected or requested changes before another review.</p>}
            </div>
          </div>
        ) : <div className="hidden rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 lg:block">Select a listing to review the location, measurements, photos, and authorization evidence.</div>}
      </div>
    </section>
  );
};

export default ParkingSpaceVerificationPanel;
