"use client";

import React, { useEffect, useState, useRef } from "react";
import { db, collection, onSnapshot, query, orderBy, limit } from "@/lib/firebase";
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
  const maxDataPoints = 50; // Maximum number of points to keep

  useEffect(() => {
    try {
      // Reference to your sensor data collection in Firestore
      const colRef = collection(db, "sensor_data");
      // Query to get data ordered by timestamp, limit to last maxDataPoints
      const q = query(colRef, orderBy("timestamp", "desc"), limit(maxDataPoints));
      
      // Listen for real-time updates
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            // Extract all data from snapshot
            const newData: SensorData[] = snapshot.docs.map(doc => {
              const docData = doc.data();
              return {
                ...docData,
                // Convert Firestore Timestamp to Unix timestamp if needed
                timestamp: docData.timestamp?.seconds 
                  ? docData.timestamp.seconds 
                  : (docData.timestamp || Date.now() / 1000),
              } as SensorData;
            });
            
            // Sort by timestamp in ascending order (oldest to newest)
            const sortedData = newData.sort((a, b) => {
              const aTime = typeof a.timestamp === 'number' ? a.timestamp : a.timestamp?.seconds || 0;
              const bTime = typeof b.timestamp === 'number' ? b.timestamp : b.timestamp?.seconds || 0;
              return aTime - bTime;
            });
            
            // Update state with sorted data (automatically maintains last maxDataPoints)
            setDataPoints(sortedData);
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
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }),
    datasets: [
      {
        label: "Soil Moisture (%)",
        data: dataPoints.map((d) => Number(d.soil) || 0),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: "Temperature (°C)",
        data: dataPoints.map((d) => Number(d.temp) || 0),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: "Rainfall (mm)",
        data: dataPoints.map((d) => Number(d.rain) || 0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: "Plant Health (%)",
        data: dataPoints.map((d) => Number(d.plant_health) || 0),
        borderColor: "rgb(234, 179, 8)",
        backgroundColor: "rgba(234, 179, 8, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
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
          font: {
            size: 12,
          }
        },
      },
      title: {
        display: true,
        text: "Real-Time Sensor Data (Last 24h)",
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
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function(value) {
            return value;
          },
          font: {
            size: 11,
          }
        },
        title: {
          display: true,
          text: 'Values',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10,
          font: {
            size: 10,
          }
        },
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
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
        <CardTitle className="flex items-center justify-between">
          <span>Real-Time Sensor Data</span>
          <span className="flex items-center gap-2 text-sm font-normal text-green-600 dark:text-green-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Live
          </span>
        </CardTitle>
        <CardDescription>
          Live streaming data from Firebase ({dataPoints.length}/{maxDataPoints} readings)
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
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border-2 border-red-200 dark:border-red-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">🌡️ Temperature</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {dataPoints[dataPoints.length - 1].temp?.toFixed(2) || "N/A"}°C
                </p>
                <p className="text-xs text-gray-500 mt-1">Latest reading</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">🌧️ Rainfall</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {dataPoints[dataPoints.length - 1].rain?.toFixed(2) || "N/A"} mm
                </p>
                <p className="text-xs text-gray-500 mt-1">Latest reading</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">🌱 Soil Moisture</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {dataPoints[dataPoints.length - 1].soil?.toFixed(2) || "N/A"}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Latest reading</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">🌿 Plant Health</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {dataPoints[dataPoints.length - 1].plant_health?.toFixed(2) || "N/A"}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Latest reading</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
