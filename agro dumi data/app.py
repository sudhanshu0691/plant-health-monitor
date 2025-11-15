import firebase_admin
from firebase_admin import credentials, firestore
import random
import time
import socket
from datetime import datetime

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()
ip_address = socket.gethostbyname(socket.gethostname())

print(f"🌱 Agricultural Data Generator Started")
print(f"📍 Device IP: {ip_address}")
print(f"⏱️  Sending data to Firestore every 5 seconds")
print("-" * 60)

# Get the last document number from Firestore to continue numbering
try:
    docs = db.collection('sensor_data').order_by('doc_number', direction=firestore.Query.DESCENDING).limit(1).get()
    if docs:
        last_doc_number = docs[0].to_dict().get('doc_number', 0)
        iteration = last_doc_number
    else:
        iteration = 0
except Exception as e:
    print(f"ℹ️  Starting fresh (no previous data found)")
    iteration = 0

try:
    while True:
        iteration += 1
        
        # Generate realistic agricultural data
        soil_moisture = random.uniform(30, 80)
        temperature = random.uniform(20, 35)
        rainfall = random.uniform(0, 15)
        plant_health = random.uniform(60, 95)
        
        data = {
            'doc_number': iteration,
            'ip': ip_address,
            'rain': round(rainfall, 2),
            'soil': round(soil_moisture, 2),
            'temp': round(temperature, 2),
            'plant_health': round(plant_health, 2),
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        
        # Add data to Firestore collection with numbered document ID
        doc_id = f"data_{iteration:06d}"  # Creates: data_000001, data_000002, etc.
        db.collection('sensor_data').document(doc_id).set(data)
        
        print(f"\n[{iteration}] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  ✅ Data sent to Firestore (Doc ID: {doc_id})")
        print(f"  🌡️  Temperature: {data['temp']}°C")
        print(f"  💧 Soil Moisture: {data['soil']}%")
        print(f"  🌧️  Rainfall: {data['rain']}mm")
        print(f"  🌿 Plant Health: {data['plant_health']}%")
        
        time.sleep(5)
        
except KeyboardInterrupt:
    print("\n\n⛔ Data generation stopped by user")
    print(f"📊 Total iterations: {iteration}")
