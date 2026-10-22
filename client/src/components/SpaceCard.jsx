import { getApiAssetUrl } from '../api/client';

const SpaceCard = ({ space, onBook }) => {
  const [lng, lat] = space.location.coordinates || [];

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-100/60 md:flex-row">
      <img
        src={getApiAssetUrl(space.photos?.[0]) || 'https://placehold.co/400x250?text=Parking'}
        alt={space.title ? `${space.title} parking space` : space.address}
        className="h-48 w-full object-cover md:h-auto md:w-64"
      />
      <div className="min-w-0 flex-1 space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-600">Verified host listing</p>
            <h3 className="mt-1 break-words text-lg font-extrabold leading-snug text-park-navy">{space.title || space.address}</h3>
            {space.title && <p className="mt-1 break-words text-sm text-slate-500">{space.address}</p>}
          </div>
          <span className="shrink-0 rounded-full bg-sky-50 px-3 py-2 text-sm font-extrabold text-sky-700">₹{space.pricePerHour}/hr</span>
        </div>
        <p className="text-xs text-slate-500">Location pin: {lat?.toFixed(3)}, {lng?.toFixed(3)}</p>
        <div className="flex flex-wrap gap-2">
          {space.availability?.slice(0, 3).map((slot, index) => (
            <span
              key={`${slot.day}-${index}`}
              className="rounded-full border border-blue-100 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"
            >
              {slot.day}: {slot.startTime}-{slot.endTime}
            </span>
          ))}
          {space.availability?.length > 3 && (
            <span className="text-xs text-slate-500">+{space.availability.length - 3} more</span>
          )}
        </div>
        {onBook && (
          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-park-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500"
            onClick={() => onBook(space)}
          >
            Book Now
          </button>
        )}
      </div>
    </article>
  );
};

export default SpaceCard;

