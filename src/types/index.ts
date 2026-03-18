export interface GpxPoint {
  lat: number;
  lon: number;
  ele: number;
}

export interface GpxWaypoint extends GpxPoint {
  name: string;
}

export interface ParsedGpx {
  name: string;
  waypoints: GpxWaypoint[];
  trackPoints: GpxPoint[];
}

export interface Segment {
  startCp: string;
  endCp: string;
  distance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  equivalentFlatKm: number; // gradient-weighted equivalent flat distance
  cumulativeDistance: number; // km
  trackPoints: GpxPoint[];
}

export interface HistoricalRace {
  distance: number; // km
  elevationGain: number; // meters
  finishTime: number; // minutes
}

export interface RunnerProfile {
  marathonTime: number; // minutes
  targetTime: number | null; // minutes, null = auto
  itraPoints: number; // 0-1000
  historicalRaces?: HistoricalRace[];
}

export interface CpSplit {
  cpName: string;
  segmentDistance: number; // km
  cumulativeDistance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  equivalentFlatKm: number;
  estimatedPace: number; // min/km
  segmentTime: number; // minutes
  cumulativeTime: number; // minutes
}

export interface YearlyTemperature {
  year: number;
  high: number;
  low: number;
}

export interface WeatherSummary {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  precipProbability: number; // 0-1
  avgWindSpeed: number; // km/h
  avgHumidity: number; // %
  dominantWindDirection: number; // degrees
  yearlyTemps?: YearlyTemperature[];
}

export const DEFAULT_PROFILE: RunnerProfile = {
  marathonTime: 210, // 3:30
  targetTime: null,
  itraPoints: 500,
};
