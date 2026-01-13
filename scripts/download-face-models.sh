#!/bin/bash

# Script para descargar modelos de face-api.js
# Ejecutar desde la raíz del proyecto: ./scripts/download-face-models.sh

MODELS_DIR="public/models"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Crear directorio si no existe
mkdir -p $MODELS_DIR

echo "📦 Descargando modelos de face-api.js..."

# Tiny Face Detector
echo "  → tiny_face_detector..."
curl -sL "$BASE_URL/tiny_face_detector_model-weights_manifest.json" -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json"
curl -sL "$BASE_URL/tiny_face_detector_model-shard1" -o "$MODELS_DIR/tiny_face_detector_model-shard1"

# Face Landmark 68
echo "  → face_landmark_68..."
curl -sL "$BASE_URL/face_landmark_68_model-weights_manifest.json" -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json"
curl -sL "$BASE_URL/face_landmark_68_model-shard1" -o "$MODELS_DIR/face_landmark_68_model-shard1"

# Face Recognition
echo "  → face_recognition..."
curl -sL "$BASE_URL/face_recognition_model-weights_manifest.json" -o "$MODELS_DIR/face_recognition_model-weights_manifest.json"
curl -sL "$BASE_URL/face_recognition_model-shard1" -o "$MODELS_DIR/face_recognition_model-shard1"
curl -sL "$BASE_URL/face_recognition_model-shard2" -o "$MODELS_DIR/face_recognition_model-shard2"

echo "✅ Modelos descargados en $MODELS_DIR"
echo ""
echo "Archivos descargados:"
ls -la $MODELS_DIR
