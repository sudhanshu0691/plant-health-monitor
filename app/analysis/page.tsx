"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db, collection, query, where, getDocs, orderBy } from '@/lib/firebase';
import { 
  DailyHealthReport, 
  generateDailyHealthReport, 
  formatReportAsMarkdown 
} from '@/lib/dailyAnalysis';
import { SensorReading } from '@/lib/agroMonitoring';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Download, RefreshCw, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalysisPage() {
  const [report, setReport] = useState<DailyHealthReport | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch 24-hour data
  const fetchDailyData = async (date: Date) => {
    setIsLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const sensorRef = collection(db, 'sensor_data');
      const q = query(
        sensorRef,
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const data: SensorReading[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          temp: docData.temp || 0,
          rain: docData.rain || 0,
          soil: docData.soil || 0,
          plant_health: docData.plant_health || 0,
          humidity: docData.humidity,
          light_intensity: docData.light_intensity,
          timestamp: docData.timestamp,
        };
      });

      setReadings(data);
      
      // Generate report
      const dateStr = date.toISOString().split('T')[0];
      const healthReport = generateDailyHealthReport(data, dateStr);
      setReport(healthReport);
    } catch (error) {
      console.error('Error fetching daily data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Only auto-refresh if viewing today
      const today = new Date().toDateString();
      if (selectedDate.toDateString() === today) {
        fetchDailyData(selectedDate);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDate]);

  const downloadReport = () => {
    if (!report) return;

    const markdown = formatReportAsMarkdown(report);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plant-health-report-${report.date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const chartData = readings.length > 0 ? {
    labels: readings.map((r, idx) => {
      const date = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: 'Soil Moisture (%)',
        data: readings.map(r => r.soil),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Temperature (°C)',
        data: readings.map(r => r.temp),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Plant Health (%)',
        data: readings.map(r => r.plant_health),
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '24-Hour Parameter Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Generating health report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No data available for the selected date.</p>
        </div>
      </div>
    );
  }

  const statusColor = report.overallStatus === 'Healthy' 
    ? 'text-green-600 dark:text-green-400' 
    : report.overallStatus === 'Moderate'
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400';

  const statusBg = report.overallStatus === 'Healthy' 
    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
    : report.overallStatus === 'Moderate'
    ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
    : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            Daily Plant Health Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive 24-hour health monitoring and recommendations
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDailyData(selectedDate)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadReport}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            />
            <Badge variant="outline">
              {report.statistics.readingsCount} readings
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh:</span>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Health Score */}
      <Card className={`mb-6 border-2 ${statusBg}`}>
        <CardHeader>
          <CardTitle className="text-2xl">Overall Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`text-7xl font-bold ${statusColor}`}>
                {report.overallHealthScore}
              </div>
              <div className="text-4xl font-light text-gray-400">/100</div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${statusColor} flex items-center gap-2`}>
                {report.overallStatus === 'Healthy' && <CheckCircle className="w-8 h-8" />}
                {report.overallStatus === 'Moderate' && <AlertTriangle className="w-8 h-8" />}
                {report.overallStatus === 'Poor' && <AlertTriangle className="w-8 h-8" />}
                {report.overallStatus}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Status
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* 24-Hour Trends Chart */}
          {chartData && (
            <Card>
              <CardHeader>
                <CardTitle>24-Hour Parameter Trends</CardTitle>
                <CardDescription>Real-time monitoring of key parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>24-hour averages and totals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Soil Moisture</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {report.statistics.avgSoilMoisture.toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Temperature</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {report.statistics.avgTemperature.toFixed(1)}°C
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Rainfall</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {report.statistics.totalRainfall.toFixed(2)} mm
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Avg Plant Health</div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {report.statistics.avgPlantHealth.toFixed(1)}%
                  </div>
                </div>
                {report.statistics.avgHumidity > 0 && (
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg Humidity</div>
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      {report.statistics.avgHumidity.toFixed(1)}%
                    </div>
                  </div>
                )}
                {report.statistics.avgLightIntensity > 0 && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg Light Intensity</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {report.statistics.avgLightIntensity.toFixed(1)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parameters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parameter-wise Status</CardTitle>
              <CardDescription>Detailed status of each monitored parameter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.parameterWiseStatus.map((param, idx) => {
                  const statusColor = param.status === 'normal' 
                    ? 'text-green-600 dark:text-green-400' 
                    : param.status === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400';
                  
                  const statusBg = param.status === 'normal' 
                    ? 'bg-green-50 dark:bg-green-950' 
                    : param.status === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-950'
                    : 'bg-red-50 dark:bg-red-950';

                  const statusIcon = param.status === 'normal' ? '✅' : param.status === 'warning' ? '⚠️' : '🚨';

                  return (
                    <div key={idx}>
                      <div className={`p-4 rounded-lg ${statusBg}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-lg">
                              {statusIcon} {param.displayName}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              Status: <span className={statusColor}>{param.status}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${statusColor}`}>
                              {param.avgValue.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {param.parameter === 'rain' ? 'mm total' : param.parameter === 'temp' ? '°C' : '%'}
                            </div>
                          </div>
                        </div>
                      </div>
                      {idx < report.parameterWiseStatus.length - 1 && <Separator className="my-2" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Critical Events Timeline</CardTitle>
              <CardDescription>
                {report.criticalEvents.length > 0 
                  ? `${report.criticalEvents.length} events recorded` 
                  : 'No critical events recorded'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.criticalEvents.length > 0 ? (
                <div className="space-y-3">
                  {report.criticalEvents.slice(0, 20).map((event, idx) => {
                    const isCritical = event.status === 'critical';
                    const bgColor = isCritical 
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
                    
                    return (
                      <div key={idx} className={`p-3 rounded-lg border ${bgColor}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold">
                              {isCritical ? '🚨' : '⚠️'} {event.message}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.timestamp.toLocaleString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </div>
                          <Badge variant={isCritical ? 'destructive' : 'secondary'}>
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-semibold">All Clear!</p>
                  <p className="text-sm">No critical events recorded today.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>Actions to maintain or improve plant health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-gray-200">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overall Status Card */}
          <Card className={statusBg}>
            <CardHeader>
              <CardTitle>Overall Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className={`text-6xl font-bold ${statusColor} mb-4`}>
                  {report.overallStatus}
                </div>
                {report.overallStatus === 'Healthy' && (
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    🌟 Your plants are in excellent condition! Keep up the great work.
                  </p>
                )}
                {report.overallStatus === 'Moderate' && (
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    ⚠️ Some parameters need attention. Follow the recommendations above.
                  </p>
                )}
                {report.overallStatus === 'Poor' && (
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    🚨 Immediate action required! Review critical events and recommendations.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Report generated automatically at {new Date().toLocaleString()}
      </div>
    </div>
  );
}
