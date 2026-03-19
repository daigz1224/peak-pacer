import type { CpSplit, WeatherSummary, CpNutrition, NutritionTargets } from '../types';

const DEFAULT_TEMP = 18;
const DEFAULT_HUMIDITY = 50;
const DEFAULT_WEIGHT = 70;

/**
 * Compute per-segment nutrition/hydration targets.
 * Based on ACSM guidelines for ultra-endurance activities.
 */
export function computeNutritionPlan(
  splits: CpSplit[],
  weather: WeatherSummary | null,
  bodyWeightKg?: number,
): CpNutrition[] {
  const temp = weather?.avgTemp ?? DEFAULT_TEMP;
  const humidity = weather?.avgHumidity ?? DEFAULT_HUMIDITY;
  const weight = bodyWeightKg ?? DEFAULT_WEIGHT;
  const weightFactor = weight / DEFAULT_WEIGHT;

  let cumCal = 0;
  let cumFluid = 0;
  let cumSodium = 0;

  return splits.map((split) => {
    const hours = split.segmentTime / 60;

    // Effort ratio: equivalentFlatKm / actual distance (higher = harder terrain)
    const effortRatio = split.segmentDistance > 0
      ? split.equivalentFlatKm / split.segmentDistance
      : 1;

    const targets = computeTargets(effortRatio, temp, humidity, weightFactor);

    const segCal = Math.round(targets.caloriesPerHour * hours);
    const segFluid = Math.round(targets.fluidPerHour * hours);
    const segSodium = Math.round(targets.sodiumPerHour * hours);

    cumCal += segCal;
    cumFluid += segFluid;
    cumSodium += segSodium;

    return {
      cpName: split.cpName,
      segmentTime: split.segmentTime,
      cumulativeTime: split.cumulativeTime,
      targets,
      segmentCalories: segCal,
      segmentFluid: segFluid,
      segmentSodium: segSodium,
      cumulativeCalories: cumCal,
      cumulativeFluid: cumFluid,
      cumulativeSodium: cumSodium,
    };
  });
}

function computeTargets(
  effortRatio: number,
  temp: number,
  humidity: number,
  weightFactor: number,
): NutritionTargets {
  // --- Calories ---
  // Base: 350 kcal/hr, scaled by effort and weight
  const baseCal = 350 * Math.sqrt(effortRatio) * weightFactor;
  const caloriesPerHour = Math.round(clamp(baseCal, 250, 600));

  // --- Fluid ---
  // Base: 500 ml/hr
  let fluid = 500 * Math.sqrt(effortRatio) * weightFactor;
  // +12% per 5°C above 20°C
  if (temp > 20) fluid *= 1 + 0.12 * ((temp - 20) / 5);
  // +5% per 10% humidity above 60%
  if (humidity > 60) fluid *= 1 + 0.05 * ((humidity - 60) / 10);
  const fluidPerHour = Math.round(clamp(fluid, 300, 1200));

  // --- Sodium ---
  // Base: 400 mg/hr
  let sodium = 400;
  // +15% per 5°C above 20°C
  if (temp > 20) sodium *= 1 + 0.15 * ((temp - 20) / 5);
  // +10% if humidity > 70%
  if (humidity > 70) sodium *= 1.10;
  const sodiumPerHour = Math.round(clamp(sodium, 200, 1000));

  return { caloriesPerHour, fluidPerHour, sodiumPerHour };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
