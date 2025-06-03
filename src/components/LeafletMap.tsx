import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../types';

interface LeafletMapProps {
  locations: Location[];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ locations }) => {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedHighSchool, setSelectedHighSchool] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Obtenir la liste unique des lycées
  const uniqueHighSchools = Array.from(new Set(locations.map(loc => loc.highSchool))).sort();

  // Filtrer les lycées en fonction de la recherche
  const filteredHighSchools = uniqueHighSchools.filter(school => 
    school.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    // Regrouper les étudiants par ville
    const studentsByCity = locations.reduce((acc, location) => {
      const key = `${location.latitude},${location.longitude}`;
      if (!acc[key]) {
        acc[key] = {
          students: [],
          display_name: location.display_name
        };
      }
      acc[key].students.push({
        name: location.name,
        highSchool: location.highSchool
      });
      return acc;
    }, {} as Record<string, { students: { name: string, highSchool: string }[], display_name: string }>);

    // Créer les marqueurs avec des couleurs différentes selon le nombre d'occurrences
    locations.forEach(location => {
      const key = `${location.latitude},${location.longitude}`;
      const count = cityCounts[key];
      const cityData = studentsByCity[key];
      
      // Filtrer les étudiants si un lycée est sélectionné
      const filteredStudents = selectedHighSchool
        ? cityData.students.filter(student => student.highSchool === selectedHighSchool)
        : cityData.students;

      if (filteredStudents.length === 0) return;

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
        ">${filteredStudents.length}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const textMarker = L.marker([location.latitude, location.longitude], {
        icon: text,
        zIndexOffset: 1000
      });

      const popupContent = `
        <div>
          <strong>Ville : ${cityData.display_name}</strong><br/>
          <strong>Nombre d'étudiants : ${filteredStudents.length}</strong><br/>
          <br/>
          <strong>Liste des étudiants :</strong><br/>
          ${filteredStudents.map(student => `
            • ${student.name}<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;${student.highSchool === 'déscolarisé' ? 'Déscolarisé' : `Lycée : ${student.highSchool}`}
          `).join('<br/>')}
        </div>
      `;

      marker.bindPopup(popupContent);
      textMarker.bindPopup(popupContent);
      
      if (markersRef.current) {
        markersRef.current.addLayer(marker);
        markersRef.current.addLayer(textMarker);
      }
    });

  }, [locations, selectedHighSchool]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div id="map" style={{ height: '100%', width: '100%' }} />
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Rechercher un lycée..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            style={{
              padding: '8px 16px',
              width: '200px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              color: '#000',
              backgroundColor: 'white'
            }}
          />
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 1001
            }}>
              <div
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  backgroundColor: selectedHighSchool === '' ? '#f0f0f0' : 'white',
                  color: '#000'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = selectedHighSchool === '' ? '#f0f0f0' : 'white'}
                onClick={() => {
                  setSelectedHighSchool('');
                  setShowDropdown(false);
                }}
              >
                Tous les lycées
              </div>
              {filteredHighSchools.map((school) => (
                <div
                  key={school}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    backgroundColor: selectedHighSchool === school ? '#f0f0f0' : 'white',
                    color: '#000'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = selectedHighSchool === school ? '#f0f0f0' : 'white'}
                  onClick={() => {
                    setSelectedHighSchool(school);
                    setShowDropdown(false);
                  }}
                >
                  {school}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 