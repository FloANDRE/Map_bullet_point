import { useState } from 'react';
import { LeafletMap } from './components/LeafletMap';
import * as XLSX from 'xlsx';

interface Location {
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  display_name: string;
}

interface LoadingProgress {
  current: number;
  total: number;
  status: string;
}

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ current: 0, total: 0, status: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const geocodeCity = async (city: string): Promise<{ lat: number; lon: number; display_name: string } | null> => {
    try {
      const params = new URLSearchParams({
        q: city,
        limit: '1',
        type: 'municipality'
      });

      const response = await fetch(
        `http://localhost:7878/search/?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data && data.features && data.features.length > 0) {
        const result = data.features[0];
        const coordinates = result.geometry.coordinates;
        return {
          lat: coordinates[1],
          lon: coordinates[0],
          display_name: result.properties.label
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Le fichier Excel est vide');
      }

      const firstRow = jsonData[0] as any;
      if (!('étudiant' in firstRow || 'etudiant' in firstRow) || !('ville' in firstRow)) {
        throw new Error('Le fichier doit contenir les colonnes "étudiant" et "ville"');
      }

      setLoadingProgress({ current: 0, total: jsonData.length, status: 'Géocodage des villes...' });

      const results: Location[] = [];
      let processedCount = 0;

      for (const row of jsonData) {
        const city = (row as any)['ville'];
        const student = (row as any)['étudiant'] || (row as any)['etudiant'];

        if (city) {
          const geoResult = await geocodeCity(city);
          if (geoResult) {
            results.push({
              name: student,
              city: city,
              latitude: geoResult.lat,
              longitude: geoResult.lon,
              display_name: geoResult.display_name
            });
          }
        }

        processedCount++;
        setLoadingProgress({
          current: processedCount,
          total: jsonData.length,
          status: `Géocodage en cours... (${processedCount}/${jsonData.length})`
        });

        // Délai pour respecter les limites de l'API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (results.length === 0) {
        throw new Error('Aucune ville n\'a pu être géocodée');
      }

      setLocations(results);
      setSuccess(`${results.length} étudiants ont été placés sur la carte`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0, status: '' });
    }
  };

  const getProgressPercentage = () => {
    if (loadingProgress.total === 0) return 0;
    return Math.round((loadingProgress.current / loadingProgress.total) * 100);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
          />
          {loading && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ 
                  width: '100%', 
                  height: '20px', 
                  backgroundColor: '#e0e0e0', 
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getProgressPercentage()}%`,
                    height: '100%',
                    backgroundColor: '#4CAF50',
                    transition: 'width 0.3s ease-in-out'
                  }} />
                </div>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {getProgressPercentage()}%
                </span>
              </div>
              <div style={{ color: '#666' }}>
                {loadingProgress.status}
                {loadingProgress.total > 0 && (
                  <span style={{ marginLeft: '0.5rem' }}>
                    ({loadingProgress.current}/{loadingProgress.total})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        {error && (
          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            borderRadius: '4px',
            marginBottom: '0.5rem'
          }}>
            ❌ {error}
          </div>
        )}
        {success && (
          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: '#e8f5e9', 
            color: '#2e7d32', 
            borderRadius: '4px',
            marginBottom: '0.5rem'
          }}>
            ✅ {success}
          </div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <LeafletMap locations={locations} />
      </div>
    </div>
  );
}

export default App;
