import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../types';

interface LeafletMapProps {
  locations: Location[];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ locations }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([46.603354, 1.888334], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    // Compter les occurrences de chaque ville
    const cityCounts = locations.reduce((acc, location) => {
      const key = `${location.latitude},${location.longitude}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Créer les marqueurs avec des couleurs différentes selon le nombre d'occurrences
    locations.forEach(location => {
      const key = `${location.latitude},${location.longitude}`;
      const count = cityCounts[key];
      
      let color = '#3388ff'; // Bleu par défaut (1-5)
      if (count > 10) {
        color = '#ff0000'; // Rouge (>10)
      } else if (count > 5) {
        color = '#ffa500'; // Orange (6-10)
      }

      const marker = L.circleMarker([location.latitude, location.longitude], {
        radius: 12,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });

      // Ajouter le texte avec le nombre d'occurrences
      const text = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          background-color: ${color};
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        ">${count}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const textMarker = L.marker([location.latitude, location.longitude], {
        icon: text,
        zIndexOffset: 1000
      });

      const popupContent = `
        <div>
          <strong>${location.name}</strong><br/>
          ${location.display_name}<br/>
          Nombre d'étudiants: ${count}
        </div>
      `;

      marker.bindPopup(popupContent);
      textMarker.bindPopup(popupContent);
      
      if (markersRef.current) {
        markersRef.current.addLayer(marker);
        markersRef.current.addLayer(textMarker);
      }
    });

  }, [locations]);

  return <div id="map" style={{ height: '100%', width: '100%' }} />;
}; 