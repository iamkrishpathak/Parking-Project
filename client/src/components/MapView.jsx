import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapView = ({ spaces = [], center = [28.6139, 77.209], height = '400px' }) => (
  <div className="rounded-xl overflow-hidden border border-slate-200">
    <MapContainer center={center} zoom={13} style={{ height, width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {spaces.map((space) => {
        const [lng, lat] = space.location.coordinates;
        return (
          <Marker key={space._id} position={[lat, lng]}>
            <Popup>
              <p className="font-semibold">{space.address}</p>
              <p className="text-sm text-slate-500">₹{space.pricePerHour}/hr</p>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  </div>
);

export default MapView;

