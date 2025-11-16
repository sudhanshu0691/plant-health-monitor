# Testing Guide - Agro Monitoring System

## 🧪 How to Test the System

### Method 1: Using Real Sensor Data (Production)

If you have IoT sensors sending data to Firebase:

1. **Configure your sensors** to send data in this format:
```json
{
  "timestamp": "2025-11-16T10:00:00Z",
  "temp": 45.5,
  "soil": 55.3,
  "rain": 15.2,
  "plant_health": 85.7,
  "humidity": 60.0,
  "light_intensity": 70.0
}
```

2. **Verify data flow**:
   - Open Firebase Console
   - Navigate to Firestore
   - Check `sensor_data` collection
   - Ensure documents are being added

3. **Test the dashboard**:
   - Open `/firebase-dashboard`
   - Enable notifications
   - Watch for real-time updates

### Method 2: Manual Firebase Console Entry (Quick Test)

1. **Open Firebase Console**:
   - Go to https://console.firebase.google.com
   - Select your project
   - Navigate to Firestore Database

2. **Add Test Documents**:

**Normal Reading** (No alerts):
```json
{
  "timestamp": [Current Timestamp],
  "temp": 50,
  "soil": 55,
  "rain": 20,
  "plant_health": 85,
  "humidity": 55,
  "light_intensity": 65,
  "doc_number": 1
}
```

**Warning Reading** (Yellow alerts):
```json
{
  "timestamp": [Current Timestamp],
  "temp": 35,
  "soil": 72,
  "rain": 50,
  "plant_health": 60,
  "humidity": 75,
  "light_intensity": 45,
  "doc_number": 2
}
```

**Critical Reading** (Red alerts):
```json
{
  "timestamp": [Current Timestamp],
  "temp": 20,
  "soil": 20,
  "rain": 80,
  "plant_health": 30,
  "humidity": 20,
  "light_intensity": 25,
  "doc_number": 3
}
```

3. **Watch for Results**:
   - Check dashboard for color changes
   - Look for toast notifications (if enabled)
   - Status badges should update

### Method 3: Sample Data Generator (Automated Testing)

Use the built-in sample data generator:

1. **Open Browser Console** on the dashboard page

2. **Run Test Scenarios**:

```javascript
// Load the test data generator
// (It's automatically available in the browser console)

// Test 1: Generate 20 normal readings (should show all green)
await AgroTestData.TestScenarios.testNormal()

// Test 2: Generate 10 warning readings (should trigger yellow alerts)
await AgroTestData.TestScenarios.testWarnings()

// Test 3: Generate 5 critical readings (should trigger red alerts)
await AgroTestData.TestScenarios.testCritical()

// Test 4: Generate full 24-hour realistic data
await AgroTestData.TestScenarios.test24Hours()
```

## 📋 Test Checklist

### ✅ Dashboard Tests

- [ ] **Page loads without errors**
- [ ] **Status cards display correctly**
- [ ] **All 4 parameter cards visible**
- [ ] **Loading states work**
- [ ] **Data refreshes automatically**
- [ ] **Status badges show correct colors**
- [ ] **Charts render properly**
- [ ] **Notification toggle works**
- [ ] **Analysis page link works**

### ✅ Notification Tests

- [ ] **No alerts for normal readings**
- [ ] **Yellow toast for warning readings**
- [ ] **Red toast for critical readings**
- [ ] **Alerts show current values**
- [ ] **Alerts include recommendations**
- [ ] **5-minute cooldown works**
- [ ] **Multiple alerts batch correctly**
- [ ] **Toggle on/off works**

### ✅ Analysis Page Tests

- [ ] **Page loads correctly**
- [ ] **Date selector works**
- [ ] **Health score displays (0-100)**
- [ ] **Status shows (Healthy/Moderate/Poor)**
- [ ] **Charts render with data**
- [ ] **All 4 tabs work**
- [ ] **Statistics are accurate**
- [ ] **Critical events show**
- [ ] **Recommendations display**
- [ ] **Download report works**
- [ ] **Auto-refresh works**
- [ ] **Historical dates work**

## 🎯 Testing Scenarios

### Scenario 1: Normal Operation (All Green)

**Test Data:**
```json
{
  "temp": 50,
  "soil": 55,
  "rain": 20,
  "plant_health": 85
}
```

**Expected Results:**
- ✅ All cards show green backgrounds
- ✅ All badges show ✅
- ✅ Status text says "Normal"
- ✅ No notifications appear
- ✅ Health score > 70

### Scenario 2: Warning Conditions (Yellow)

**Test Data:**
```json
{
  "temp": 35,
  "soil": 72,
  "rain": 50,
  "plant_health": 60
}
```

**Expected Results:**
- ⚠️ Cards show yellow backgrounds
- ⚠️ Badges show ⚠️
- ⚠️ Status text says "Warning"
- ⚠️ Yellow toast notifications appear
- ⚠️ Recommendations shown
- ⚠️ Health score 40-70

### Scenario 3: Critical Conditions (Red)

**Test Data:**
```json
{
  "temp": 20,
  "soil": 20,
  "rain": 80,
  "plant_health": 30
}
```

**Expected Results:**
- 🚨 Cards show red backgrounds
- 🚨 Badges show 🚨
- 🚨 Status text says "Critical"
- 🚨 Red toast notifications appear
- 🚨 Urgent actions shown
- 🚨 Health score < 40

### Scenario 4: Mixed Conditions

**Test Data:**
```json
{
  "temp": 55,     // Normal
  "soil": 20,     // Critical
  "rain": 10,     // Normal
  "plant_health": 50  // Warning
}
```

**Expected Results:**
- 🎨 Mixed card colors
- 🎨 2 alerts (1 critical, 1 warning)
- 🎨 Critical alert shown first
- 🎨 Health score reflects mix

## 🔍 Verification Steps

### 1. Check Parameter Status

For each parameter value, verify:

**Temperature:**
- 40-60 = Normal (Green)
- 25-40 or 60-75 = Warning (Yellow)
- <25 or >75 = Critical (Red)

**Soil Moisture:**
- 40-70 = Normal (Green)
- 25-40 or 70-85 = Warning (Yellow)
- <25 or >85 = Critical (Red)

**Rainfall:**
- 0-40 = Normal (Green)
- 40-70 = Warning (Yellow)
- 70-100 = Critical (Red)

**Plant Health:**
- 70-100 = Normal (Green)
- 40-70 = Warning (Yellow)
- <40 = Critical (Red)

### 2. Check Notification Content

Each notification should have:
- ✅ Parameter icon (🌡️, 🌱, 🌧️, 🌿)
- ✅ Alert message
- ✅ Current value
- ✅ Action recommendation
- ✅ Correct color (yellow/red)
- ✅ Correct duration (8s/10s)

### 3. Check Health Report

Daily report should include:
- ✅ Date
- ✅ Overall health score (0-100)
- ✅ Overall status (Healthy/Moderate/Poor)
- ✅ 24-hour statistics
- ✅ Parameter-wise status
- ✅ Critical events timeline
- ✅ Recommendations
- ✅ Graphs/charts

## 🐛 Common Issues & Solutions

### Issue: No notifications appearing

**Solutions:**
1. Click "Notifications On" button
2. Check browser allows notifications
3. Verify new data is being added to Firestore
4. Check console for errors
5. Wait for data update (notifications only on new data)

### Issue: Charts not rendering

**Solutions:**
1. Check if data has timestamp field
2. Verify Chart.js is installed: `npm list chart.js`
3. Check console for Chart.js errors
4. Ensure at least 2 data points exist

### Issue: Wrong status colors

**Solutions:**
1. Verify data values are 0-100 normalized
2. Check threshold definitions in `agroMonitoring.ts`
3. Console.log the parameter status
4. Verify getParameterStatus() is working

### Issue: Analysis page shows no data

**Solutions:**
1. Check selected date has data in Firestore
2. Verify timestamp field is correct type
3. Check Firestore rules allow reads
4. Look for errors in browser console

### Issue: Download report not working

**Solutions:**
1. Check browser allows downloads
2. Verify report data is generated
3. Check console for markdown generation errors
4. Try different browser

## 📊 Sample Test Data Sets

### Test Set 1: Perfect Day (All Normal)
```javascript
const perfectDay = {
  temp: 50, soil: 55, rain: 20, plant_health: 85,
  humidity: 55, light_intensity: 65
};
```

### Test Set 2: Hot Day (Temperature Warning)
```javascript
const hotDay = {
  temp: 68, soil: 55, rain: 20, plant_health: 80,
  humidity: 50, light_intensity: 75
};
```

### Test Set 3: Drought Conditions (Critical)
```javascript
const drought = {
  temp: 78, soil: 18, rain: 5, plant_health: 35,
  humidity: 22, light_intensity: 85
};
```

### Test Set 4: Rainy Season (Rain Warning)
```javascript
const rainy = {
  temp: 45, soil: 75, rain: 55, plant_health: 65,
  humidity: 78, light_intensity: 40
};
```

### Test Set 5: Night Time (Mixed)
```javascript
const night = {
  temp: 38, soil: 60, rain: 15, plant_health: 75,
  humidity: 65, light_intensity: 25
};
```

## 🎓 Testing Best Practices

1. **Test incrementally**
   - Start with normal readings
   - Add warnings gradually
   - Test critical last

2. **Test in sequence**
   - Normal → Warning → Critical → Back to Normal
   - Verify transitions work correctly

3. **Test cooldown period**
   - Send same critical reading twice
   - Should only see one notification within 5 minutes

4. **Test multiple parameters**
   - Mix of normal, warning, and critical
   - Verify batching works

5. **Test historical data**
   - Add data for past dates
   - Verify analysis page shows correctly

6. **Test edge cases**
   - Exactly on threshold values
   - Very high/low values
   - Missing optional fields

## 📝 Test Report Template

```markdown
## Test Report - [Date]

### Dashboard Tests
- [ ] All cards display: PASS/FAIL
- [ ] Status colors correct: PASS/FAIL
- [ ] Real-time updates: PASS/FAIL
- [ ] Notifications work: PASS/FAIL

### Analysis Page Tests
- [ ] Health score accurate: PASS/FAIL
- [ ] Charts render: PASS/FAIL
- [ ] Events show: PASS/FAIL
- [ ] Download works: PASS/FAIL

### Notification Tests
- [ ] Warning alerts: PASS/FAIL
- [ ] Critical alerts: PASS/FAIL
- [ ] Cooldown works: PASS/FAIL
- [ ] Batching works: PASS/FAIL

### Issues Found
1. [Description]
2. [Description]

### Notes
[Any additional observations]
```

## 🚀 Automated Testing (Future)

Consider adding:
- Unit tests for threshold calculations
- Integration tests for Firebase
- E2E tests with Playwright/Cypress
- Performance tests for large datasets

## ✅ Final Verification

Before deploying to production:

1. ✅ All test scenarios pass
2. ✅ No console errors
3. ✅ Notifications work reliably
4. ✅ Charts render correctly
5. ✅ Reports download successfully
6. ✅ Real-time updates work
7. ✅ Historical data accessible
8. ✅ Mobile responsive
9. ✅ Dark mode works
10. ✅ Documentation complete

---

**Happy Testing! 🌱**

For issues, see `AGRO_MONITORING_GUIDE.md` Troubleshooting section.
