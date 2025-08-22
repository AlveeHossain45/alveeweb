import { apiService } from './apiService.js';
export const store = {
    _data: {},
    _maps: {},

async initialize() {
    // We only fetch the bare minimum required for the header and navigation.
    // All other large datasets will be fetched by the pages themselves.
    const collections = ['users', 'departments', 'sections', 'subjects'];
    const promises = collections.map(key => apiService.get(key));

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
        const key = collections[index];
        if (result.status === 'fulfilled') {
            this._data[key] = result.value;
        } else {
            console.error(`Failed to fetch essential collection '${key}':`, result.reason);
            this._data[key] = []; // Default to empty array to prevent crashes
        }
    });

    this.buildMaps(); // Build maps only for this essential initial data
    },

    get(collection, subCollection = null) {
        if (subCollection) {
            return this._data[collection]?.[subCollection] ?? [];
        }
        return this._data[collection] ?? [];
    },

    getMap(mapName) {
        return this._maps[mapName] || new Map();
    },

    buildMaps() {
        this._maps.students = new Map(this.get('students').map(s => [s.id, s]));
        this._maps.teachers = new Map(this.get('teachers').map(t => [t.id, t]));
        this._maps.sections = new Map(this.get('sections').map(s => [s.id, s])); // NEW
        this._maps.subjects = new Map(this.get('subjects').map(s => [s.id, s]));
        this._maps.departments = new Map(this.get('departments').map(d => [d.id, d]));
        this._maps.books = new Map(this.get('library', 'books').map(b => [b.bookId, b]));
        this._maps.members = new Map([...this._maps.students, ...this._maps.teachers]);
    },

    async refresh(collection, subCollection = null) {
        if (subCollection) {
            this._data[collection] = this._data[collection] || {};
            this._data[collection][subCollection] = await apiService.get(collection, subCollection);
        } else {
            this._data[collection] = await apiService.get(collection);
        }
        this.buildMaps();
    }
};