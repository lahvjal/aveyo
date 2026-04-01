// Environmental Impact Calculations
// Based on EPA standards and conversion factors

/**
 * Environmental impact metrics calculated from energy production
 */
export interface EnvironmentalImpact {
  // Trees
  trees: number;
  
  // CO₂ Offset
  co2Tons: number;
  co2Kg: number;
  co2Lbs: number;
  
  // Cars Off Road
  carsOffRoad: number;
  
  // Homes Powered
  homesYearly: number;
  homesDays: number;
  
  // Financial (optional)
  savings: number;
  
  // Resource Savings
  coalAvoidedLbs: number;
  waterSavedGallons: number;
  
  // Fun Metrics
  smartphonesCharged: number;
}

/**
 * Configuration options for environmental impact calculations
 */
export interface ImpactConfig {
  /** Utility rate in $/kWh (default: 0.16 - US average) */
  utilityRate?: number;
  
  /** CO₂ emissions factor in kg per kWh (default: 0.744 - US average) */
  co2Factor?: number;
  
  /** Average home energy usage in kWh/year (default: 10,649 - US average) */
  homeUsage?: number;
}

/**
 * Standard conversion factors (EPA and EIA data)
 */
const CONVERSION_FACTORS = {
  // Trees planted equivalent per kWh
  TREES_PER_KWH: 0.0115,
  
  // CO₂ emissions avoided
  CO2_KG_PER_KWH_US_AVG: 0.744,
  CO2_KG_PER_KWH_CALIFORNIA: 0.456,
  CO2_KG_PER_KWH_TEXAS: 0.897,
  
  // Average car emissions per year in kg
  CAR_EMISSIONS_KG_YEAR: 4600,
  
  // Average home usage per year in kWh
  HOME_USAGE_KWH_YEAR_US_AVG: 10649,
  HOME_USAGE_KWH_YEAR_CALIFORNIA: 7000,
  HOME_USAGE_KWH_YEAR_TEXAS: 14000,
  
  // Utility rates ($/kWh)
  UTILITY_RATE_US_AVG: 0.16,
  UTILITY_RATE_CALIFORNIA: 0.28,
  UTILITY_RATE_TEXAS: 0.12,
  UTILITY_RATE_NEW_YORK: 0.21,
  UTILITY_RATE_HAWAII: 0.42,
  
  // Coal burned per kWh in lbs
  COAL_LBS_PER_KWH: 0.85,
  
  // Water used per kWh in gallons
  WATER_GALLONS_PER_KWH: 0.47,
  
  // Smartphone battery capacity in kWh
  SMARTPHONE_BATTERY_KWH: 0.012,
  
  // Conversion constants
  KG_TO_LBS: 2.20462,
  KG_TO_TONS: 1000,
};

/**
 * Calculate all environmental impact metrics from energy production
 * 
 * @param kwhProduced - Total energy produced in kilowatt-hours
 * @param config - Optional configuration for regional/custom factors
 * @returns Complete environmental impact metrics
 * 
 * @example
 * ```typescript
 * const impact = calculateEnvironmentalImpact(3646, {
 *   utilityRate: 0.12,
 *   co2Factor: 0.897,
 * });
 * console.log(impact.trees); // 42
 * console.log(impact.co2Tons); // 3.3
 * ```
 */
export function calculateEnvironmentalImpact(
  kwhProduced: number,
  config: ImpactConfig = {}
): EnvironmentalImpact {
  const {
    utilityRate = CONVERSION_FACTORS.UTILITY_RATE_US_AVG,
    co2Factor = CONVERSION_FACTORS.CO2_KG_PER_KWH_US_AVG,
    homeUsage = CONVERSION_FACTORS.HOME_USAGE_KWH_YEAR_US_AVG,
  } = config;

  // Calculate CO₂ offset in kg
  const co2Kg = kwhProduced * co2Factor;
  
  return {
    // Trees Planted Equivalent
    trees: Math.round(kwhProduced * CONVERSION_FACTORS.TREES_PER_KWH),
    
    // CO₂ Offset (multiple units)
    co2Tons: parseFloat((co2Kg / CONVERSION_FACTORS.KG_TO_TONS).toFixed(1)),
    co2Kg: Math.round(co2Kg),
    co2Lbs: Math.round(co2Kg * CONVERSION_FACTORS.KG_TO_LBS),
    
    // Cars Off Road Equivalent
    carsOffRoad: parseFloat((co2Kg / CONVERSION_FACTORS.CAR_EMISSIONS_KG_YEAR).toFixed(2)),
    
    // Homes Powered
    homesYearly: parseFloat((kwhProduced / homeUsage).toFixed(2)),
    homesDays: Math.round((kwhProduced / homeUsage) * 365),
    
    // Financial Savings
    savings: Math.round(kwhProduced * utilityRate),
    
    // Coal Avoided
    coalAvoidedLbs: Math.round(kwhProduced * CONVERSION_FACTORS.COAL_LBS_PER_KWH),
    
    // Water Saved
    waterSavedGallons: Math.round(kwhProduced * CONVERSION_FACTORS.WATER_GALLONS_PER_KWH),
    
    // Smartphones Charged
    smartphonesCharged: Math.round(kwhProduced / CONVERSION_FACTORS.SMARTPHONE_BATTERY_KWH),
  };
}

/**
 * Calculate trees planted equivalent from kWh
 * 
 * @param kwhProduced - Energy produced in kWh
 * @returns Number of trees planted equivalent
 */
export function calculateTreesEquivalent(kwhProduced: number): number {
  return Math.round(kwhProduced * CONVERSION_FACTORS.TREES_PER_KWH);
}

/**
 * Calculate CO₂ offset from kWh
 * 
 * @param kwhProduced - Energy produced in kWh
 * @param unit - Unit for CO₂ measurement (default: 'tons')
 * @param co2Factor - Regional CO₂ factor (default: US average)
 * @returns CO₂ offset in specified unit
 */
export function calculateCO2Offset(
  kwhProduced: number,
  unit: 'kg' | 'lbs' | 'tons' = 'tons',
  co2Factor: number = CONVERSION_FACTORS.CO2_KG_PER_KWH_US_AVG
): number {
  const co2Kg = kwhProduced * co2Factor;
  
  switch (unit) {
    case 'kg':
      return Math.round(co2Kg);
    case 'lbs':
      return Math.round(co2Kg * CONVERSION_FACTORS.KG_TO_LBS);
    case 'tons':
      return parseFloat((co2Kg / CONVERSION_FACTORS.KG_TO_TONS).toFixed(1));
  }
}

/**
 * Calculate financial savings from energy production
 * 
 * @param kwhProduced - Energy produced in kWh
 * @param utilityRate - Local utility rate in $/kWh (default: US average)
 * @returns Estimated savings in dollars
 */
export function calculateSavings(
  kwhProduced: number,
  utilityRate: number = CONVERSION_FACTORS.UTILITY_RATE_US_AVG
): number {
  return Math.round(kwhProduced * utilityRate);
}

/**
 * Calculate cars off the road equivalent
 * 
 * @param kwhProduced - Energy produced in kWh
 * @param co2Factor - Regional CO₂ factor (default: US average)
 * @returns Number of cars taken off the road for one year
 */
export function calculateCarsOffRoad(
  kwhProduced: number,
  co2Factor: number = CONVERSION_FACTORS.CO2_KG_PER_KWH_US_AVG
): number {
  const co2Kg = kwhProduced * co2Factor;
  return parseFloat((co2Kg / CONVERSION_FACTORS.CAR_EMISSIONS_KG_YEAR).toFixed(2));
}

/**
 * Calculate homes powered equivalent
 * 
 * @param kwhProduced - Energy produced in kWh
 * @param homeUsage - Average home usage per year in kWh (default: US average)
 * @returns Object with yearly and daily home power equivalents
 */
export function calculateHomesPowered(
  kwhProduced: number,
  homeUsage: number = CONVERSION_FACTORS.HOME_USAGE_KWH_YEAR_US_AVG
): { yearly: number; days: number } {
  const homesYearly = parseFloat((kwhProduced / homeUsage).toFixed(2));
  const homesDays = Math.round(homesYearly * 365);
  
  return {
    yearly: homesYearly,
    days: homesDays,
  };
}

/**
 * Get regional CO₂ factor by state
 * 
 * @param state - US state code (e.g., 'CA', 'TX', 'NY')
 * @returns CO₂ emissions factor in kg per kWh
 */
export function getCO2FactorByState(state: string): number {
  const stateFactors: Record<string, number> = {
    'CA': 0.456, // California
    'TX': 0.897, // Texas
    'NY': 0.520, // New York
    'FL': 0.780, // Florida
    'PA': 0.830, // Pennsylvania
    'OH': 0.950, // Ohio
    'IL': 0.720, // Illinois
    'WA': 0.290, // Washington
    'OR': 0.250, // Oregon
    'UT': 0.820, // Utah
  };
  
  return stateFactors[state.toUpperCase()] || CONVERSION_FACTORS.CO2_KG_PER_KWH_US_AVG;
}

/**
 * Get regional utility rate by state
 * 
 * @param state - US state code (e.g., 'CA', 'TX', 'NY')
 * @returns Utility rate in $/kWh
 */
export function getUtilityRateByState(state: string): number {
  const stateRates: Record<string, number> = {
    'CA': 0.28,
    'TX': 0.12,
    'NY': 0.21,
    'FL': 0.13,
    'PA': 0.14,
    'OH': 0.13,
    'IL': 0.13,
    'WA': 0.11,
    'OR': 0.11,
    'HI': 0.42,
    'MA': 0.23,
    'CT': 0.22,
    'RI': 0.21,
    'NH': 0.20,
    'UT': 0.11,
  };
  
  return stateRates[state.toUpperCase()] || CONVERSION_FACTORS.UTILITY_RATE_US_AVG;
}

/**
 * Get regional home usage by state
 * 
 * @param state - US state code (e.g., 'CA', 'TX', 'NY')
 * @returns Average home usage in kWh/year
 */
export function getHomeUsageByState(state: string): number {
  const stateUsage: Record<string, number> = {
    'CA': 7000,
    'TX': 14000,
    'NY': 7500,
    'FL': 13500,
    'LA': 14500,
    'AZ': 12500,
    'WA': 11000,
    'OR': 10500,
    'UT': 9000,
  };
  
  return stateUsage[state.toUpperCase()] || CONVERSION_FACTORS.HOME_USAGE_KWH_YEAR_US_AVG;
}

/**
 * Calculate environmental impact with automatic regional adjustments
 * 
 * @param kwhProduced - Energy produced in kWh
 * @param state - US state code for regional factors
 * @returns Environmental impact with regional calculations
 */
export function calculateRegionalImpact(
  kwhProduced: number,
  state?: string
): EnvironmentalImpact {
  if (!state) {
    return calculateEnvironmentalImpact(kwhProduced);
  }
  
  return calculateEnvironmentalImpact(kwhProduced, {
    co2Factor: getCO2FactorByState(state),
    utilityRate: getUtilityRateByState(state),
    homeUsage: getHomeUsageByState(state),
  });
}

/**
 * Format environmental impact for display
 * 
 * @param impact - Environmental impact object
 * @returns Formatted strings for display
 */
export function formatEnvironmentalImpact(impact: EnvironmentalImpact) {
  return {
    trees: `${impact.trees.toLocaleString()} trees`,
    co2Tons: `${impact.co2Tons.toLocaleString()} tons`,
    co2Lbs: `${impact.co2Lbs.toLocaleString()} lbs`,
    carsOffRoad: impact.carsOffRoad < 1 
      ? `${Math.round(impact.carsOffRoad * 12)} months` 
      : `${impact.carsOffRoad.toLocaleString()} cars`,
    homesDays: impact.homesDays < 365
      ? `${impact.homesDays} days`
      : `${impact.homesYearly.toFixed(1)} homes`,
    savings: `$${impact.savings.toLocaleString()}`,
    coalAvoided: `${impact.coalAvoidedLbs.toLocaleString()} lbs`,
    waterSaved: `${impact.waterSavedGallons.toLocaleString()} gallons`,
    smartphones: `${impact.smartphonesCharged.toLocaleString()} charges`,
  };
}

// Export conversion factors for reference
export { CONVERSION_FACTORS };
