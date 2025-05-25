import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import { useEffect } from 'react';

interface Location {
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  display_name: string;
}

interface LeafletMapProps {
  locations: Location[];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ locations }) => {
  useEffect(() => {
    // Correction pour les icônes Leaflet
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  // Vérifier si nous avons des locations valides
  if (!locations || locations.length === 0) {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Aucun point à afficher
      </div>
    );
  }

  // Calculer le centre de la carte en fonction des points
  const center = locations.length > 0
    ? [
        locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length,
        locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length
      ]
    : [46.603354, 1.888334]; // Centre de la France par défaut

  return (
    <MapContainer
      center={center as [number, number]}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map((location, index) => (
        <Marker
          key={`${location.name}-${index}`}
          position={[location.latitude, location.longitude]}
        >
          <Popup>
            <div>
              <h3>{location.name}</h3>
              <p>Ville : {location.city}</p>
              <p style={{ fontSize: '0.8em', color: '#666' }}>
                {location.display_name}
              </p>
              <p style={{ fontSize: '0.8em', color: '#2196F3', marginTop: '5px' }}>
                📍 GPS : {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}; 