import * as XLSX from 'xlsx';

export interface MapData {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
}

export class MapModel {
    private locations: MapData[] = [];

    public async loadDataFromExcel(file: File): Promise<void> {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        this.locations = jsonData.map((row: any, index: number) => ({
            id: index + 1,
            name: row.name || '',
            latitude: parseFloat(row.latitude) || 0,
            longitude: parseFloat(row.longitude) || 0
        }));
    }

    public getLocations(): MapData[] {
        return this.locations;
    }

    public addLocation(location: MapData): void {
        this.locations.push(location);
    }

    public updateLocation(id: number, newData: Partial<MapData>): void {
        const index = this.locations.findIndex(loc => loc.id === id);
        if (index !== -1) {
            this.locations[index] = { ...this.locations[index], ...newData };
        }
    }
} 