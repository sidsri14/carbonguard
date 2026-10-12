/**
 * CarbonGuard GHG Protocol Emissions Calculator
 * Deterministic calculation engine for Scope 1, 2, and 3 emissions
 */

export const EMISSION_FACTORS = {
  // Scope 1: Fuel Combustion (kg CO2e per unit)
  DIESEL_LITER: 2.68,
  NATURAL_GAS_M3: 1.93,
  PROPANE_LITER: 1.51,

  // Scope 2: Electricity Grid (kg CO2e per kWh)
  GRID_US_AVERAGE: 0.386,
  GRID_EU_AVERAGE: 0.255,
  GRID_INDIA_AVERAGE: 0.708,
  GRID_RENEWABLE_SOLAR_WIND: 0.0,

  // Scope 3: Logistics (kg CO2e per tonne-km)
  FREIGHT_ROAD_TRUCK: 0.105,
  FREIGHT_RAIL: 0.028,
  FREIGHT_AIR_CARGO: 0.602,
};

export class GHGCalculator {
  /**
   * Calculates Scope 1 direct combustion emissions
   */
  calculateScope1(fuelType, quantity) {
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      throw new Error('INVALID_QUANTITY: Fuel quantity must be a non-negative number');
    }

    const factorKey = fuelType.toUpperCase();
    const factor = EMISSION_FACTORS[factorKey];
    if (factor === undefined) {
      throw new Error(`UNSUPPORTED_FUEL_TYPE: '${fuelType}' is not a recognized GHG Scope 1 fuel`);
    }

    const co2eKg = qty * factor;
    return {
      scope: 1,
      fuelType,
      quantity: qty,
      factor,
      co2eKg: Number(co2eKg.toFixed(4)),
      co2eTonnes: Number((co2eKg / 1000).toFixed(6)),
    };
  }

  /**
   * Calculates Scope 2 indirect electricity emissions
   */
  calculateScope2(gridRegion, kWh) {
    const energyKWh = Number(kWh);
    if (isNaN(energyKWh) || energyKWh < 0) {
      throw new Error('INVALID_ENERGY_KWH: Energy consumption must be a non-negative number');
    }

    const factorKey = `GRID_${gridRegion.toUpperCase()}`;
    const factor = EMISSION_FACTORS[factorKey];
    if (factor === undefined) {
      throw new Error(`UNSUPPORTED_GRID_REGION: '${gridRegion}' is not a recognized Scope 2 grid region`);
    }

    const co2eKg = energyKWh * factor;
    return {
      scope: 2,
      gridRegion,
      energyKWh,
      factor,
      co2eKg: Number(co2eKg.toFixed(4)),
      co2eTonnes: Number((co2eKg / 1000).toFixed(6)),
    };
  }

  /**
   * Calculates Scope 3 freight logistics emissions
   */
  calculateScope3Freight(transportMode, tonnes, distanceKm) {
    const t = Number(tonnes);
    const d = Number(distanceKm);
    if (isNaN(t) || t <= 0 || isNaN(d) || d <= 0) {
      throw new Error('INVALID_FREIGHT_PARAMETERS: Tonnes and distance must be positive numbers');
    }

    const factorKey = `FREIGHT_${transportMode.toUpperCase()}`;
    const factor = EMISSION_FACTORS[factorKey];
    if (factor === undefined) {
      throw new Error(`UNSUPPORTED_TRANSPORT_MODE: '${transportMode}' is not recognized`);
    }

    const tonneKm = t * d;
    const co2eKg = tonneKm * factor;
    return {
      scope: 3,
      transportMode,
      tonnes: t,
      distanceKm: d,
      tonneKm,
      factor,
      co2eKg: Number(co2eKg.toFixed(4)),
      co2eTonnes: Number((co2eKg / 1000).toFixed(6)),
    };
  }
}
