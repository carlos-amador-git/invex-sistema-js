import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Scan, Camera, AlertTriangle, CheckCircle, RefreshCw, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loadModels, detectFace, extractDescriptor } from '../../utils/faceRecognition';
import './Login.css';

const Login = () => {
  const { loginWithCredentials, loginWithFace } = useAuth();
  const [loginMethod, setLoginMethod] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Cargar modelos de face-api.js
  const initFaceApi = async () => {
    if (modelsLoaded) return true;

    setLoadingModels(true);
    try {
      await loadModels();
      setModelsLoaded(true);
      return true;
    } catch (err) {
      console.error('Error cargando modelos:', err);
      setError('Error cargando modelos de reconocimiento facial. Verifique que los modelos estén en /public/models/');
      return false;
    } finally {
      setLoadingModels(false);
    }
  };

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);

        // Iniciar detección continua de rostros
        startFaceDetection();
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifique los permisos.');
    }
  };

  // Detección continua de rostros
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && modelsLoaded && !isScanning) {
        try {
          const detection = await detectFace(videoRef.current);
          setFaceDetected(!!detection);
        } catch (err) {
          // Ignorar errores de detección
        }
      }
    }, 500);
  };

  // Detener cámara
  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
    setFaceDetected(false);
  };

  // Escanear rostro y hacer login
  const handleFaceScan = async () => {
    if (!videoRef.current || !modelsLoaded) return;

    setIsScanning(true);
    setError('');

    try {
      // Extraer descriptor facial
      const descriptor = await extractDescriptor(videoRef.current);

      if (!descriptor) {
        setError('No se detectó ningún rostro. Asegúrese de estar bien iluminado.');
        setIsScanning(false);
        return;
      }

      // Intentar login con el descriptor
      const result = await loginWithFace(descriptor);

      if (!result.success) {
        setError(result.error || 'No se pudo verificar el rostro');
        setFaceDetected(false);
      }
    } catch (err) {
      console.error('Error en escaneo facial:', err);
      setError(err.message || 'Error durante el escaneo facial');
      setFaceDetected(false);
    } finally {
      setIsScanning(false);
    }
  };

  // Login con credenciales
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginWithCredentials(username, password);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('Error de conexión. Verifique que el servidor esté activo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar método de login
  const switchMethod = async (method) => {
    setLoginMethod(method);
    setError('');
    setFaceDetected(false);

    if (method === 'facial') {
      const loaded = await initFaceApi();
      if (loaded) {
        startCamera();
      }
    } else {
      stopCamera();
    }
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="bg-pattern"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-brand">
              <span className="logo-invex">invex</span>
              <span className="logo-banco">Banco</span>
            </div>
          </div>
          <div className="login-title-section">
            <h2>Sistema de Inventario</h2>
            <p>Control de Tarjetas Bancarias</p>
          </div>
        </div>

        {/* Selector de método */}
        <div className="auth-method-selector">
          <button
            className={`method-btn ${loginMethod === 'password' ? 'active' : ''}`}
            onClick={() => switchMethod('password')}
          >
            <Lock size={18} />
            <span>Usuario y Contraseña</span>
          </button>
          <button
            className={`method-btn ${loginMethod === 'facial' ? 'active' : ''}`}
            onClick={() => switchMethod('facial')}
          >
            <Scan size={18} />
            <span>Reconocimiento Facial</span>
          </button>
        </div>

        {error && (
          <div className="login-error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login con contraseña */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="login-form">
            <div className="form-group">
              <label>Usuario</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader size={18} className="spinning" />
                  Verificando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        )}

        {/* Login facial */}
        {loginMethod === 'facial' && (
          <div className="facial-login">
            {loadingModels ? (
              <div className="loading-models">
                <Loader size={32} className="spinning" />
                <p>Cargando modelos de reconocimiento facial...</p>
              </div>
            ) : (
              <>
                <div className="camera-container">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-video"
                      />
                      <div className={`face-overlay ${isScanning ? 'scanning' : ''} ${faceDetected ? 'detected' : ''}`}>
                        <div className="face-frame">
                          <div className="corner tl"></div>
                          <div className="corner tr"></div>
                          <div className="corner bl"></div>
                          <div className="corner br"></div>
                        </div>
                      </div>
                      {isScanning && (
                        <div className="scanning-indicator">
                          <div className="scan-line"></div>
                        </div>
                      )}
                      {faceDetected && !isScanning && (
                        <div className="face-detected-badge">
                          <CheckCircle size={16} />
                          <span>Rostro detectado</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="camera-placeholder">
                      <Camera size={48} />
                      <span>Cargando cámara...</span>
                    </div>
                  )}
                </div>

                <div className="facial-instructions">
                  <p>Coloque su rostro dentro del marco y presione "Escanear"</p>
                  <button
                    className="scan-btn"
                    onClick={handleFaceScan}
                    disabled={!cameraActive || isScanning || !faceDetected}
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw size={18} className="spinning" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Scan size={18} />
                        Escanear Rostro
                      </>
                    )}
                  </button>
                  {!faceDetected && cameraActive && (
                    <p className="hint-text">Esperando detección de rostro...</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Credenciales demo */}
        <div className="demo-credentials">
          <p>📋 Credenciales de demostración:</p>
          <div className="credentials-list">
            <span><strong>Admin:</strong> admin / admin123</span>
            <span><strong>TSYS:</strong> tsys_user / tsys123</span>
            <span><strong>Distribución:</strong> dist_user / dist123</span>
            <span><strong>Módulos:</strong> mod_user / mod123</span>
            <span><strong>Director:</strong> director / dir123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
