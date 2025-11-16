# 🌱 Plant Health Monitor - Automated Agro Monitoring System

## Overview

A comprehensive real-time plant health monitoring system with automated notifications and daily analysis reports. Built with Next.js, Firebase, and TypeScript.

## ✨ Key Features

### 🔔 Real-time Monitoring & Notifications
- **Automated Alerts**: Instant notifications when parameters leave optimal ranges
- **Smart Notifications**: 
  - 🟢 **Normal**: Silent monitoring (all optimal)
  - 🟡 **Warning**: 8-second alerts with recommendations
  - 🔴 **Critical**: 10-second urgent alerts with immediate actions
- **Intelligent Cooldown**: 5-minute cooldown prevents alert spam
- **Batch Alerts**: Multiple simultaneous issues grouped into single notification

### 📊 Daily Health Analysis
- **24-Hour Reports**: Comprehensive analysis of all sensor data
- **Health Score**: 0-100 weighted calculation based on all parameters
- **Trend Visualization**: Interactive charts showing parameter changes
- **Critical Events**: Timeline of all warning and critical incidents
- **Actionable Recommendations**: Specific steps to improve plant health
- **Export Reports**: Download as Markdown for record-keeping

### 📱 User Interface
- **Real-time Dashboard**: Live status monitoring with color-coded indicators
- **Analysis Page**: Detailed reports with historical data access
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode**: Full dark theme support
- **Intuitive Controls**: Toggle notifications, select dates, auto-refresh

## 🌡️ Monitored Parameters (0-100 Normalized Scale)

| Parameter | Normal | Warning | Critical | Unit |
|-----------|--------|---------|----------|------|
| **Soil Moisture** | 40-70 | 25-40, 70-85 | <25, >85 | % |
| **Temperature** | 40-60 | 25-40, 60-75 | <25, >75 | °C |
| **Rainfall** | 0-40 | 40-70 | 70-100 | mm |
| **Plant Health Index** | 70-100 | 40-70 | <40 | % |
| **Humidity** | 40-70 | 25-40, 70-85 | <25, >85 | % |
| **Light Intensity** | 50-80 | 30-50, 80-90 | <30, >90 | units |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Firebase project with Firestore enabled

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd plant-health-monitor

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

### Access the Application
- **Dashboard**: http://localhost:3000/firebase-dashboard
- **Analysis**: http://localhost:3000/analysis

## 📚 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Complete Guide](AGRO_MONITORING_GUIDE.md)** - Detailed documentation
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[Testing Guide](TESTING_GUIDE.md)** - How to test the system

## 🏗️ Architecture

```
app/
├── firebase-dashboard/     # Real-time monitoring page
│   └── page.tsx
├── analysis/               # Daily health reports page
│   └── page.tsx
└── layout.tsx             # App-wide providers

lib/
├── agroMonitoring.ts      # Parameter thresholds & alerts
├── dailyAnalysis.ts       # Health reports & statistics
├── firebase.ts            # Firebase configuration
└── sampleDataGenerator.ts # Testing utilities

contexts/
└── NotificationContext.tsx # Notification system

components/
├── firebase-graph.tsx     # Real-time charts
├── notification-settings.tsx # Notification controls
└── ui/                    # Shadcn/UI components
```

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Update `lib/firebase.ts` with your config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### Firestore Data Structure

Collection: `sensor_data`

```json
{
  "timestamp": Timestamp,
  "temp": 45.5,
  "rain": 15.2,
  "soil": 55.3,
  "plant_health": 85.7,
  "humidity": 60.0,
  "light_intensity": 70.0
}
```

### Customize Thresholds

Edit `lib/agroMonitoring.ts`:

```typescript
export const PARAMETER_THRESHOLDS = {
  soil: {
    normal: { min: 40, max: 70 },
    // Adjust as needed
  },
  // ...
};
```

## 🎯 Usage

### For Daily Monitoring

1. **Open Dashboard** (`/firebase-dashboard`)
2. **Enable Notifications** - Click notification toggle
3. **Monitor Status** - Watch real-time status cards
4. **Respond to Alerts** - Take action on warnings/critical alerts

### For Analysis & Reporting

1. **Open Analysis Page** (`/analysis`)
2. **Select Date** - View current or historical data
3. **Review Health Score** - Check overall status (0-100)
4. **Read Recommendations** - Follow suggested actions
5. **Download Report** - Export as Markdown

### Notification Examples

**Warning Alert:**
```
⚠️ Attention needed: Soil Moisture is moving out of ideal range.
🌱 Current Value: 35.0
Recommended Action: Monitor soil moisture. 
Supplement with irrigation if needed.
```

**Critical Alert:**
```
🚨 Critical alert: Temperature has reached a dangerous level!
🌡️ Current Value: 20.0
Action Required: Protect plants from cold. 
Consider using greenhouse or covers.
```

## 📊 Health Score Calculation

The overall health score (0-100) uses weighted averages:

- **Plant Health**: 35%
- **Soil Moisture**: 25%
- **Temperature**: 20%
- **Humidity**: 10%
- **Light Intensity**: 5%
- **Rainfall**: 5%

**Score Interpretation:**
- **90-100**: Excellent - All parameters optimal
- **70-89**: Good - Minor adjustments may be needed
- **50-69**: Moderate - Attention required
- **Below 50**: Poor - Immediate action required

## 🧪 Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing instructions.

**Quick Test:**
1. Open browser console on dashboard
2. Run: `AgroTestData.TestScenarios.testNormal()`
3. Watch for notifications and status changes

## 🔔 Notification Behavior

### Trigger Rules
- **Normal Range**: No notifications (silent)
- **Warning Range**: Immediate yellow toast (8 seconds)
- **Critical Range**: Immediate red toast (10 seconds)

### Smart Features
- **Cooldown**: 5-minute cooldown per parameter prevents spam
- **Batching**: Multiple alerts grouped into single notification
- **Priority**: Critical alerts always shown before warnings
- **Actions**: Every alert includes specific recommendations

## 📈 Daily Reports

### Auto-Generated Report Sections

1. **Summary**: Overall health score and status
2. **24-Hour Statistics**: Averages and totals
3. **Parameter Status**: Individual parameter analysis
4. **Critical Events**: Timeline of all incidents
5. **Recommendations**: Prioritized action items
6. **Overall Status**: Status-specific guidance

### Report Download
- Click "Download Report" button
- Saves as Markdown file
- Format: `plant-health-report-YYYY-MM-DD.md`

## 🎨 UI Components

### Status Indicators
- 🟢 **Green**: Normal - All conditions optimal
- 🟡 **Yellow**: Warning - Needs attention
- 🔴 **Red**: Critical - Urgent action required

### Dashboard Cards
Each parameter card shows:
- Current value
- Status badge (✅/⚠️/🚨)
- Status text
- Color-coded background

### Analysis Charts
- 24-hour trend lines
- Multiple parameters overlaid
- Interactive tooltips
- Responsive sizing

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript
- **Database**: Firebase Firestore
- **UI Library**: Shadcn/UI + Radix UI
- **Charts**: Chart.js + react-chartjs-2
- **Notifications**: Sonner
- **Styling**: Tailwind CSS

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security

- Firebase rules should be configured for production
- Sensitive data should use environment variables
- API keys should be restricted in Firebase Console

## 🐛 Troubleshooting

See [AGRO_MONITORING_GUIDE.md](AGRO_MONITORING_GUIDE.md) for detailed troubleshooting.

**Common Issues:**
- **No notifications**: Check "Notifications On" is enabled
- **No data**: Verify Firestore has data in `sensor_data` collection
- **Charts not loading**: Check Chart.js installation
- **Wrong colors**: Verify data is 0-100 normalized

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 👏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
- Backend by [Firebase](https://firebase.google.com/)

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: Submit on GitHub Issues
- **Questions**: Check [AGRO_MONITORING_GUIDE.md](AGRO_MONITORING_GUIDE.md)

## 🗺️ Roadmap

- [ ] SMS/Email notifications
- [ ] Weather API integration
- [ ] Multi-farm support
- [ ] Mobile app (React Native)
- [ ] ML-based predictions
- [ ] Automated irrigation triggers
- [ ] Custom alert thresholds per crop
- [ ] Export to PDF/CSV

## 📸 Screenshots

### Dashboard
Real-time monitoring with color-coded status cards, live charts, and notification controls.

### Analysis Page
Comprehensive 24-hour reports with health scores, trends, events timeline, and recommendations.

### Notifications
Toast notifications with current values and action recommendations.

---

**Start monitoring your plants today! 🌱**

For quick start: See [QUICK_START.md](QUICK_START.md)
