const SpaceCard = ({ space, onBook }) => {
  const [lng, lat] = space.location.coordinates || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
      <img
        src={space.photos?.[0] || 'https://placehold.co/400x250?text=Parking'}
        alt={space.address}
        className="w-full md:w-64 h-48 object-cover"
      />
      <div className="flex-1 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-park-navy">{space.address}</h3>
          <span className="text-sm font-semibold text-park-blue">₹{space.pricePerHour}/hr</span>
        </div>
        <p className="text-sm text-slate-500">
          Lat: {lat?.toFixed(3)} | Lng: {lng?.toFixed(3)}
        </p>
        <div className="flex flex-wrap gap-2">
          {space.availability?.slice(0, 3).map((slot, index) => (
            <span
              key={`${slot.day}-${index}`}
              className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"
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
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-full bg-park-blue text-white font-semibold hover:bg-indigo-600 transition"
            onClick={() => onBook(space)}
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
};

export default SpaceCard;

