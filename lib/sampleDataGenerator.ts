// scripts/generateSampleData.ts
/**
 * Sample Data Generator for Testing Agro Monitoring System
 * 
 * This script generates test sensor data with different scenarios:
 * - Normal readings (all parameters in optimal range)
 * - Warning readings (some parameters in warning range)
 * - Critical readings (some parameters in critical range)
 * - Mixed readings (combination of all)
 * 
 * Usage:
 * 1. Run this in your browser console on the Firebase dashboard page
 * 2. Or adapt it to run with Node.js and Firebase Admin SDK
 */

import { db, collection, getDocs, query, orderBy, limit } from '@/lib/firebase';
import { addDoc, Timestamp } from 'firebase/firestore';

interface SensorReading {
  temp: number;
  rain: number;
  soil: number;
  plant_health: number;
  humidity?: number;
  light_intensity?: number;
  timestamp: Timestamp;
}

/**
 * Generate random value within range
 */
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate normal readings (all parameters optimal)
 */
export function generateNormalReadings(count: number = 10): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 5 * 60 * 1000); // 5 min intervals
    
    readings.push({
      temp: randomInRange(40, 60),           // Normal: 40-60
      soil: randomInRange(40, 70),           // Normal: 40-70
      rain: randomInRange(0, 40),            // Normal: 0-40
      plant_health: randomInRange(70, 100),  // Normal: 70-100
      humidity: randomInRange(40, 70),       // Normal: 40-70
      light_intensity: randomInRange(50, 80), // Normal: 50-80
      timestamp: Timestamp.fromDate(timestamp)
    });
  }
  
  return readings;
}

/**
 * Generate warning readings (parameters in warning range)
 */
export function generateWarningReadings(count: number = 5): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 5 * 60 * 1000);
    
    readings.push({
      temp: Math.random() > 0.5 ? randomInRange(25, 40) : randomInRange(60, 75),  // Warning ranges
      soil: Math.random() > 0.5 ? randomInRange(25, 40) : randomInRange(70, 85),  // Warning ranges
      rain: randomInRange(40, 70),          // Warning: 40-70
      plant_health: randomInRange(40, 70),  // Warning: 40-70
      humidity: Math.random() > 0.5 ? randomInRange(25, 40) : randomInRange(70, 85),
      light_intensity: Math.random() > 0.5 ? randomInRange(30, 50) : randomInRange(80, 90),
      timestamp: Timestamp.fromDate(timestamp)
    });
  }
  
  return readings;
}

/**
 * Generate critical readings (parameters in critical range)
 */
export function generateCriticalReadings(count: number = 3): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (count - i) * 5 * 60 * 1000);
    
    readings.push({
      temp: Math.random() > 0.5 ? randomInRange(0, 25) : randomInRange(75, 100),   // Critical ranges
      soil: Math.random() > 0.5 ? randomInRange(0, 25) : randomInRange(85, 100),   // Critical ranges
      rain: randomInRange(70, 100),          // Critical: 70-100
      plant_health: randomInRange(0, 40),    // Critical: 0-40
      humidity: Math.random() > 0.5 ? randomInRange(0, 25) : randomInRange(85, 100),
      light_intensity: Math.random() > 0.5 ? randomInRange(0, 30) : randomInRange(90, 100),
      timestamp: Timestamp.fromDate(timestamp)
    });
  }
  
  return readings;
}

/**
 * Generate 24 hours of mixed readings
 */
export function generate24HourData(): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  // Generate reading every 5 minutes = 288 readings per 24 hours
  for (let i = 0; i < 288; i++) {
    const timestamp = new Date(startTime.getTime() + i * 5 * 60 * 1000);
    const hour = timestamp.getHours();
    
    // Simulate realistic daily patterns
    let reading: SensorReading;
    
    if (hour >= 6 && hour < 12) {
      // Morning - optimal conditions
      reading = {
        temp: randomInRange(45, 55),
        soil: randomInRange(50, 65),
        rain: randomInRange(0, 20),
        plant_health: randomInRange(80, 95),
        humidity: randomInRange(50, 65),
        light_intensity: randomInRange(60, 75),
        timestamp: Timestamp.fromDate(timestamp)
      };
    } else if (hour >= 12 && hour < 18) {
      // Afternoon - warmer, may need attention
      reading = {
        temp: randomInRange(55, 70),  // Higher temp
        soil: randomInRange(40, 55),   // Drying soil
        rain: randomInRange(0, 30),
        plant_health: randomInRange(70, 85),
        humidity: randomInRange(40, 55),
        light_intensity: randomInRange(70, 85),
        timestamp: Timestamp.fromDate(timestamp)
      };
    } else if (hour >= 18 && hour < 22) {
      // Evening - cooling down
      reading = {
        temp: randomInRange(45, 60),
        soil: randomInRange(45, 60),
        rain: randomInRange(0, 25),
        plant_health: randomInRange(75, 90),
        humidity: randomInRange(45, 60),
        light_intensity: randomInRange(40, 60),
        timestamp: Timestamp.fromDate(timestamp)
      };
    } else {
      // Night - cooler, less activity
      reading = {
        temp: randomInRange(35, 50),
        soil: randomInRange(50, 65),
        rain: randomInRange(0, 35),
        plant_health: randomInRange(75, 90),
        humidity: randomInRange(50, 70),
        light_intensity: randomInRange(20, 40),
        timestamp: Timestamp.fromDate(timestamp)
      };
    }
    
    // Randomly inject some warnings and critical events (10% chance)
    if (Math.random() < 0.05) {
      // 5% critical
      reading.temp = randomInRange(75, 90);
      reading.soil = randomInRange(15, 25);
    } else if (Math.random() < 0.05) {
      // 5% warning
      reading.temp = randomInRange(65, 75);
      reading.soil = randomInRange(25, 35);
    }
    
    readings.push(reading);
  }
  
  return readings;
}

/**
 * Upload sample data to Firestore
 * Note: This requires Firebase Auth and proper permissions
 */
export async function uploadSampleData(readings: SensorReading[]): Promise<void> {
  try {
    const sensorRef = collection(db, 'sensor_data');
    
    console.log(`Uploading ${readings.length} sample readings...`);
    
    for (let i = 0; i < readings.length; i++) {
      await addDoc(sensorRef, {
        ...readings[i],
        doc_number: i + 1
      });
      
      if ((i + 1) % 10 === 0) {
        console.log(`Uploaded ${i + 1}/${readings.length} readings...`);
      }
    }
    
    console.log('✅ Sample data upload complete!');
  } catch (error) {
    console.error('Error uploading sample data:', error);
  }
}

/**
 * Console helper functions for testing
 */
export const TestScenarios = {
  /**
   * Test normal operation
   */
  testNormal: async () => {
    const readings = generateNormalReadings(20);
    await uploadSampleData(readings);
    console.log('✅ Generated 20 normal readings');
  },
  
  /**
   * Test warning alerts
   */
  testWarnings: async () => {
    const readings = generateWarningReadings(10);
    await uploadSampleData(readings);
    console.log('⚠️ Generated 10 warning readings');
  },
  
  /**
   * Test critical alerts
   */
  testCritical: async () => {
    const readings = generateCriticalReadings(5);
    await uploadSampleData(readings);
    console.log('🚨 Generated 5 critical readings');
  },
  
  /**
   * Test full 24-hour scenario
   */
  test24Hours: async () => {
    const readings = generate24HourData();
    await uploadSampleData(readings);
    console.log('📊 Generated 24-hour data (288 readings)');
  },
  
  /**
   * Clear all test data (use with caution!)
   */
  clearData: async () => {
    if (!confirm('Are you sure you want to clear all sensor data?')) {
      return;
    }
    
    try {
      const sensorRef = collection(db, 'sensor_data');
      const q = query(sensorRef);
      const snapshot = await getDocs(q);
      
      console.log(`Deleting ${snapshot.size} documents...`);
      
      // Note: In production, use Firebase Admin SDK for batch deletes
      // This is just for testing
      
      console.log('⚠️ Delete operation not implemented in client-side code');
      console.log('Please use Firebase Console to delete test data');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).AgroTestData = {
    generateNormalReadings,
    generateWarningReadings,
    generateCriticalReadings,
    generate24HourData,
    uploadSampleData,
    TestScenarios
  };
  
  console.log('🌱 Agro Monitoring Test Data Generator loaded!');
  console.log('Available commands:');
  console.log('  AgroTestData.TestScenarios.testNormal()');
  console.log('  AgroTestData.TestScenarios.testWarnings()');
  console.log('  AgroTestData.TestScenarios.testCritical()');
  console.log('  AgroTestData.TestScenarios.test24Hours()');
}
