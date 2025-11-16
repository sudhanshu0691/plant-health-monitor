# Agro Monitoring & Automated Notification System

## Overview

This system provides automated plant health monitoring, real-time notifications, and daily analysis reports based on normalized sensor parameters (0-100 scale).

## Features

### 🔔 Automated Notification System
- **Real-time Alerts**: Automatically triggered when parameters leave normal ranges
- **Status-based Notifications**:
  - **Normal (Green)**: All conditions optimal (no notifications unless summary mode)
  - **Warning (Yellow)**: Parameter moving out of ideal range
  - **Critical (Red)**: Parameter reached dangerous level with urgent alerts
- **Smart Cooldown**: 5-minute cooldown between duplicate alerts to prevent spam
- **Action Recommendations**: Each alert includes specific actions to take

### 📊 Daily Health Analysis
- **24-Hour Data Collection**: Aggregates all readings from the last 24 hours
- **Comprehensive Statistics**:
  - Average Soil Moisture (0-100)
  - Average Temperature (0-100 normalized)
  - Average Humidity
  - Total Rainfall + normalized values
  - Light exposure score
  - Daily Plant Health Index (0-100)
- **Overall Health Score**: Weighted calculation based on all parameters
- **Critical Events Timeline**: Records all warning and critical events
- **Automated Report Generation**: Daily reports saved and displayed

### 🌱 Agro Monitoring Parameters (0-100 Normalized Scale)

| Parameter | Normal (Green) | Warning (Yellow) | Critical (Red) |
|-----------|----------------|------------------|----------------|
| Soil Moisture | 40-70 | 25-40 or 70-85 | <25 or >85 |
| Temperature | 40-60 | 25-40 or 60-75 | <25 or >75 |
| Rainfall | 0-40 | 40-70 | 70-100 |
| Plant Health Index | 70-100 | 40-70 | <40 |
| Humidity | 40-70 | 25-40 or 70-85 | <25 or >85 |
| Light Intensity | 50-80 | 30-50 or 80-90 | <30 or >90 |

## File Structure

```
lib/
├── agroMonitoring.ts          # Parameter thresholds, status calculation, alerts
├── dailyAnalysis.ts            # 24-hour statistics, health reports
└── firebase.ts                 # Firebase configuration

contexts/
└── NotificationContext.tsx     # Notification system with toast alerts

app/
├── firebase-dashboard/
│   └── page.tsx               # Real-time monitoring with notifications
└── analysis/
    └── page.tsx               # Daily health analysis & reports
```

## Components

### 1. Parameter Threshold System (`lib/agroMonitoring.ts`)

**Key Functions:**
- `getParameterStatus(parameter, value)`: Determines if value is normal/warning/critical
- `analyzeSensorReading(reading)`: Analyzes all parameters and returns alerts
- `getParameterRecommendation(parameter, value, status)`: Returns action recommendations

**Example Usage:**
```typescript
import { analyzeSensorReading } from '@/lib/agroMonitoring';

const reading = {
  temp: 45,
  rain: 15,
  soil: 35,
  plant_health: 65,
  timestamp: new Date()
};

const alerts = analyzeSensorReading(reading);
// Returns array of alerts for parameters out of normal range
```

### 2. Daily Analysis System (`lib/dailyAnalysis.ts`)

**Key Functions:**
- `calculateDailyStatistics(readings)`: Computes 24-hour averages
- `extractCriticalEvents(readings)`: Identifies all warning/critical events
- `calculateOverallHealthScore(stats)`: Weighted health score (0-100)
- `generateDailyHealthReport(readings, date)`: Creates complete report
- `formatReportAsMarkdown(report)`: Exports report as markdown

**Health Score Calculation:**
```
Overall Health Score = Weighted Average of:
- Plant Health: 35%
- Soil Moisture: 25%
- Temperature: 20%
- Humidity: 10%
- Light Intensity: 5%
- Rainfall: 5%
```

### 3. Notification System (`contexts/NotificationContext.tsx`)

**Features:**
- Toast-based notifications using `sonner`
- Automatic alert cooldown (5 minutes)
- Multiple alert batching
- Status-specific styling (error for critical, warning for yellow)

**Example Usage:**
```typescript
const { sendParameterAlert, sendMultipleAlerts } = useNotifications();

// Send single alert
sendParameterAlert({
  parameter: 'soil',
  value: 20,
  status: 'critical',
  message: 'Critical: Soil moisture too low',
  action: 'Water the soil immediately',
  icon: '🌱'
});

// Send multiple alerts
sendMultipleAlerts(alerts);
```

## Pages

### Firebase Dashboard (`/firebase-dashboard`)

**Features:**
- Real-time sensor monitoring
- Live status indicators with color coding
- Toggle notifications on/off
- Automatic alert triggering on data updates
- Link to analysis page

**Status Indicators:**
- Green background + ✅ badge: Normal
- Yellow background + ⚠️ badge: Warning
- Red background + 🚨 badge: Critical

### Analysis Page (`/analysis`)

**Features:**
- Date selector for historical data
- 24-hour parameter trend charts
- Overall health score (0-100)
- Parameter-wise status breakdown
- Critical events timeline
- Actionable recommendations
- Download report as Markdown
- Auto-refresh every 5 minutes (for current day)

**Tabs:**
1. **Overview**: Charts + summary statistics
2. **Parameters**: Detailed parameter status
3. **Events**: Critical events timeline
4. **Recommendations**: Actions to take

## Notification Rules

### Normal (Green) Range
- **Trigger**: No automatic notification
- **Display**: Green status indicator
- **Message**: "All conditions are optimal"

### Warning (Yellow) Range
- **Trigger**: Immediate notification
- **Display**: Yellow toast notification
- **Duration**: 8 seconds
- **Content**:
  - Parameter name and current value
  - "Attention needed: parameter is moving out of ideal range"
  - Recommended action

### Critical (Red) Range
- **Trigger**: Urgent notification
- **Display**: Red toast notification
- **Duration**: 10 seconds
- **Content**:
  - Parameter name and current value
  - "Critical alert: parameter has reached a dangerous level"
  - Immediate action required

### Alert Frequency
- Notifications trigger every time data is updated (typically every 5 minutes)
- 5-minute cooldown prevents duplicate alerts for same parameter
- Multiple simultaneous alerts are batched into single notification

## Daily Health Report Format

```markdown
# Daily Plant Health Report
**Date:** [Full Date]

## Overall Health Score: XX/100
**Status:** [Healthy/Moderate/Poor] [Emoji]

## Summary Statistics (24 Hours)
- Total Readings: XXX
- Average Soil Moisture: XX.X%
- Average Temperature: XX.X°C
- Average Humidity: XX.X%
- Total Rainfall: XX.XX mm
- Average Light Intensity: XX.X
- Average Plant Health: XX.X%

## Parameter-wise Status
- Soil Moisture: XX.X ✅ (normal)
- Temperature: XX.X ⚠️ (warning)
- ...

## Critical Events (X)
- 🚨 HH:MM - [Event message]
- ⚠️ HH:MM - [Event message]
- ...

## Recommendations
1. [Action item 1]
2. [Action item 2]
...

## Overall Health Status
[Status-specific message and guidance]

---
*Report generated automatically at [timestamp]*
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Configure Firebase
Update `lib/firebase.ts` with your Firebase configuration:
```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};
```

### 3. Firestore Data Structure
Expected collection: `sensor_data`

Document format:
```json
{
  "timestamp": Timestamp,
  "temp": 45.5,        // Temperature (0-100 normalized)
  "rain": 15.2,        // Rainfall (0-100 normalized)
  "soil": 55.3,        // Soil moisture (0-100)
  "plant_health": 85.7, // Plant health index (0-100)
  "humidity": 60.0,     // Optional: Humidity (0-100)
  "light_intensity": 70.0 // Optional: Light (0-100)
}
```

### 4. Run Development Server
```bash
npm run dev
# or
pnpm dev
```

### 5. Access Pages
- **Dashboard**: `http://localhost:3000/firebase-dashboard`
- **Analysis**: `http://localhost:3000/analysis`

## Usage Guide

### Enabling/Disabling Notifications
1. Navigate to Firebase Dashboard
2. Click the "Notifications On/Off" button in top right
3. Enabled notifications will trigger on every data update

### Viewing Daily Reports
1. Navigate to Analysis page
2. Select date using date picker
3. View comprehensive health report
4. Download report as Markdown if needed

### Understanding Health Scores

**90-100**: Excellent condition
- All parameters in optimal range
- Continue current care routine

**70-89**: Good condition
- Minor adjustments may be needed
- Monitor specific parameters

**50-69**: Moderate condition
- Attention required
- Follow recommendations

**Below 50**: Poor condition
- Immediate action required
- Review all critical parameters

## Customization

### Adjusting Parameter Thresholds
Edit `lib/agroMonitoring.ts` → `PARAMETER_THRESHOLDS`:
```typescript
export const PARAMETER_THRESHOLDS = {
  soil: {
    normal: { min: 40, max: 70 },  // Modify ranges
    warning: [/* ... */],
    critical: [/* ... */]
  },
  // ... other parameters
};
```

### Changing Alert Cooldown
Edit `contexts/NotificationContext.tsx`:
```typescript
const ALERT_COOLDOWN = 5 * 60 * 1000; // Change to desired milliseconds
```

### Modifying Health Score Weights
Edit `lib/dailyAnalysis.ts` → `calculateOverallHealthScore`:
```typescript
const weights = {
  plantHealth: 0.35,      // Adjust weights
  soilMoisture: 0.25,
  temperature: 0.20,
  // ... other weights
};
```

## Troubleshooting

### Notifications Not Appearing
1. Check browser notification permissions
2. Verify "Notifications On" button is active
3. Check console for errors
4. Ensure Firebase connection is active

### No Data in Analysis Page
1. Verify Firestore has data for selected date
2. Check Firebase rules allow read access
3. Inspect browser console for errors
4. Confirm timestamp field is properly formatted

### Health Score Seems Incorrect
1. Verify all sensor readings are normalized (0-100)
2. Check if optional parameters (humidity, light) are available
3. Review parameter weights in `calculateOverallHealthScore`

## Best Practices

### Data Collection
- Send sensor readings every 5 minutes for optimal monitoring
- Ensure all values are normalized to 0-100 scale
- Include timestamp with each reading
- Use Firebase Timestamp type for consistency

### Notification Management
- Enable notifications during active monitoring periods
- Use dashboard for real-time monitoring
- Check analysis page for historical trends
- Download daily reports for record-keeping

### Parameter Optimization
- Adjust thresholds based on specific crop requirements
- Monitor trends over multiple days
- Act on critical alerts immediately
- Review warning alerts within 1-2 hours

## API Reference

### Key Exports

**From `lib/agroMonitoring.ts`:**
- `PARAMETER_THRESHOLDS`: Threshold definitions
- `getParameterStatus(parameter, value)`: Get status
- `analyzeSensorReading(reading)`: Generate alerts
- `getParameterRecommendation(...)`: Get action items

**From `lib/dailyAnalysis.ts`:**
- `calculateDailyStatistics(readings)`: 24h stats
- `generateDailyHealthReport(readings, date)`: Full report
- `formatReportAsMarkdown(report)`: Export report

**From `contexts/NotificationContext.tsx`:**
- `sendParameterAlert(alert)`: Send single alert
- `sendMultipleAlerts(alerts)`: Send batch alerts
- `sendSuccessNotification(message)`: Success toast
- `sendInfoNotification(message)`: Info toast

## License

MIT

## Support

For issues or questions:
1. Check Troubleshooting section
2. Review Firebase console for data issues
3. Check browser console for errors
4. Verify all dependencies are installed
