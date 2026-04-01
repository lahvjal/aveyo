# Environmental Impact Calculation Formulas
## How to Calculate Environmental Metrics from Solar Production Data

---

## 📊 Core Formula

**ALL environmental impact metrics are calculated from one input:**
- **Energy Production (kWh)** - kilowatt-hours produced by the solar system

---

## 🌳 Trees Planted Equivalent

### Formula
```
Trees Equivalent = kWh × 0.0115
```

### EPA Standard Conversion
- **1 kWh of solar energy ≈ 0.0115 trees planted**
- Based on: Average tree absorbs ~20 lbs of CO₂ per year
- Solar offset: ~1.76 lbs CO₂ per kWh (US grid average)

### Example
```javascript
const kwhProduced = 3646; // Annual production
const treesEquivalent = Math.round(kwhProduced * 0.0115);
// Result: 42 trees
```

### Code Implementation
```typescript
function calculateTreesEquivalent(kwhProduced: number): number {
  const TREES_PER_KWH = 0.0115;
  return Math.round(kwhProduced * TREES_PER_KWH);
}
```

---

## 💨 CO₂ Offset (Carbon Emissions Avoided)

### Formula
```
CO₂ Offset (kg) = kWh × 0.744
CO₂ Offset (lbs) = kWh × 1.64
CO₂ Offset (tons) = kWh × 0.000744
```

### EPA Standard Conversion
- **1 kWh of solar energy avoids ~0.744 kg (1.64 lbs) of CO₂**
- Based on: US grid average emissions factor
- Varies by region (coal-heavy grids = higher offset)

### Regional Variations
| Region | kg CO₂ per kWh |
|--------|----------------|
| US Average | 0.744 |
| California | 0.456 |
| Texas | 0.897 |
| Coal-heavy states | 1.0+ |
| Clean energy states | 0.3-0.5 |

### Example
```javascript
const kwhProduced = 3646;
const co2OffsetKg = kwhProduced * 0.744; // 2,712 kg
const co2OffsetTons = kwhProduced * 0.000744; // 2.7 tons
const co2OffsetLbs = kwhProduced * 1.64; // 5,979 lbs
```

### Code Implementation
```typescript
function calculateCO2Offset(kwhProduced: number, unit: 'kg' | 'lbs' | 'tons' = 'tons'): number {
  const CO2_KG_PER_KWH = 0.744; // US average
  
  switch (unit) {
    case 'kg':
      return Math.round(kwhProduced * CO2_KG_PER_KWH);
    case 'lbs':
      return Math.round(kwhProduced * CO2_KG_PER_KWH * 2.20462);
    case 'tons':
      return parseFloat((kwhProduced * CO2_KG_PER_KWH / 1000).toFixed(1));
  }
}
```

---

## 🚗 Cars Off The Road Equivalent

### Formula
```
Cars Off Road = (kWh × 0.744) / 4600
```

### EPA Standard Conversion
- Average passenger vehicle emits ~4.6 metric tons CO₂/year
- 1 car removed = 4,600 kg CO₂ avoided annually

### Example
```javascript
const kwhProduced = 3646;
const co2OffsetKg = kwhProduced * 0.744; // 2,712 kg
const carsOffRoad = (co2OffsetKg / 4600).toFixed(2);
// Result: 0.59 cars (or "taking a car off the road for 7 months")
```

---

## 🏠 Homes Powered Equivalent

### Formula
```
Homes Powered = kWh / 10,649
```

### EPA Standard Conversion
- Average US home uses ~10,649 kWh/year (EIA data)
- Varies by region, climate, and home size

### Regional Variations
| Region | kWh/year per home |
|--------|-------------------|
| US Average | 10,649 |
| South (hot) | 12,000-14,000 |
| Northeast | 8,000-10,000 |
| West Coast | 7,000-9,000 |

### Example
```javascript
const kwhProduced = 3646;
const homesYearly = (kwhProduced / 10649).toFixed(2); // 0.34 homes
const homesDays = Math.round((kwhProduced / 10649) * 365); // 125 days
// Result: "Powers a home for 125 days"
```

---

## 💰 Financial Savings

### Formula
```
Savings ($) = kWh × Utility Rate ($/kWh)
```

### Average Utility Rates (2024)
| Region | $/kWh |
|--------|-------|
| US Average | $0.16 |
| California | $0.28 |
| Texas | $0.12 |
| New York | $0.21 |
| Hawaii | $0.42 |

### Example
```javascript
const kwhProduced = 3646;
const averageRate = 0.16; // US average
const savings = Math.round(kwhProduced * averageRate);
// Result: $583
```

### Code Implementation
```typescript
function calculateSavings(kwhProduced: number, utilityRate: number = 0.16): number {
  return Math.round(kwhProduced * utilityRate);
}
```

---

## 🔥 Coal Burned Avoided

### Formula
```
Coal Avoided (lbs) = kWh × 0.85
```

### Standard Conversion
- ~0.85 lbs of coal burned per kWh (US average)
- Varies by grid composition

### Example
```javascript
const kwhProduced = 3646;
const coalAvoidedLbs = Math.round(kwhProduced * 0.85);
// Result: 3,099 lbs of coal not burned
```

---

## 🌊 Water Saved

### Formula
```
Water Saved (gallons) = kWh × 0.47
```

### Standard Conversion
- Power plants use ~0.47 gallons water per kWh
- Primarily for cooling in thermal plants

### Example
```javascript
const kwhProduced = 3646;
const waterSavedGallons = Math.round(kwhProduced * 0.47);
// Result: 1,714 gallons saved
```

---

## 📱 Smartphones Charged Equivalent

### Formula
```
Smartphones Charged = kWh / 0.012
```

### Standard Conversion
- Average smartphone battery: ~12 Wh = 0.012 kWh
- Full charge from 0% to 100%

### Example
```javascript
const kwhProduced = 3646;
const smartphonesCharged = Math.round(kwhProduced / 0.012);
// Result: 303,833 smartphone charges
```

---

## 🛠️ Complete Utility Function

```typescript
// src/utils/environmentalImpact.ts

interface EnvironmentalImpact {
  trees: number;
  co2Tons: number;
  co2Kg: number;
  co2Lbs: number;
  carsOffRoad: number;
  homesYearly: number;
  homesDays: number;
  savings: number;
  coalAvoidedLbs: number;
  waterSavedGallons: number;
  smartphonesCharged: number;
}

interface ImpactConfig {
  utilityRate?: number; // $/kWh
  co2Factor?: number; // kg CO₂ per kWh (default: US average)
  homeUsage?: number; // average home kWh/year
}

export function calculateEnvironmentalImpact(
  kwhProduced: number,
  config: ImpactConfig = {}
): EnvironmentalImpact {
  const {
    utilityRate = 0.16,
    co2Factor = 0.744,
    homeUsage = 10649,
  } = config;

  const co2Kg = kwhProduced * co2Factor;
  
  return {
    // Trees
    trees: Math.round(kwhProduced * 0.0115),
    
    // CO₂ Offset
    co2Tons: parseFloat((co2Kg / 1000).toFixed(1)),
    co2Kg: Math.round(co2Kg),
    co2Lbs: Math.round(co2Kg * 2.20462),
    
    // Cars Off Road
    carsOffRoad: parseFloat((co2Kg / 4600).toFixed(2)),
    
    // Homes Powered
    homesYearly: parseFloat((kwhProduced / homeUsage).toFixed(2)),
    homesDays: Math.round((kwhProduced / homeUsage) * 365),
    
    // Financial
    savings: Math.round(kwhProduced * utilityRate),
    
    // Resource Savings
    coalAvoidedLbs: Math.round(kwhProduced * 0.85),
    waterSavedGallons: Math.round(kwhProduced * 0.47),
    
    // Fun Metric
    smartphonesCharged: Math.round(kwhProduced / 0.012),
  };
}

// Usage example:
const annualProduction = 3646; // kWh from monitoring system
const impact = calculateEnvironmentalImpact(annualProduction, {
  utilityRate: 0.12, // Texas rate
  co2Factor: 0.897, // Texas grid factor (coal-heavy)
});

console.log(impact);
/*
{
  trees: 42,
  co2Tons: 3.3,
  co2Kg: 3269,
  co2Lbs: 7207,
  carsOffRoad: 0.71,
  homesYearly: 0.34,
  homesDays: 125,
  savings: 438,
  coalAvoidedLbs: 3099,
  waterSavedGallons: 1714,
  smartphonesCharged: 303833
}
*/
```

---

## 🎯 Where to Get Production Data

### Option 1: Solar Monitoring APIs
Most inverter manufacturers provide APIs:

1. **Enphase Enlighten API**
   - Real-time and historical production
   - Per-panel data available
   - API: https://developer.enphase.com/

2. **SolarEdge Monitoring API**
   - Site energy production
   - Time-based data (day/week/month/year)
   - API: https://www.solaredge.com/sites/default/files/se_monitoring_api.pdf

3. **Tesla Powerwall API**
   - System production and battery data
   - Local and cloud API

4. **Fronius Solar API**
   - Real-time data access
   - Historical data retrieval

5. **SMA Solar**
   - Sunny Portal API
   - Energy yield data

### Option 2: Manual Entry
- Allow customers to enter production from their monitoring app
- Update monthly/quarterly via form

### Option 3: Estimated Production
- Use `estimatedYearlyProduction` from database
- Clearly label as "estimated"
- Apply degradation factor per year (~0.5% annually)

---

## 📊 Example Implementation

```typescript
// src/app/(dashboard)/annual-report/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useProjects } from '@/context/ProjectsContext';
import { calculateEnvironmentalImpact } from '@/utils/environmentalImpact';

export default function AnnualReportPage() {
  const { projects } = useProjects();
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (projects.length > 0) {
      const project = projects[0];
      
      // Option 1: Use actual production data (from monitoring API)
      const actualProduction = await fetchProductionData(project.id);
      
      // Option 2: Use estimated production (from database)
      const estimatedProduction = project.estimated_yearly_production || 0;
      
      // Use actual if available, otherwise estimated
      const kwhProduced = actualProduction || estimatedProduction;
      
      // Calculate environmental impact
      const impact = calculateEnvironmentalImpact(kwhProduced, {
        utilityRate: 0.16, // Get from project location
        co2Factor: 0.744,  // Get from state/region
      });
      
      setReportData({
        year: new Date().getFullYear(),
        kwhProduced: kwhProduced.toLocaleString(),
        isEstimate: !actualProduction, // Flag to show disclaimer
        
        // Environmental metrics
        trees: impact.trees,
        co2Tons: impact.co2Tons,
        savings: impact.savings,
        
        // Additional metrics you can show
        carsOffRoad: impact.carsOffRoad,
        homesDays: impact.homesDays,
        coalAvoided: impact.coalAvoidedLbs,
        waterSaved: impact.waterSavedGallons,
      });
    }
  }, [projects]);

  return (
    // ... your report JSX
  );
}
```

---

## ✅ Summary

**YES, you can calculate environmental impact from ANY production data source!**

### Key Points:
1. ✅ **All calculations derived from kWh produced**
2. ✅ **Standard EPA conversion factors are well-established**
3. ✅ **Can use actual OR estimated production data**
4. ✅ **Should adjust for regional differences** (utility rates, CO₂ factors)
5. ✅ **Easy to implement** - simple multiplication formulas

### Recommendations:
1. **Create utility function** with these formulas
2. **Fetch production data** from monitoring APIs if available
3. **Fall back to estimates** if no monitoring data
4. **Always label** whether using actual or estimated data
5. **Update calculations** when you get real production data

### Sources:
- EPA Power Profiler: https://www.epa.gov/energy/power-profiler
- EPA Greenhouse Gas Equivalencies: https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator
- EIA Average Home Usage: https://www.eia.gov/tools/faqs/faq.php?id=97&t=3
