import { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = (process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '').trim();
const GOOGLE_MAP_ID = (process.env.REACT_APP_GOOGLE_MAP_ID || 'DEMO_MAP_ID').trim();
const GOOGLE_MAPS_CALLBACK = '__parkBandhuGoogleMapsReady';

let googleMapsPromise;

const loadGoogleMaps = (apiKey) => {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google.maps);
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
        callback: GOOGLE_MAPS_CALLBACK,
      });

      window[GOOGLE_MAPS_CALLBACK] = () => {
        delete window[GOOGLE_MAPS_CALLBACK];
        resolve(window.google.maps);
      };

      script.src = 'https://maps.googleapis.com/maps/api/js?' + params.toString();
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[GOOGLE_MAPS_CALLBACK];
        googleMapsPromise = null;
        script.remove();
        reject(new Error('Google Maps could not load. Check the API key, billing, and website restrictions.'));
      };
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
};

const getCoordinates = (space) => {
  const coordinates = space?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
};

const MapView = ({ spaces = [], center = [28.6139, 77.209], height = '420px' }) => {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markerLibraryRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  const latitude = Number(center?.[0]);
  const longitude = Number(center?.[1]);
  const safeCenter = {
    lat: Number.isFinite(latitude) ? latitude : 28.6139,
    lng: Number.isFinite(longitude) ? longitude : 77.209,
  };

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapElementRef.current) return undefined;

    let cancelled = false;

    const initializeMap = async () => {
      try {
        const maps = await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        const mapsLibrary = await maps.importLibrary('maps');
        const markerLibrary = await maps.importLibrary('marker');
        if (cancelled || !mapElementRef.current) return;

        const map = new mapsLibrary.Map(mapElementRef.current, {
          center: safeCenter,
          zoom: 13,
          mapId: GOOGLE_MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        });

        mapRef.current = map;
        infoWindowRef.current = new mapsLibrary.InfoWindow();
        markerLibraryRef.current = markerLibrary;
        setMapError('');
        setMapReady(true);
      } catch (error) {
        if (!cancelled) {
          setMapError(error.message || 'Google Maps could not be initialized.');
        }
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker, onClick }) => {
        marker.removeEventListener('gmp-click', onClick);
        marker.map = null;
      });
      markersRef.current = [];
      mapRef.current = null;
      infoWindowRef.current = null;
      markerLibraryRef.current = null;
    };
    // Map options and initial center are applied here; later center updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter({
      lat: Number.isFinite(latitude) ? latitude : 28.6139,
      lng: Number.isFinite(longitude) ? longitude : 77.209,
    });
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const markerLibrary = markerLibraryRef.current;
    if (!map || !markerLibrary || !window.google?.maps) return undefined;

    markersRef.current.forEach(({ marker, onClick }) => {
      marker.removeEventListener('gmp-click', onClick);
      marker.map = null;
    });
    markersRef.current = [];

    const validSpaces = spaces
      .map((space) => ({ space, position: getCoordinates(space) }))
      .filter((item) => item.position);

    const bounds = new window.google.maps.LatLngBounds();

    validSpaces.forEach(({ space, position }) => {
      const title = space.address || 'Available parking';
      const markerContent = document.createElement('div');
      markerContent.setAttribute('role', 'img');
      markerContent.setAttribute('aria-label', title);
      markerContent.style.cssText = 'display:block;width:42px;height:54px;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(15,23,42,.3));';
      markerContent.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="42" height="54" viewBox="0 0 42 54" fill="none" aria-hidden="true">' +
        '<path d="M21 51C16.3 44.4 4 32.5 4 20C4 10.6 11.6 3 21 3C30.4 3 38 10.6 38 20C38 32.5 25.7 44.4 21 51Z" fill="#38BDF8" stroke="white" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="21" cy="20" r="11" fill="white"/>' +
        '<text x="21" y="20.5" text-anchor="middle" dominant-baseline="central" fill="#075985" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="800">P</text>' +
        '</svg>';

      const marker = new markerLibrary.AdvancedMarkerElement({
        map,
        position,
        title,
        content: markerContent,
        anchorLeft: '-50%',
        anchorTop: '-100%',
        gmpClickable: true,
      });

      const onClick = () => {
        const content = document.createElement('div');
        content.style.cssText = 'min-width:160px;padding:2px 4px;color:#0f172a;';
        const address = document.createElement('strong');
        address.textContent = title;
        const price = document.createElement('p');
        price.textContent = '₹' + Number(space.pricePerHour || 0).toLocaleString('en-IN') + '/hr';
        price.style.cssText = 'margin:4px 0 0;color:#475569;';
        content.append(address, price);

        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open({ map, anchor: marker });
      };

      marker.addEventListener('gmp-click', onClick);
      markersRef.current.push({ marker, onClick });
      bounds.extend(position);
    });

    if (validSpaces.length > 1) {
      map.fitBounds(bounds, 48);
    } else if (validSpaces.length === 1) {
      map.setCenter(validSpaces[0].position);
      map.setZoom(15);
    }

    return () => {
      markersRef.current.forEach(({ marker, onClick }) => {
        marker.removeEventListener('gmp-click', onClick);
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [spaces, mapReady]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className="flex items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50 px-6 text-center"
        style={{ height }}
        role="status"
      >
        <div className="max-w-md">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-park-blue" aria-hidden="true" />
          <h3 className="font-semibold text-park-navy">Google Maps setup needed</h3>
          <p className="mt-2 text-sm text-slate-600">
            Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>client/.env</code>, enable the Maps
            JavaScript API, then restart the client.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
      <div
        ref={mapElementRef}
        className="w-full"
        style={{ height }}
        aria-label="Map showing available parking spaces"
      />
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 text-sm text-slate-600">
          Loading Google Maps…
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 px-6 text-center" role="alert">
          <div className="max-w-md">
            <AlertCircle className="mx-auto mb-3 h-7 w-7 text-rose-500" aria-hidden="true" />
            <p className="font-semibold text-park-navy">Google Maps could not load</p>
            <p className="mt-2 text-sm text-slate-600">{mapError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
