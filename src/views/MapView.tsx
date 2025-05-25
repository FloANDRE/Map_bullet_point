import React from 'react';
import { MapController } from '../controllers/MapController';
import { LeafletMap } from '../components/LeafletMap';

interface MapViewProps {
    controller: MapController;
}

export const MapView: React.FC<MapViewProps> = ({ controller }) => {
    const [locations, setLocations] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchLocations = async () => {
            const data = await controller.getLocations();
            setLocations(data);
        };
        fetchLocations();
    }, [controller]);

    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <LeafletMap locations={locations} />
        </div>
    );
}; 