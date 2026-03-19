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
  marathonTime?: number; // minutes, optional (for reference)
  targetTime: number | null; // minutes, null = auto
  itraPoints: number; // 200-900, primary predictor
  historicalRaces?: HistoricalRace[];
  bodyWeightKg?: number; // optional, default ~70kg
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

export interface Climb {
  startDist: number; // km
  endDist: number; // km
  startEle: number; // meters
  peakEle: number; // meters
  gain: number; // meters
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

export interface NutritionTargets {
  caloriesPerHour: number; // kcal/hr
  fluidPerHour: number; // ml/hr
  sodiumPerHour: number; // mg/hr
}

export interface CpNutrition {
  cpName: string;
  segmentTime: number; // minutes
  cumulativeTime: number; // minutes
  targets: NutritionTargets;
  segmentCalories: number; // kcal
  segmentFluid: number; // ml
  segmentSodium: number; // mg
  cumulativeCalories: number; // kcal
  cumulativeFluid: number; // ml
  cumulativeSodium: number; // mg
}

export const DEFAULT_PROFILE: RunnerProfile = {
  targetTime: null,
  itraPoints: 500,
};
