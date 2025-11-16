# Quick Start Guide - Agro Monitoring System

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
# or
pnpm install
```

### Step 2: Start Development Server
```bash
npm run dev
# or
pnpm dev
```

### Step 3: Access the Application
Open your browser and navigate to:
- **Main Dashboard**: http://localhost:3000/firebase-dashboard
- **Analysis Page**: http://localhost:3000/analysis

## 📋 What You'll See

### Firebase Dashboard (`/firebase-dashboard`)
- ✅ 4 real-time monitoring cards (Temperature, Rainfall, Soil Moisture, Plant Health)
- ✅ Status badges showing Normal (✅), Warning (⚠️), or Critical (🚨)
- ✅ Toggle button to enable/disable notifications
- ✅ Link to view detailed analysis
- ✅ Real-time chart showing sensor data trends

### Analysis Page (`/analysis`)
- ✅ Overall health score (0-100)
- ✅ Date selector to view historical data
- ✅ 24-hour parameter trend charts
- ✅ Summary statistics
- ✅ Parameter-wise status breakdown
- ✅ Critical events timeline
- ✅ Actionable recommendations
- ✅ Download report as Markdown

## 🔔 Testing Notifications

### To See Notifications in Action:

1. **Go to Firebase Dashboard** (`/firebase-dashboard`)

2. **Enable Notifications** - Click "Notifications On" button

3. **Wait for Data Updates** - The system checks every time new data arrives

4. **Simulate Different Scenarios** (add test data to Firestore):

**Normal Scenario (No Alerts):**
```json
{
  "timestamp": "2025-11-16T10:00:00Z",
  "temp": 50,
  "soil": 55,
  "rain": 20,
  "plant_health": 85
}
```

**Warning Scenario (Yellow Toast):**
```json
{
  "timestamp": "2025-11-16T10:05:00Z",
  "temp": 35,  // Warning range
  "soil": 72,  // Warning range
  "rain": 50,  // Warning range
  "plant_health": 60  // Warning range
}
```

**Critical Scenario (Red Toast):**
```json
{
  "timestamp": "2025-11-16T10:10:00Z",
  "temp": 20,  // Critical!
  "soil": 20,  // Critical!
  "rain": 80,  // Critical!
  "plant_health": 30  // Critical!
}
```

## 📊 Parameter Ranges (Quick Reference)

| Parameter | Normal | Warning | Critical |
|-----------|--------|---------|----------|
| **Soil Moisture** | 40-70 | 25-40 or 70-85 | <25 or >85 |
| **Temperature** | 40-60 | 25-40 or 60-75 | <25 or >75 |
| **Rainfall** | 0-40 | 40-70 | 70-100 |
| **Plant Health** | 70-100 | 40-70 | <40 |

## 🎯 Key Features to Try

### 1. Real-time Monitoring
- Watch status cards update automatically
- See color changes as values change
- Toggle notifications on/off

### 2. Daily Analysis
- Select different dates
- View historical trends
- Check critical events timeline
- Download reports

### 3. Notifications
- Receive warning alerts (yellow)
- Receive critical alerts (red)
- See action recommendations
- Experience 5-minute cooldown

## 📱 User Interface Tour

### Dashboard Status Cards
```
🌡️ Temperature     ⚠️ Warning
   45.5°C
   
🌧️ Rainfall       ✅ Normal
   15.2 mm
   
🌱 Soil Moisture   🚨 Critical
   20.0%
   
🌿 Plant Health    ✅ Normal
   85.7%
```

### Notification Examples

**Warning Notification:**
```
⚠️ Attention needed: Soil Moisture is moving out of the ideal range.

🌱 Current Value: 35.0

Recommended Action: Monitor soil moisture. Supplement with irrigation if needed.
```

**Critical Notification:**
```
🚨 Critical alert: Temperature has reached a dangerous level!

🌡️ Current Value: 20.0

Action Required: Protect plants from cold. Consider using greenhouse or covers.
```

## 🔍 Troubleshooting

### No Data Showing?
1. Check Firestore has data in `sensor_data` collection
2. Verify Firebase configuration in `lib/firebase.ts`
3. Check browser console for errors

### Notifications Not Appearing?
1. Click "Notifications On" button
2. Check browser allows notifications
3. Ensure data is updating in Firestore

### Charts Not Loading?
1. Verify chart.js dependencies installed
2. Check console for Chart.js errors
3. Ensure data has timestamp field

## 📚 Next Steps

1. **Read Full Documentation**: See `AGRO_MONITORING_GUIDE.md`
2. **View Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
3. **Customize Thresholds**: Edit `lib/agroMonitoring.ts`
4. **Adjust Weights**: Modify `lib/dailyAnalysis.ts`

## 🎓 Common Use Cases

### Morning Routine
1. Open dashboard
2. Enable notifications
3. Check overall status
4. Review any overnight alerts

### Daily Review
1. Go to analysis page
2. Check health score
3. Review critical events
4. Follow recommendations
5. Download report

### Alert Response
1. Receive notification
2. Check current value
3. Read recommendation
4. Take action
5. Monitor changes

## 💡 Tips

- **Enable notifications** during active farming hours
- **Check analysis page** daily for trends
- **Download reports** weekly for records
- **Respond to critical alerts** immediately
- **Review warnings** within 1-2 hours

## 🔧 Configuration

All settings can be adjusted in:
- `lib/agroMonitoring.ts` - Parameter thresholds
- `contexts/NotificationContext.tsx` - Alert cooldown
- `lib/dailyAnalysis.ts` - Health score weights

## ✅ Success Checklist

- [ ] Installation complete
- [ ] Server running on localhost:3000
- [ ] Dashboard accessible
- [ ] Analysis page accessible
- [ ] Real-time data updating
- [ ] Notifications working
- [ ] Status cards showing correct colors
- [ ] Charts rendering properly
- [ ] Reports downloadable

## 📞 Need Help?

1. Check `AGRO_MONITORING_GUIDE.md` for detailed docs
2. Review `IMPLEMENTATION_SUMMARY.md` for technical details
3. Check browser console for errors
4. Verify Firebase connection

---

**Ready to monitor your plants! 🌱**

Start with the dashboard at: http://localhost:3000/firebase-dashboard
