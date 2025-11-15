import FirebaseGraph from "@/components/firebase-graph";

export default function FirebaseDashboard() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Firebase Real-Time Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your IoT sensor data in real-time from Firestore
        </p>
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
