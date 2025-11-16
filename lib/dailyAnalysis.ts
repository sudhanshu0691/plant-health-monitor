// lib/dailyAnalysis.ts
// Daily health analysis and report generation

import { SensorReading, getParameterStatus, getParameterRecommendation, getParameterDisplayName } from './agroMonitoring';

export interface DailyStatistics {
  avgSoilMoisture: number;
  avgTemperature: number;
  avgHumidity: number;
  totalRainfall: number;
  avgLightIntensity: number;
  avgPlantHealth: number;
  readingsCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface CriticalEvent {
  timestamp: Date;
  parameter: string;
  value: number;
  status: 'warning' | 'critical';
  message: string;
}

export interface DailyHealthReport {
  date: string;
  overallHealthScore: number;
  overallStatus: 'Healthy' | 'Moderate' | 'Poor';
  statistics: DailyStatistics;
  parameterWiseStatus: {
    parameter: string;
    displayName: string;
    avgValue: number;
    status: string;
    trend: 'stable' | 'improving' | 'declining';
  }[];
  criticalEvents: CriticalEvent[];
  recommendations: string[];
  weatherForecast?: {
    summary: string;
    expectedRain: number;
    expectedTemp: { min: number; max: number };
  };
}

/**
 * Calculate statistics from 24-hour sensor readings
 */
export function calculateDailyStatistics(readings: SensorReading[]): DailyStatistics {
  if (readings.length === 0) {
    return {
      avgSoilMoisture: 0,
      avgTemperature: 0,
      avgHumidity: 0,
      totalRainfall: 0,
      avgLightIntensity: 0,
      avgPlantHealth: 0,
      readingsCount: 0,
      timeRange: {
        start: new Date(),
        end: new Date()
      }
    };
  }

  const sum = readings.reduce(
    (acc, reading) => ({
      soil: acc.soil + reading.soil,
      temp: acc.temp + reading.temp,
      humidity: acc.humidity + (reading.humidity || 0),
      rain: acc.rain + reading.rain,
      light: acc.light + (reading.light_intensity || 0),
      plantHealth: acc.plantHealth + reading.plant_health,
    }),
    { soil: 0, temp: 0, humidity: 0, rain: 0, light: 0, plantHealth: 0 }
  );

  const count = readings.length;
  const humidityReadings = readings.filter(r => r.humidity !== undefined).length;
  const lightReadings = readings.filter(r => r.light_intensity !== undefined).length;

  // Get time range
  const timestamps = readings.map(r => {
    if (r.timestamp?.toDate) return r.timestamp.toDate();
    if (r.timestamp instanceof Date) return r.timestamp;
    return new Date(r.timestamp);
  });
  
  const sortedTimestamps = timestamps.sort((a, b) => a.getTime() - b.getTime());

  return {
    avgSoilMoisture: sum.soil / count,
    avgTemperature: sum.temp / count,
    avgHumidity: humidityReadings > 0 ? sum.humidity / humidityReadings : 0,
    totalRainfall: sum.rain,
    avgLightIntensity: lightReadings > 0 ? sum.light / lightReadings : 0,
    avgPlantHealth: sum.plantHealth / count,
    readingsCount: count,
    timeRange: {
      start: sortedTimestamps[0] || new Date(),
      end: sortedTimestamps[sortedTimestamps.length - 1] || new Date()
    }
  };
}

/**
 * Extract critical events from readings
 */
export function extractCriticalEvents(readings: SensorReading[]): CriticalEvent[] {
  const events: CriticalEvent[] = [];
  const parameters = ['soil', 'temp', 'rain', 'plant_health', 'humidity', 'light_intensity'];

  for (const reading of readings) {
    const timestamp = reading.timestamp?.toDate
      ? reading.timestamp.toDate()
      : reading.timestamp instanceof Date
      ? reading.timestamp
      : new Date(reading.timestamp);

    for (const param of parameters) {
      const value = reading[param as keyof SensorReading] as number;
      if (value === undefined) continue;

      const status = getParameterStatus(param, value);
      
      if (status === 'warning' || status === 'critical') {
        const displayName = getParameterDisplayName(param);
        let message = '';
        
        if (status === 'warning') {
          message = `${displayName} entered warning range (${value.toFixed(1)})`;
        } else {
          message = `${displayName} reached critical level (${value.toFixed(1)})`;
        }

        events.push({
          timestamp,
          parameter: param,
          value,
          status,
          message
        });
      }
    }
  }

  // Sort by timestamp descending (most recent first)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Calculate overall health score (0-100)
 */
export function calculateOverallHealthScore(stats: DailyStatistics): number {
  // Weight factors for each parameter
  const weights = {
    plantHealth: 0.35,
    soilMoisture: 0.25,
    temperature: 0.20,
    humidity: 0.10,
    lightIntensity: 0.05,
    rainfall: 0.05
  };

  // Normalize and score each parameter
  let totalScore = 0;
  let totalWeight = 0;

  // Plant Health (already 0-100)
  totalScore += stats.avgPlantHealth * weights.plantHealth;
  totalWeight += weights.plantHealth;

  // Soil Moisture (optimal: 40-70)
  const soilScore = calculateParameterScore(stats.avgSoilMoisture, 40, 70);
  totalScore += soilScore * weights.soilMoisture;
  totalWeight += weights.soilMoisture;

  // Temperature (optimal: 40-60)
  const tempScore = calculateParameterScore(stats.avgTemperature, 40, 60);
  totalScore += tempScore * weights.temperature;
  totalWeight += weights.temperature;

  // Humidity (optimal: 40-70)
  if (stats.avgHumidity > 0) {
    const humidityScore = calculateParameterScore(stats.avgHumidity, 40, 70);
    totalScore += humidityScore * weights.humidity;
    totalWeight += weights.humidity;
  }

  // Light Intensity (optimal: 50-80)
  if (stats.avgLightIntensity > 0) {
    const lightScore = calculateParameterScore(stats.avgLightIntensity, 50, 80);
    totalScore += lightScore * weights.lightIntensity;
    totalWeight += weights.lightIntensity;
  }

  // Rainfall (optimal: 0-40, less is better for score)
  const rainfallNormalized = Math.min(stats.totalRainfall / 24, 100); // per hour average
  const rainfallScore = rainfallNormalized <= 40 ? 100 : Math.max(0, 100 - (rainfallNormalized - 40) * 2);
  totalScore += rainfallScore * weights.rainfall;
  totalWeight += weights.rainfall;

  return Math.round(totalScore / totalWeight);
}

/**
 * Calculate score for a parameter based on optimal range
 */
function calculateParameterScore(value: number, optimalMin: number, optimalMax: number): number {
  if (value >= optimalMin && value <= optimalMax) {
    return 100;
  } else if (value < optimalMin) {
    // Below optimal range
    const distance = optimalMin - value;
    return Math.max(0, 100 - distance * 2);
  } else {
    // Above optimal range
    const distance = value - optimalMax;
    return Math.max(0, 100 - distance * 2);
  }
}

/**
 * Determine overall health status
 */
export function getOverallStatus(score: number): 'Healthy' | 'Moderate' | 'Poor' {
  if (score >= 70) return 'Healthy';
  if (score >= 40) return 'Moderate';
  return 'Poor';
}

/**
 * Generate daily health report
 */
export function generateDailyHealthReport(
  readings: SensorReading[],
  date: string = new Date().toISOString().split('T')[0]
): DailyHealthReport {
  const statistics = calculateDailyStatistics(readings);
  const criticalEvents = extractCriticalEvents(readings);
  const overallHealthScore = calculateOverallHealthScore(statistics);
  const overallStatus = getOverallStatus(overallHealthScore);

  // Parameter-wise status
  const parameterWiseStatus = [
    {
      parameter: 'soil',
      displayName: 'Soil Moisture',
      avgValue: statistics.avgSoilMoisture,
      status: getParameterStatus('soil', statistics.avgSoilMoisture),
      trend: 'stable' as const
    },
    {
      parameter: 'temp',
      displayName: 'Temperature',
      avgValue: statistics.avgTemperature,
      status: getParameterStatus('temp', statistics.avgTemperature),
      trend: 'stable' as const
    },
    {
      parameter: 'rain',
      displayName: 'Rainfall',
      avgValue: statistics.totalRainfall,
      status: getParameterStatus('rain', statistics.totalRainfall / 24),
      trend: 'stable' as const
    },
    {
      parameter: 'plant_health',
      displayName: 'Plant Health Index',
      avgValue: statistics.avgPlantHealth,
      status: getParameterStatus('plant_health', statistics.avgPlantHealth),
      trend: 'stable' as const
    }
  ];

  if (statistics.avgHumidity > 0) {
    parameterWiseStatus.push({
      parameter: 'humidity',
      displayName: 'Humidity',
      avgValue: statistics.avgHumidity,
      status: getParameterStatus('humidity', statistics.avgHumidity),
      trend: 'stable' as const
    });
  }

  if (statistics.avgLightIntensity > 0) {
    parameterWiseStatus.push({
      parameter: 'light_intensity',
      displayName: 'Light Intensity',
      avgValue: statistics.avgLightIntensity,
      status: getParameterStatus('light_intensity', statistics.avgLightIntensity),
      trend: 'stable' as const
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  for (const param of parameterWiseStatus) {
    if (param.status !== 'normal') {
      const rec = getParameterRecommendation(param.parameter, param.avgValue, param.status as any);
      if (rec) recommendations.push(`${param.displayName}: ${rec}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All parameters are within optimal ranges. Continue current care routine.');
  }

  // Add general recommendations based on overall status
  if (overallStatus === 'Moderate') {
    recommendations.push('Monitor conditions closely over the next 24 hours.');
  } else if (overallStatus === 'Poor') {
    recommendations.push('Immediate attention required. Review all critical parameters.');
    recommendations.push('Consider consulting an agricultural expert if conditions don\'t improve.');
  }

  return {
    date,
    overallHealthScore,
    overallStatus,
    statistics,
    parameterWiseStatus,
    criticalEvents,
    recommendations
  };
}

/**
 * Format report as markdown
 */
export function formatReportAsMarkdown(report: DailyHealthReport): string {
  const md: string[] = [];

  md.push(`# Daily Plant Health Report`);
  md.push(`**Date:** ${new Date(report.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}\n`);

  md.push(`## Overall Health Score: ${report.overallHealthScore}/100`);
  md.push(`**Status:** ${report.overallStatus} ${report.overallStatus === 'Healthy' ? '✅' : report.overallStatus === 'Moderate' ? '⚠️' : '🚨'}\n`);

  md.push(`## Summary Statistics (24 Hours)`);
  md.push(`- **Total Readings:** ${report.statistics.readingsCount}`);
  md.push(`- **Average Soil Moisture:** ${report.statistics.avgSoilMoisture.toFixed(1)}%`);
  md.push(`- **Average Temperature:** ${report.statistics.avgTemperature.toFixed(1)}°C`);
  if (report.statistics.avgHumidity > 0) {
    md.push(`- **Average Humidity:** ${report.statistics.avgHumidity.toFixed(1)}%`);
  }
  md.push(`- **Total Rainfall:** ${report.statistics.totalRainfall.toFixed(2)} mm`);
  if (report.statistics.avgLightIntensity > 0) {
    md.push(`- **Average Light Intensity:** ${report.statistics.avgLightIntensity.toFixed(1)}`);
  }
  md.push(`- **Average Plant Health:** ${report.statistics.avgPlantHealth.toFixed(1)}%\n`);

  md.push(`## Parameter-wise Status`);
  for (const param of report.parameterWiseStatus) {
    const statusEmoji = param.status === 'normal' ? '✅' : param.status === 'warning' ? '⚠️' : '🚨';
    md.push(`- **${param.displayName}:** ${param.avgValue.toFixed(1)} ${statusEmoji} (${param.status})`);
  }
  md.push('');

  if (report.criticalEvents.length > 0) {
    md.push(`## Critical Events (${report.criticalEvents.length})`);
    const eventsToShow = report.criticalEvents.slice(0, 10); // Show top 10
    for (const event of eventsToShow) {
      const time = event.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const emoji = event.status === 'critical' ? '🚨' : '⚠️';
      md.push(`- ${emoji} **${time}** - ${event.message}`);
    }
    md.push('');
  } else {
    md.push(`## Critical Events\nNo critical events recorded today. ✅\n`);
  }

  md.push(`## Recommendations`);
  for (let i = 0; i < report.recommendations.length; i++) {
    md.push(`${i + 1}. ${report.recommendations[i]}`);
  }
  md.push('');

  md.push(`---`);
  md.push(`*Report generated automatically at ${new Date().toLocaleString()}*`);

  return md.join('\n');
}
