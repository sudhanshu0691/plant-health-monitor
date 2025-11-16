// lib/agroMonitoring.ts
// Agro Monitoring Parameters (0-100 normalized scale)

export interface ParameterThresholds {
  normal: { min: number; max: number };
  warning: { min: number; max: number }[];
  critical: { min: number; max: number }[];
}

export interface SensorReading {
  temp: number;
  rain: number;
  soil: number;
  plant_health: number;
  humidity?: number;
  light_intensity?: number;
  timestamp: any;
}

export type ParameterStatus = 'normal' | 'warning' | 'critical';

export interface ParameterAlert {
  parameter: string;
  value: number;
  status: ParameterStatus;
  message: string;
  action?: string;
  icon: string;
}

// Parameter thresholds based on 0-100 normalized scale
export const PARAMETER_THRESHOLDS: Record<string, ParameterThresholds> = {
  soil: {
    normal: { min: 40, max: 70 },
    warning: [
      { min: 25, max: 40 },
      { min: 70, max: 85 }
    ],
    critical: [
      { min: 0, max: 25 },
      { min: 85, max: 100 }
    ]
  },
  temp: {
    normal: { min: 40, max: 60 },
    warning: [
      { min: 25, max: 40 },
      { min: 60, max: 75 }
    ],
    critical: [
      { min: 0, max: 25 },
      { min: 75, max: 100 }
    ]
  },
  rain: {
    normal: { min: 0, max: 40 },
    warning: [{ min: 40, max: 70 }],
    critical: [{ min: 70, max: 100 }]
  },
  plant_health: {
    normal: { min: 70, max: 100 },
    warning: [{ min: 40, max: 70 }],
    critical: [{ min: 0, max: 40 }]
  },
  humidity: {
    normal: { min: 40, max: 70 },
    warning: [
      { min: 25, max: 40 },
      { min: 70, max: 85 }
    ],
    critical: [
      { min: 0, max: 25 },
      { min: 85, max: 100 }
    ]
  },
  light_intensity: {
    normal: { min: 50, max: 80 },
    warning: [
      { min: 30, max: 50 },
      { min: 80, max: 90 }
    ],
    critical: [
      { min: 0, max: 30 },
      { min: 90, max: 100 }
    ]
  }
};

/**
 * Determine parameter status based on value and thresholds
 */
export function getParameterStatus(
  parameter: string,
  value: number
): ParameterStatus {
  const thresholds = PARAMETER_THRESHOLDS[parameter];
  if (!thresholds) return 'normal';

  // Check critical ranges
  for (const range of thresholds.critical) {
    if (value >= range.min && value <= range.max) {
      return 'critical';
    }
  }

  // Check warning ranges
  for (const range of thresholds.warning) {
    if (value >= range.min && value <= range.max) {
      return 'warning';
    }
  }

  // Check normal range
  if (value >= thresholds.normal.min && value <= thresholds.normal.max) {
    return 'normal';
  }

  return 'normal';
}

/**
 * Get parameter-specific recommendations
 */
export function getParameterRecommendation(
  parameter: string,
  value: number,
  status: ParameterStatus
): string {
  if (status === 'normal') {
    return `${parameter} levels are optimal.`;
  }

  const recommendations: Record<string, Record<string, string>> = {
    soil: {
      low: 'Water the soil immediately. Check irrigation system.',
      high: 'Reduce watering. Improve drainage to prevent waterlogging.'
    },
    temp: {
      low: 'Protect plants from cold. Consider using greenhouse or covers.',
      high: 'Provide shade. Increase ventilation. Consider misting systems.'
    },
    rain: {
      low: 'Monitor soil moisture. Supplement with irrigation if needed.',
      high: 'Ensure proper drainage. Protect from excessive water damage.'
    },
    plant_health: {
      low: 'Inspect for pests/diseases. Check nutrient levels. Review watering schedule.',
      high: ''
    },
    humidity: {
      low: 'Increase humidity through misting or humidifiers.',
      high: 'Improve air circulation. Reduce watering frequency.'
    },
    light_intensity: {
      low: 'Increase light exposure. Move plants or add grow lights.',
      high: 'Provide shade during peak hours. Protect from direct sunlight.'
    }
  };

  const paramRec = recommendations[parameter];
  if (!paramRec) return 'Monitor conditions closely.';

  const threshold = PARAMETER_THRESHOLDS[parameter];
  if (value < threshold.normal.min) {
    return paramRec.low || 'Increase levels gradually.';
  } else {
    return paramRec.high || 'Reduce levels gradually.';
  }
}

/**
 * Get display name for parameter
 */
export function getParameterDisplayName(parameter: string): string {
  const names: Record<string, string> = {
    soil: 'Soil Moisture',
    temp: 'Temperature',
    rain: 'Rainfall',
    plant_health: 'Plant Health Index',
    humidity: 'Humidity',
    light_intensity: 'Light Intensity'
  };
  return names[parameter] || parameter;
}

/**
 * Get icon for parameter
 */
export function getParameterIcon(parameter: string): string {
  const icons: Record<string, string> = {
    soil: '🌱',
    temp: '🌡️',
    rain: '🌧️',
    plant_health: '🌿',
    humidity: '💧',
    light_intensity: '☀️'
  };
  return icons[parameter] || '📊';
}

/**
 * Analyze sensor reading and generate alerts
 */
export function analyzeSensorReading(reading: SensorReading): ParameterAlert[] {
  const alerts: ParameterAlert[] = [];
  const parameters = ['soil', 'temp', 'rain', 'plant_health'];

  if (reading.humidity !== undefined) parameters.push('humidity');
  if (reading.light_intensity !== undefined) parameters.push('light_intensity');

  for (const param of parameters) {
    const value = reading[param as keyof SensorReading] as number;
    if (value === undefined) continue;

    const status = getParameterStatus(param, value);
    
    if (status !== 'normal') {
      const displayName = getParameterDisplayName(param);
      const action = getParameterRecommendation(param, value, status);
      
      let message = '';
      if (status === 'warning') {
        message = `⚠️ Attention needed: ${displayName} is moving out of the ideal range.`;
      } else if (status === 'critical') {
        message = `🚨 Critical alert: ${displayName} has reached a dangerous level!`;
      }

      alerts.push({
        parameter: param,
        value,
        status,
        message,
        action,
        icon: getParameterIcon(param)
      });
    }
  }

  return alerts;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get status text color for UI
 */
export function getStatusTextColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal':
      return 'text-green-600 dark:text-green-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Get status background color for UI
 */
export function getStatusBgColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal':
      return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
    case 'warning':
      return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
    case 'critical':
      return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
  }
}
