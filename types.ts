
export interface ItineraryItem {
  id: string; // Unique identifier for CRUD
  stop_name: string;
  arrival_time: string;
  transport_method: string;
  transit_duration?: string; // New field for transit logic
  transit_steps?: string[]; // Detailed navigation instructions
  cost_estimate: string;
  rationale: string; // Mapped to "Intro" in UI
  duration?: string;
  type: 'visit' | 'transit' | 'start' | 'end' | 'arrival';
  category?: string; // New: LODGE, DINE, TOUR, TRANSIT
  geo_context?: string; 
  user_notes?: string; // New field for user input
  tactical_tips?: string[]; // Logistical warnings
  rating?: number; // New field (e.g. 4.5)
  opening_hours?: string; // New field
  photos?: string[]; // New field (URLs)
  dayNumber?: number; // New: To track day index for map coloring
  coordinates: {
    lat: number;
    lng: number;
  };
}

export type TransportMode = 'public' | 'car' | 'walk';
export type PaceIntensity = 'relaxed' | 'moderate' | 'power';

export interface TripConfig {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  mode: TransportMode;
  intensity: PaceIntensity;
}

export enum AppState {
  CONFIG = 'CONFIG',
  VIEWING = 'VIEWING',
  GENERATING_DAY = 'GENERATING_DAY',
  ERROR = 'ERROR'
}
