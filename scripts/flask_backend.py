from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Mock ML model prediction
def predict_plant_health(soil_moisture, temperature):
    """Simple mock prediction logic"""
    health_score = (soil_moisture * 0.6) + ((temperature / 50) * 0.4) * 100
    return min(100, max(0, health_score))

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'Backend is running',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/predict', methods=['GET'])
def predict():
    """Get real-time predictions for plant health and soil moisture"""
    try:
        # Generate mock sensor data
        soil_moisture = 30 + np.random.normal(35, 10)
        soil_moisture = max(0, min(100, soil_moisture))
        
        temperature = 15 + np.random.normal(10, 5)
        temperature = max(5, min(40, temperature))
        
        rainfall = max(0, np.random.exponential(2))
        
        plant_health = predict_plant_health(soil_moisture, temperature)
        
        # Determine health status
        if plant_health < 30:
            status = "Needs Water"
        elif plant_health < 70:
            status = "Optimal"
        else:
            status = "Great"
        
        return jsonify({
            'soil_moisture': round(soil_moisture, 2),
            'temperature': round(temperature, 2),
            'rainfall': round(rainfall, 2),
            'plant_health': round(plant_health, 2),
            'health_status': status,
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask Backend on http://localhost:5000")
    print("Available endpoints:")
    print("  GET http://localhost:5000/health")
    print("  GET http://localhost:5000/predict")
    app.run(debug=True, port=5000)
