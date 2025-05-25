import { MapModel } from '../models/MapModel';

export class MapController {
    private model: MapModel;

    constructor() {
        this.model = new MapModel();
    }

    public initializeMap(): void {
        // Logique d'initialisation de la carte
    }

    public addLocation(location: any): void {
        this.model.addLocation(location);
    }

    public async getLocations(): Promise<any[]> {
        return this.model.getLocations();
    }

    public updateLocation(id: number, newData: Partial<any>): void {
        const locations = this.model.getData();
        const index = locations.findIndex(loc => loc.id === id);
        if (index !== -1) {
            locations[index] = { ...locations[index], ...newData };
            this.model.setData(locations);
        }
    }

    public getMapboxToken(): string {
        return this.model.getMapboxToken();
    }

    public async loadDataFromExcel(file: File): Promise<void> {
        await this.model.loadDataFromExcel(file);
    }
} 