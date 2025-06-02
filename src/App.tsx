import { useState } from 'react';
import { LeafletMap } from './components/LeafletMap';
import * as XLSX from 'xlsx';
import { Location } from './types';

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
  const [failedCities, setFailedCities] = useState<{student: string, city: string}[]>([]);
  const [showFailedCities, setShowFailedCities] = useState(false);

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

  const createTempExcel = (data: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const processBatch = async (
    batch: any[],
    startIndex: number,
    totalRows: number
  ): Promise<{ results: Location[]; failed: {student: string, city: string}[] }> => {
    const results: Location[] = [];
    const failed: {student: string, city: string}[] = [];

    for (const row of batch) {
      const city = row['Ville'];
      const lastName = row['Nom'];
      const firstName = row['Prénom'];
      const student = `${lastName} ${firstName}`;

      if (city) {
        console.log(`🔍 Géocodage de "${city}" pour ${student}`);
        const geoResult = await geocodeCity(city);
        if (geoResult) {
          results.push({
            name: student,
            city: city,
            latitude: geoResult.lat,
            longitude: geoResult.lon,
            display_name: geoResult.display_name
          });
          console.log(`✅ Géocodage réussi pour ${city}`);
        } else {
          failed.push({ student, city });
          console.log(`❌ Échec du géocodage pour ${city}`);
        }
      }

      setLoadingProgress({
        current: startIndex + results.length + failed.length,
        total: totalRows,
        status: `Géocodage en cours... (${startIndex + results.length + failed.length}/${totalRows})`
      });

      // Petit délai entre chaque requête pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { results, failed };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.time('Traitement total');
      console.log('🚀 Début du traitement du fichier:', file.name);
      setLoading(true);
      setError(null);
      setSuccess(null);
      setLocations([]);
      setFailedCities([]);

      console.time('Lecture du fichier');
      const data = await file.arrayBuffer();
      console.timeEnd('Lecture du fichier');
      console.log('📊 Lecture du fichier Excel terminée');

      console.time('Conversion Excel');
      const workbook = XLSX.read(data);
      console.log('📑 Workbook créé');
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      console.log('📄 Worksheet extrait');
      
      // Optimisation de la conversion en JSON
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const jsonData = [];
      
      // Lire uniquement les colonnes nécessaires
      const requiredColumns = ['Candidat - Nom', 'Candidat - Prénom', 'Coordonnées - Libellé commune'];
      const headerRow = {};
      
      // Trouver les indices des colonnes requises
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && requiredColumns.includes(cell.v)) {
          headerRow[C] = cell.v;
        }
      }
      
      // Lire les données ligne par ligne
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const row: any = {};
        let hasData = false;
        
        for (const [colIndex, headerName] of Object.entries(headerRow)) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: parseInt(colIndex) })];
          if (cell) {
            row[headerName] = cell.v;
            hasData = true;
          }
        }
        
        if (hasData) {
          jsonData.push(row);
        }
      }
      
      console.timeEnd('Conversion Excel');

      if (jsonData.length === 0) {
        throw new Error('Le fichier Excel est vide');
      }

      console.log(`📝 Nombre total de lignes à traiter: ${jsonData.length}`);
      console.log('Première ligne:', jsonData[0]);

      const firstRow = jsonData[0] as any;
      if (!('Candidat - Nom' in firstRow) || !('Candidat - Prénom' in firstRow) || !('Coordonnées - Libellé commune' in firstRow)) {
        throw new Error('Le fichier doit contenir les colonnes "Candidat - Nom", "Candidat - Prénom" et "Coordonnées - Libellé commune"');
      }

      console.log('✅ Vérification des colonnes requises terminée');

      console.time('Extraction des données');
      // Extraire les données nécessaires
      const extractedData = jsonData.map((row: any) => ({
        'Nom': row['Candidat - Nom'],
        'Prénom': row['Candidat - Prénom'],
        'Ville': row['Coordonnées - Libellé commune']
      }));
      console.timeEnd('Extraction des données');
      console.log('📋 Extraction des données terminée');

      console.time('Création Excel temporaire');
      // Créer le fichier Excel temporaire
      const tempExcel = createTempExcel(extractedData);
      console.timeEnd('Création Excel temporaire');
      console.log('📄 Création du fichier Excel temporaire terminée');
      
      console.time('Lecture Excel temporaire');
      // Lire le fichier temporaire pour le géocodage
      const tempData = await tempExcel.arrayBuffer();
      const tempWorkbook = XLSX.read(tempData);
      const tempWorksheet = tempWorkbook.Sheets[tempWorkbook.SheetNames[0]];
      const tempJsonData = XLSX.utils.sheet_to_json(tempWorksheet);
      console.timeEnd('Lecture Excel temporaire');

      setLoadingProgress({ current: 0, total: tempJsonData.length, status: 'Géocodage des villes...' });

      const BATCH_SIZE = 10; // Traiter 10 lignes à la fois
      const allResults: Location[] = [];
      const allFailed: {student: string, city: string}[] = [];

      console.log('🌍 Début du géocodage par lots de', BATCH_SIZE, 'lignes');

      // Traiter les données par lots
      for (let i = 0; i < tempJsonData.length; i += BATCH_SIZE) {
        console.log(`\n📦 Traitement du lot ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(tempJsonData.length/BATCH_SIZE)}`);
        const batch = tempJsonData.slice(i, i + BATCH_SIZE);
        const { results, failed } = await processBatch(batch, i, tempJsonData.length);
        
        console.log(`✅ Lot traité: ${results.length} succès, ${failed.length} échecs`);
        
        allResults.push(...results);
        allFailed.push(...failed);

        // Mettre à jour l'état avec les nouveaux résultats
        setLocations(prevLocations => [...prevLocations, ...results]);
        setFailedCities(prevFailed => [...prevFailed, ...failed]);

        // Délai entre les lots pour permettre à l'interface de rester réactive
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('\n📊 Résumé final:');
      console.log(`- Total des villes géocodées: ${allResults.length}`);
      console.log(`- Total des échecs: ${allFailed.length}`);

      if (allResults.length === 0) {
        throw new Error('Aucune ville n\'a pu être géocodée');
      }

      if (allFailed.length > 0) {
        setShowFailedCities(true);
      }
      setSuccess(`${allResults.length} étudiants ont été placés sur la carte${allFailed.length > 0 ? ` (${allFailed.length} villes non trouvées)` : ''}`);
      console.log('✨ Traitement terminé avec succès');
      console.timeEnd('Traitement total');
    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
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

      {showFailedCities && failedCities.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxWidth: '80%',
          maxHeight: '80vh',
          overflow: 'auto',
          color: 'black'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#c62828' }}>Villes non trouvées</h2>
            <button
              onClick={() => setShowFailedCities(false)}
              style={{
                border: 'none',
                background: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ marginBottom: '1rem', color: 'black' }}>
            <p>Les villes suivantes n'ont pas pu être géocodées :</p>
          </div>
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'black' }}>Étudiant</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: 'black' }}>Ville</th>
                </tr>
              </thead>
              <tbody>
                {failedCities.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem', color: 'black' }}>{item.student}</td>
                    <td style={{ padding: '0.5rem', color: 'black' }}>{item.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <LeafletMap locations={locations} />
      </div>
    </div>
  );
}

export default App;
