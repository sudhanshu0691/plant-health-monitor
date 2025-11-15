"use client";

import FirebaseGraph from "@/components/firebase-graph";
import { useEffect, useState } from "react";
import { db, collection, query, orderBy, limit, onSnapshot } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SensorData {
  temp: number;
  rain: number;
  soil: number;
  plant_health: number;
  timestamp: any;
}

export default function FirebaseDashboard() {
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const sensorRef = collection(db, "sensor_data");
      const q = query(sensorRef, orderBy("timestamp", "desc"), limit(1));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setLatestData({
            temp: docData.temp || 0,
            rain: docData.rain || 0,
            soil: docData.soil || 0,
            plant_health: docData.plant_health || 0,
            timestamp: docData.timestamp,
          });
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching latest data:", error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Setup error:", error);
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Firebase Real-Time Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your IoT sensor data in real-time from Firestore
        </p>
      </div>

      {/* Real-Time Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">
              🌡️ Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-red-200 dark:bg-red-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {latestData?.temp.toFixed(2) || "N/A"}°C
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {latestData?.temp && latestData.temp > 30 ? "🔥 High" : latestData?.temp && latestData.temp < 15 ? "❄️ Low" : "✓ Normal"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">
              🌧️ Rainfall
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-blue-200 dark:bg-blue-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {latestData?.rain.toFixed(2) || "N/A"} mm
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {latestData?.rain && latestData.rain > 5 ? "🌊 Heavy" : latestData?.rain && latestData.rain > 0 ? "💧 Light" : "☀️ Dry"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">
              🌱 Soil Moisture
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-green-200 dark:bg-green-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {latestData?.soil.toFixed(2) || "N/A"}%
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {latestData?.soil && latestData.soil > 70 ? "💧 Wet" : latestData?.soil && latestData.soil > 40 ? "✓ Good" : "⚠️ Dry"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              🌿 Plant Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-yellow-200 dark:bg-yellow-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {latestData?.plant_health.toFixed(2) || "N/A"}%
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {latestData?.plant_health && latestData.plant_health > 80 ? "🌟 Excellent" : latestData?.plant_health && latestData.plant_health > 50 ? "✓ Good" : "⚠️ Attention"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <FirebaseGraph />
      
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">How it works</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li>• <strong>Real-time Updates:</strong> Data automatically refreshes as new sensor readings arrive</li>
          <li>• <strong>WebSocket Connection:</strong> Firestore uses WebSockets for instant updates</li>
          <li>• <strong>Collection Path:</strong> Listening to <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">sensor_data</code> collection in Firestore</li>
          <li>• <strong>Performance:</strong> Showing last 50 data points for optimal chart performance</li>
        </ul>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Firestore Data Structure Expected:</h3>
          <pre className="text-sm bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`Collection: sensor_data

Document (auto-generated ID):
{
  "timestamp": Timestamp,
  "temp": 29.83,
  "rain": 2.46,
  "soil": 68.77,
  "plant_health": 94.96,
  "ip": "10.91.226.175",
  "doc_number": 1
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
