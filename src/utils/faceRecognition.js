import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

/**
 * Cargar modelos de face-api.js
 */
export const loadModels = async () => {
  if (modelsLoaded) return true;

  // Evitar cargas múltiples simultáneas
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log('Modelos de face-api.js cargados correctamente');
      return true;
    } catch (error) {
      console.error('Error cargando modelos de face-api.js:', error);
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
};

/**
 * Verificar si los modelos están cargados
 */
export const areModelsLoaded = () => modelsLoaded;

/**
 * Detectar rostro en un elemento de video/imagen
 */
export const detectFace = async (mediaElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  const detection = await faceapi
    .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
};

/**
 * Extraer descriptor facial de un elemento de video/imagen
 * @returns Float32Array de 128 dimensiones
 */
export const extractDescriptor = async (mediaElement) => {
  const detection = await detectFace(mediaElement);

  if (!detection) {
    throw new Error('No se detectó ningún rostro en la imagen');
  }

  return detection.descriptor;
};

/**
 * Comparar dos descriptores faciales
 * @param descriptor1 Float32Array
 * @param descriptor2 Float32Array
 * @param threshold Umbral de similitud (default 0.6)
 * @returns boolean
 */
export const compareFaces = (descriptor1, descriptor2, threshold = 0.6) => {
  if (!descriptor1 || !descriptor2) return false;

  const distance = faceapi.euclideanDistance(
    Array.from(descriptor1),
    Array.from(descriptor2)
  );

  return distance < threshold;
};

/**
 * Obtener distancia entre dos descriptores
 */
export const getFaceDistance = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return Infinity;

  return faceapi.euclideanDistance(
    Array.from(descriptor1),
    Array.from(descriptor2)
  );
};

/**
 * Detectar múltiples rostros
 */
export const detectAllFaces = async (mediaElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  const detections = await faceapi
    .detectAllFaces(mediaElement, new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
};

/**
 * Dibujar detecciones en un canvas
 */
export const drawDetections = (canvas, detections, displaySize) => {
  faceapi.matchDimensions(canvas, displaySize);
  const resizedDetections = faceapi.resizeResults(detections, displaySize);

  faceapi.draw.drawDetections(canvas, resizedDetections);
  faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
};

export default {
  loadModels,
  areModelsLoaded,
  detectFace,
  extractDescriptor,
  compareFaces,
  getFaceDistance,
  detectAllFaces,
  drawDetections
};
