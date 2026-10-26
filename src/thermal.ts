/** Simplified sensible-heat estimates; no boiler/hydraulic design. */
export const WATER_SPECIFIC_HEAT_KJ_PER_KG_K = 4.186;
export const ASSUMED_WATER_DENSITY_KG_PER_L = 1;

/** Temperature difference and volume must be non-negative finite numbers. */
function nonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
  return value;
}

/** Approximate energy stored by water at an assumed 1 kg/L density, in kWh. */
export function storedHeatKWh(volumeLitres: number, deltaCelsius: number): number {
  const volume = nonNegative(volumeLitres, "volumeLitres");
  const delta = nonNegative(deltaCelsius, "deltaCelsius");
  return volume * ASSUMED_WATER_DENSITY_KG_PER_L * WATER_SPECIFIC_HEAT_KJ_PER_KG_K * delta / 3600;
}

/** Upper bound of supplied electrical energy, before controls and losses. */
export function nightInputKWh(powerKw: number, hours: number): number {
  return nonNegative(powerKw, "powerKw") * nonNegative(hours, "hours");
}

/** Ideal hours at constant power with no simultaneous house or DHW demand. */
export function idealChargeHours(energyKWh: number, powerKw: number): number {
  nonNegative(energyKWh, "energyKWh");
  if (!Number.isFinite(powerKw) || powerKw <= 0) {
    throw new RangeError("powerKw must be a positive finite number");
  }
  return energyKWh / powerKw;
}

/** Comparison scenarios. This is not a claim that any tank can be fully charged. */
export function tankScenarios(volumeLitres: readonly number[], deltaCelsius: number, powerKw: number) {
  return volumeLitres.map(volumeLitres => {
    const storedKWh = storedHeatKWh(volumeLitres, deltaCelsius);
    return { volumeLitres, storedKWh, idealChargeHours: idealChargeHours(storedKWh, powerKw) };
  });
}
