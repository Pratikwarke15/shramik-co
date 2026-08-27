import prisma from "../lib/prisma";
import { logger } from "../lib/logger";

export type WeatherCondition =
  | "CLEAR"
  | "CLOUDY"
  | "RAIN"
  | "HEAVY_RAIN"
  | "HEATWAVE"
  | "COLD";

export interface WeatherInput {
  temperatureC?: number;
  condition?: WeatherCondition;
}

export interface ForecastInput {
  coopId?: string;
  category?: string;
  days?: number;
  weather?: WeatherInput;
}

export interface ForecastPoint {
  date: string;
  dayOfWeek: number;
  category: string;
  predictedDemand: number;
  confidence: number;
  weatherFactor: number;
}

export interface Hotspot {
  coopId: string;
  coopName: string;
  category: string;
  predictedDemand: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface AllocationRecommendation {
  coopId: string;
  coopName: string;
  category: string;
  predictedDemand: number;
  recommendedWorkers: number;
  rationale: string;
}

export interface ForecastResult {
  generatedAt: string;
  horizonDays: number;
  forecast: ForecastPoint[];
  hotspots: Hotspot[];
  recommendations: AllocationRecommendation[];
  model: {
    type: string;
    dataPoints: number;
    trainedOn: string;
  };
  insights: string[];
}

interface DemandRecord {
  category: string;
  coopId: string;
  coopName: string;
  dayOfWeek: number;
  month: number;
  dayIndex: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SEASON_MULTIPLIER: Record<number, number> = {
  0: 1.05, 1: 1.0, 2: 0.95, 3: 0.9, 4: 0.95, 5: 1.1, 6: 1.2, 7: 1.15, 8: 1.0, 9: 1.05, 10: 1.1, 11: 1.25,
};

const WEATHER_MULTIPLIER: Record<WeatherCondition, number> = {
  CLEAR: 1.0,
  CLOUDY: 1.02,
  RAIN: 1.18,
  HEAVY_RAIN: 1.32,
  HEATWAVE: 1.22,
  COLD: 1.12,
};

const WEATHER_LABEL: Record<WeatherCondition, string> = {
  CLEAR: "clear skies",
  CLOUDY: "cloudy conditions",
  RAIN: "rain (drives indoor service demand)",
  HEAVY_RAIN: "heavy rain (strong indoor demand spike)",
  HEATWAVE: "heatwave (cooling/AC demand surge)",
  COLD: "cold weather (heating/plumbing demand)",
};

function weatherFactor(input?: WeatherInput): number {
  let factor = 1.0;
  if (input?.condition) factor *= WEATHER_MULTIPLIER[input.condition];
  if (typeof input?.temperatureC === "number") {
    const t = input.temperatureC;
    if (t >= 38) factor *= 1.18;
    else if (t <= 8) factor *= 1.1;
    else if (t >= 32) factor *= 1.08;
  }
  return factor;
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export async function forecastDemand(input: ForecastInput = {}): Promise<ForecastResult> {
  const days = Math.min(Math.max(input.days ?? 7, 1), 30);
  const since = new Date();
  since.setDate(since.getDate() - 120);

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: since },
      ...(input.coopId ? { service: { coopId: input.coopId } } : {}),
      ...(input.category ? { service: { categorySlug: input.category } } : {}),
    },
    select: {
      createdAt: true,
      status: true,
      service: { select: { categorySlug: true, coopId: true, coop: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const records: DemandRecord[] = bookings.map((b) => ({
    category: b.service.categorySlug,
    coopId: b.service.coopId,
    coopName: b.service.coop.name,
    dayOfWeek: b.createdAt.getUTCDay(),
    month: b.createdAt.getUTCMonth(),
    dayIndex: Math.floor((b.createdAt.getTime() - since.getTime()) / 86400000),
  }));

  const categories = Array.from(new Set(records.map((r) => r.category)));
  const wFactor = weatherFactor(input?.weather);

  if (categories.length === 0) {
    return emptyForecast(days, wFactor, records.length);
  }

  const totalSpanDays = Math.max(
    1,
    Math.ceil((Date.now() - since.getTime()) / 86400000)
  );

  const forecast: ForecastPoint[] = [];
  const hotspotAgg: Record<string, { coopId: string; coopName: string; category: string; demand: number }> = {};

  const now = new Date();
  for (let d = 0; d < days; d++) {
    const target = new Date(now);
    target.setDate(target.getDate() + d);
    const dow = target.getUTCDay();
    const month = target.getUTCMonth();
    const dateStr = target.toISOString().split("T")[0];

    for (const category of categories) {
      const catRecords = records.filter((r) => r.category === category);
      const baseline = catRecords.length / totalSpanDays;

      const dowCounts = new Array(7).fill(0);
      catRecords.forEach((r) => dowCounts[r.dayOfWeek]++);
      const dowAvg = dowCounts.reduce((s, c) => s + c, 0) / 7;
      const dowMult = dowAvg > 0 ? (dowCounts[dow] || 0) / dowAvg : 1;

      const trend = linearRegression(
        catRecords.map((r) => ({ x: r.dayIndex, y: 1 }))
      );
      const trendFactor = 1 + trend.slope * (totalSpanDays + d) * 0.05;

      const predicted =
        baseline * dowMult * SEASON_MULTIPLIER[month] * wFactor * trendFactor * (1 + d * 0.0);
      const predictedRounded = Math.max(0, Math.round(predicted * 10) / 10);

      const confidence = Math.min(0.95, 0.4 + Math.min(catRecords.length, 200) / 250);

      forecast.push({
        date: dateStr,
        dayOfWeek: dow,
        category,
        predictedDemand: predictedRounded,
        confidence: Math.round(confidence * 100) / 100,
        weatherFactor: wFactor,
      });

      const key = `${category}`;
      if (!hotspotAgg[key]) {
        hotspotAgg[key] = {
          coopId: catRecords[0].coopId,
          coopName: catRecords[0].coopName,
          category,
          demand: 0,
        };
      }
      hotspotAgg[key].demand += predictedRounded;
    }
  }

  const hotspots: Hotspot[] = Object.values(hotspotAgg)
    .map((h) => {
      const riskLevel: Hotspot["riskLevel"] =
        h.demand >= 12 ? "HIGH" : h.demand >= 5 ? "MEDIUM" : "LOW";
      return {
        coopId: h.coopId,
        coopName: h.coopName,
        category: h.category,
        predictedDemand: Math.round(h.demand * 10) / 10,
        riskLevel,
      };
    })
    .sort((a, b) => b.predictedDemand - a.predictedDemand)
    .slice(0, 8);

  const recommendations: AllocationRecommendation[] = hotspots
    .filter((h) => h.riskLevel !== "LOW")
    .map((h) => {
      const recommendedWorkers = Math.max(1, Math.ceil(h.predictedDemand / 3));
      return {
        coopId: h.coopId,
        coopName: h.coopName,
        category: h.category,
        predictedDemand: h.predictedDemand,
        recommendedWorkers,
        rationale: `Pre-position ${recommendedWorkers} certified "${h.category}" workers; predicted ${h.predictedDemand} jobs across horizon (risk: ${h.riskLevel}).`,
      };
    });

  const insights = buildInsights(forecast, hotspots, input?.weather, wFactor);

  return {
    generatedAt: new Date().toISOString(),
    horizonDays: days,
    forecast,
    hotspots,
    recommendations,
    model: {
      type: "seasonal-weighted-historical + linear-trend regression",
      dataPoints: records.length,
      trainedOn: since.toISOString().split("T")[0],
    },
    insights,
  };
}

function buildInsights(
  forecast: ForecastPoint[],
  hotspots: Hotspot[],
  weather?: WeatherInput,
  wFactor = 1
): string[] {
  const insights: string[] = [];
  if (weather && wFactor !== 1) {
    insights.push(
      `Weather adjustment applied: ${WEATHER_LABEL[weather.condition ?? "CLEAR"]} raises expected demand by ${Math.round((wFactor - 1) * 100)}%.`
    );
  }
  const top = hotspots[0];
  if (top) {
    insights.push(
      `Highest predicted demand cluster: "${top.category}" at ${top.coopName} (${top.predictedDemand} jobs, risk ${top.riskLevel}).`
    );
  }
  const peakDay = peakForecastDay(forecast);
  if (peakDay) {
    insights.push(`Peak demand day in horizon: ${peakDay.date} (${DAY_NAMES[peakDay.dayOfWeek]}).`);
  }
  const busiest = busiestCategory(forecast);
  if (busiest) {
    insights.push(`Most requested service category overall: "${busiest}".`);
  }
  if (insights.length === 0) {
    insights.push("Insufficient historical booking data to derive strong signals; predictions use flat baseline.");
  }
  return insights;
}

function peakForecastDay(forecast: ForecastPoint[]): ForecastPoint | null {
  const byDate: Record<string, number> = {};
  forecast.forEach((f) => {
    byDate[f.date] = (byDate[f.date] || 0) + f.predictedDemand;
  });
  let best: string | null = null;
  let bestVal = -1;
  Object.entries(byDate).forEach(([date, val]) => {
    if (val > bestVal) {
      bestVal = val;
      best = date;
    }
  });
  if (!best) return null;
  return forecast.find((f) => f.date === best) ?? null;
}

function busiestCategory(forecast: ForecastPoint[]): string | null {
  const byCat: Record<string, number> = {};
  forecast.forEach((f) => {
    byCat[f.category] = (byCat[f.category] || 0) + f.predictedDemand;
  });
  let best: string | null = null;
  let bestVal = -1;
  Object.entries(byCat).forEach(([cat, val]) => {
    if (val > bestVal) {
      bestVal = val;
      best = cat;
    }
  });
  return best;
}

function emptyForecast(days: number, wFactor: number, dataPoints: number): ForecastResult {
  return {
    generatedAt: new Date().toISOString(),
    horizonDays: days,
    forecast: [],
    hotspots: [],
    recommendations: [],
    model: {
      type: "seasonal-weighted-historical + linear-trend regression",
      dataPoints,
      trainedOn: new Date().toISOString().split("T")[0],
    },
    insights: [
      "No historical bookings matched the filter. Seed bookings to activate forecasting.",
      `Weather factor currently set to ${wFactor}.`,
    ],
  };
}

export default { forecastDemand };
