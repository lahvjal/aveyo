"use client";

import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { useMemo, useState } from "react";

const STATE_RATES = [
  { code: "AL", name: "Alabama", rate: 0.17 },
  { code: "AK", name: "Alaska", rate: 0.24 },
  { code: "AZ", name: "Arizona", rate: 0.16 },
  { code: "AR", name: "Arkansas", rate: 0.14 },
  { code: "CA", name: "California", rate: 0.25 },
  { code: "CO", name: "Colorado", rate: 0.16 },
  { code: "CT", name: "Connecticut", rate: 0.29 },
  { code: "DE", name: "Delaware", rate: 0.18 },
  { code: "DC", name: "District of Columbia", rate: 0.18 },
  { code: "FL", name: "Florida", rate: 0.15 },
  { code: "GA", name: "Georgia", rate: 0.14 },
  { code: "HI", name: "Hawaii", rate: 0.39 },
  { code: "ID", name: "Idaho", rate: 0.12 },
  { code: "IL", name: "Illinois", rate: 0.16 },
  { code: "IN", name: "Indiana", rate: 0.15 },
  { code: "IA", name: "Iowa", rate: 0.13 },
  { code: "KS", name: "Kansas", rate: 0.14 },
  { code: "KY", name: "Kentucky", rate: 0.13 },
  { code: "LA", name: "Louisiana", rate: 0.12 },
  { code: "ME", name: "Maine", rate: 0.24 },
  { code: "MD", name: "Maryland", rate: 0.18 },
  { code: "MA", name: "Massachusetts", rate: 0.3 },
  { code: "MI", name: "Michigan", rate: 0.18 },
  { code: "MN", name: "Minnesota", rate: 0.16 },
  { code: "MS", name: "Mississippi", rate: 0.14 },
  { code: "MO", name: "Missouri", rate: 0.14 },
  { code: "MT", name: "Montana", rate: 0.13 },
  { code: "NE", name: "Nebraska", rate: 0.13 },
  { code: "NV", name: "Nevada", rate: 0.16 },
  { code: "NH", name: "New Hampshire", rate: 0.27 },
  { code: "NJ", name: "New Jersey", rate: 0.2 },
  { code: "NM", name: "New Mexico", rate: 0.15 },
  { code: "NY", name: "New York", rate: 0.24 },
  { code: "NC", name: "North Carolina", rate: 0.14 },
  { code: "ND", name: "North Dakota", rate: 0.12 },
  { code: "OH", name: "Ohio", rate: 0.16 },
  { code: "OK", name: "Oklahoma", rate: 0.13 },
  { code: "OR", name: "Oregon", rate: 0.15 },
  { code: "PA", name: "Pennsylvania", rate: 0.18 },
  { code: "RI", name: "Rhode Island", rate: 0.26 },
  { code: "SC", name: "South Carolina", rate: 0.15 },
  { code: "SD", name: "South Dakota", rate: 0.13 },
  { code: "TN", name: "Tennessee", rate: 0.14 },
  { code: "TX", name: "Texas", rate: 0.15 },
  { code: "UT", name: "Utah", rate: 0.12 },
  { code: "VT", name: "Vermont", rate: 0.22 },
  { code: "VA", name: "Virginia", rate: 0.14 },
  { code: "WA", name: "Washington", rate: 0.12 },
  { code: "WV", name: "West Virginia", rate: 0.14 },
  { code: "WI", name: "Wisconsin", rate: 0.17 },
  { code: "WY", name: "Wyoming", rate: 0.13 }
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default function SolarSavingsEstimator() {
  const [stateCode, setStateCode] = useState("CA");
  const [monthlyBill, setMonthlyBill] = useState("250");

  const selectedState = useMemo(
    () => STATE_RATES.find((item) => item.code === stateCode) ?? STATE_RATES[0],
    [stateCode]
  );

  const estimate = useMemo(() => {
    const parsedMonthlyBill = Number(monthlyBill);
    const normalizedMonthlyBill = Number.isFinite(parsedMonthlyBill) ? Math.max(parsedMonthlyBill, 0) : 0;
    const monthlyKwhUsage = normalizedMonthlyBill > 0 ? normalizedMonthlyBill / selectedState.rate : 0;
    const systemSizeKw = monthlyKwhUsage / 123;
    const annualSavings = normalizedMonthlyBill * 12 * 0.181;

    return {
      normalizedMonthlyBill,
      systemSizeKw,
      annualSavings
    };
  }, [monthlyBill, selectedState.rate]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.8fr)] lg:items-stretch">
      <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white bg-[color:var(--site-white)] p-[var(--site-card-padding-compact)] shadow-[0_24px_60px_rgba(10,22,40,0.08)]">
        <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
        <div className="relative z-[2]">
          <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
            Savings Calculator
          </p>
          <h3 className="mt-4 text-[2rem] text-[length:var(--site-h4)] leading-[1.02] tracking-[-0.03em] text-[#212120] text-[color:var(--site-black)]">
            A Look Into An Average Home&apos;s Savings
          </h3>
          <p className="mt-4 max-w-[48ch] text-base text-[length:var(--site-body)] leading-[1.75] text-[#5f646b] text-[color:var(--site-text-muted)]">
            Choose your state and estimated monthly bill to see a simple example of how a solar project can start
            to shift the economics of your home energy.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              State
              <select
                value={stateCode}
                onChange={(event) => setStateCode(event.target.value)}
                className="rounded-[18px] rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-base text-[length:var(--site-body)] font-normal outline-none transition-colors focus:border-[#0A1628] focus:border-[color:var(--site-navy)]"
              >
                {STATE_RATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-[length:var(--site-paragraph)] font-semibold text-[#212120] text-[color:var(--site-black)]">
              Monthly Bill
              <input
                inputMode="decimal"
                value={monthlyBill}
                onChange={(event) => setMonthlyBill(event.target.value)}
                className="rounded-[18px] rounded-[var(--site-radius-field)] border border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-[#f9fbfc] bg-[color:var(--site-surface-light-top)] px-[var(--site-card-padding-tight)] py-3 text-base text-[length:var(--site-body)] font-normal outline-none transition-colors focus:border-[#0A1628] focus:border-[color:var(--site-navy)]"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-[#0A1628] bg-[color:var(--site-navy)] p-[var(--site-card-padding-compact)] text-white shadow-[0_28px_80px_rgba(10,22,40,0.18)]">
        <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
        <div className="relative z-[2]">
          <p className="text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] text-white/60">
            Example Output
          </p>
          <div className="mt-6 grid gap-4">
            <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] p-[var(--site-card-padding-tight)]">
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">
                <p className="text-sm text-[length:var(--site-paragraph)] uppercase tracking-[0.22em] text-white/55">
                  System Avg Size
                </p>
                <p className="mt-2 text-[length:var(--site-h4)] leading-none">{estimate.systemSizeKw.toFixed(1)} kW</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] p-[var(--site-card-padding-tight)]">
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">
                <p className="text-sm text-[length:var(--site-paragraph)] uppercase tracking-[0.22em] text-white/55">
                  Cost / kWh
                </p>
                <p className="mt-2 text-[length:var(--site-h4)] leading-none">${selectedState.rate.toFixed(2)}/kWh</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] p-[var(--site-card-padding-tight)]">
              <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
              <div className="relative z-[2]">
                <p className="text-sm text-[length:var(--site-paragraph)] uppercase tracking-[0.22em] text-white/55">
                  Estimated Annual Savings
                </p>
                <p className="mt-2 text-[length:var(--site-h4)] leading-none">{formatCurrency(estimate.annualSavings)}/yr</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
