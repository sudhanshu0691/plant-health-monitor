"use client";

import FirebaseGraph from "@/components/firebase-graph";
import { useEffect, useState, useRef } from "react";
import { db, collection, query, orderBy, limit, onSnapshot } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/contexts/NotificationContext";
import { 
  analyzeSensorReading, 
  getParameterStatus, 
  getStatusBgColor, 
  SensorReading 
} from "@/lib/agroMonitoring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TrendingUp, Bell, BellOff } from "lucide-react";

interface SensorData {
  temp: number;
  rain: number;
  soil: number;
  plant_health: number;
  humidity?: number;
  light_intensity?: number;
  timestamp: any;
}

export default function FirebaseDashboard() {
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { sendMultipleAlerts, sendInfoNotification } = useNotifications();
  const previousDataRef = useRef<SensorData | null>(null);

  useEffect(() => {
    try {
      const sensorRef = collection(db, "sensor_data");
      const q = query(sensorRef, orderBy("timestamp", "desc"), limit(1));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          const newData: SensorData = {
            temp: docData.temp || 0,
            rain: docData.rain || 0,
            soil: docData.soil || 0,
            plant_health: docData.plant_health || 0,
            humidity: docData.humidity,
            light_intensity: docData.light_intensity,
            timestamp: docData.timestamp,
          };
          
          setLatestData(newData);
          
          // Check for alerts only if notifications are enabled and data has changed
          if (notificationsEnabled && previousDataRef.current) {
            const sensorReading: SensorReading = {
              temp: newData.temp,
              rain: newData.rain,
              soil: newData.soil,
              plant_health: newData.plant_health,
              humidity: newData.humidity,
              light_intensity: newData.light_intensity,
              timestamp: newData.timestamp,
            };
            
            const alerts = analyzeSensorReading(sensorReading);
            if (alerts.length > 0) {
              sendMultipleAlerts(alerts);
            }
          }
          
          previousDataRef.current = newData;
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
  }, [notificationsEnabled, sendMultipleAlerts]);

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    if (!notificationsEnabled) {
      sendInfoNotification("Notifications enabled");
    } else {
      sendInfoNotification("Notifications disabled");
    }
  };

  const getParameterStatusInfo = (param: string, value: number) => {
    const status = getParameterStatus(param, value);
    const statusBg = getStatusBgColor(status);
    const statusEmoji = status === 'normal' ? '✅' : status === 'warning' ? '⚠️' : '🚨';
    const statusText = status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'Critical';
    
    return { statusBg, statusEmoji, statusText, status };
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Firebase Real-Time Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your IoT sensor data in real-time from Firestore
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={notificationsEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleNotifications}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
            {notificationsEnabled ? "Notifications On" : "Notifications Off"}
          </Button>
          <Link href="/analysis">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-Time Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className={latestData ? getParameterStatusInfo('temp', latestData.temp).statusBg : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <span>🌡️ Temperature</span>
              {latestData && (
                <Badge variant={getParameterStatusInfo('temp', latestData.temp).status === 'normal' ? 'default' : getParameterStatusInfo('temp', latestData.temp).status === 'warning' ? 'secondary' : 'destructive'}>
                  {getParameterStatusInfo('temp', latestData.temp).statusEmoji}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-red-200 dark:bg-red-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">
                  {latestData?.temp.toFixed(2) || "N/A"}°C
                </div>
                <p className="text-xs mt-1">
                  {latestData && getParameterStatusInfo('temp', latestData.temp).statusText}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={latestData ? getParameterStatusInfo('rain', latestData.rain).statusBg : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <span>🌧️ Rainfall</span>
              {latestData && (
                <Badge variant={getParameterStatusInfo('rain', latestData.rain).status === 'normal' ? 'default' : getParameterStatusInfo('rain', latestData.rain).status === 'warning' ? 'secondary' : 'destructive'}>
                  {getParameterStatusInfo('rain', latestData.rain).statusEmoji}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-blue-200 dark:bg-blue-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">
                  {latestData?.rain.toFixed(2) || "N/A"} mm
                </div>
                <p className="text-xs mt-1">
                  {latestData && getParameterStatusInfo('rain', latestData.rain).statusText}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={latestData ? getParameterStatusInfo('soil', latestData.soil).statusBg : "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <span>🌱 Soil Moisture</span>
              {latestData && (
                <Badge variant={getParameterStatusInfo('soil', latestData.soil).status === 'normal' ? 'default' : getParameterStatusInfo('soil', latestData.soil).status === 'warning' ? 'secondary' : 'destructive'}>
                  {getParameterStatusInfo('soil', latestData.soil).statusEmoji}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-green-200 dark:bg-green-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">
                  {latestData?.soil.toFixed(2) || "N/A"}%
                </div>
                <p className="text-xs mt-1">
                  {latestData && getParameterStatusInfo('soil', latestData.soil).statusText}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={latestData ? getParameterStatusInfo('plant_health', latestData.plant_health).statusBg : "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              <span>🌿 Plant Health</span>
              {latestData && (
                <Badge variant={getParameterStatusInfo('plant_health', latestData.plant_health).status === 'normal' ? 'default' : getParameterStatusInfo('plant_health', latestData.plant_health).status === 'warning' ? 'secondary' : 'destructive'}>
                  {getParameterStatusInfo('plant_health', latestData.plant_health).statusEmoji}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-yellow-200 dark:bg-yellow-800 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">
                  {latestData?.plant_health.toFixed(2) || "N/A"}%
                </div>
                <p className="text-xs mt-1">
                  {latestData && getParameterStatusInfo('plant_health', latestData.plant_health).statusText}
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
