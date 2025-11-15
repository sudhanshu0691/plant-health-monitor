"use client";

import React, { useEffect, useState } from "react";
import { db, collection, onSnapshot } from "@/lib/firebase";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SensorData {
  timestamp: any; // Firebase Timestamp or number
  temp?: number;
  rain?: number;
  soil?: number;
  plant_health?: number;
  [key: string]: any;
}

export default function FirebaseGraph() {
  const [dataPoints, setDataPoints] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Reference to your sensor data collection in Firestore
      const colRef = collection(db, "sensor_data");
      
      // Listen for real-time updates
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const data: SensorData[] = snapshot.docs.map(doc => {
            const docData = doc.data();
            return {
              ...docData,
              // Convert Firestore Timestamp to Unix timestamp if needed
              timestamp: docData.timestamp?.seconds || docData.timestamp || Date.now() / 1000,
            } as SensorData;
          });
          
          if (data.length > 0) {
            // Sort by timestamp
            const sortedData = data.sort((a, b) => {
              const aTime = typeof a.timestamp === 'number' ? a.timestamp : a.timestamp?.seconds || 0;
              const bTime = typeof b.timestamp === 'number' ? b.timestamp : b.timestamp?.seconds || 0;
              return aTime - bTime;
            });
            // Keep only last 50 data points for better performance
            const recentData = sortedData.slice(-50);
            setDataPoints(recentData);
            setIsLoading(false);
          } else {
            setDataPoints([]);
            setIsLoading(false);
          }
        },
        (error) => {
          console.error("Firebase error:", error);
          setError(error.message);
          setIsLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Setup error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, []);

  const chartData = {
    labels: dataPoints.map((d) => {
      const timestamp = typeof d.timestamp === 'number' ? d.timestamp : d.timestamp?.seconds || 0;
      return new Date(timestamp * 1000).toLocaleTimeString();
    }),
    datasets: [
      {
        label: "Temperature (°C)",
        data: dataPoints.map((d) => d.temp || 0),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Rainfall (mm)",
        data: dataPoints.map((d) => d.rain || 0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Soil Moisture (%)",
        data: dataPoints.map((d) => d.soil || 0),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Plant Health (%)",
        data: dataPoints.map((d) => d.plant_health || 0),
        borderColor: "rgb(234, 179, 8)",
        backgroundColor: "rgba(234, 179, 8, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: "Real-Time Sensor Data",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Real-Time Sensor Data</CardTitle>
          <CardDescription>Loading data from Firebase...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Real-Time Sensor Data</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-red-500">
              <p className="text-lg font-semibold">Error: {error}</p>
              <p className="text-sm mt-2">Please check your Firebase configuration</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Real-Time Sensor Data</CardTitle>
          <CardDescription>Waiting for data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-gray-500">
              <p className="text-lg font-semibold">No data available</p>
              <p className="text-sm mt-2">Waiting for sensor readings from Firebase...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Real-Time Sensor Data</CardTitle>
        <CardDescription>
          Live data from Firebase Realtime Database ({dataPoints.length} readings)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <Line data={chartData} options={options} />
        </div>
        
        {/* Latest values display */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {dataPoints.length > 0 && (
            <>
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Temperature</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {dataPoints[dataPoints.length - 1].temp?.toFixed(2) || "N/A"}°C
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Rainfall</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {dataPoints[dataPoints.length - 1].rain?.toFixed(2) || "N/A"} mm
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Soil Moisture</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {dataPoints[dataPoints.length - 1].soil?.toFixed(2) || "N/A"}%
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Plant Health</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {dataPoints[dataPoints.length - 1].plant_health?.toFixed(2) || "N/A"}%
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
