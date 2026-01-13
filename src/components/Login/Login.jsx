import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Scan, Camera, AlertTriangle, CheckCircle, RefreshCw, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loadModels, detectFace, extractDescriptor } from '../../utils/faceRecognition';
import './Login.css';

const Login = () => {
  const { loginWithCredentials, loginWithFace } = useAuth();
  const [loginMethod, setLoginMethod] = useState('password');
  
  // Estados del formulario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados de reconocimiento facial
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // --- (Las funciones de la cámara se quedan igual: initFaceApi, startCamera, etc.) ---
  // ... (He omitido las funciones de cámara para ahorrar espacio, déjalas tal cual estaban) ...

  const initFaceApi = async () => {
    if (modelsLoaded) return true;
    setLoadingModels(true);
    try {
      await loadModels();
      setModelsLoaded(true);
      return true;
    } catch (err) {
      console.error('Error cargando modelos:', err);
      setError('Error cargando modelos. Verifique /public/models/');
      return false;
    } finally {
      setLoadingModels(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        startFaceDetection();
      }
    } catch (err) {
      console.error('Error cámara:', err);
      setError('No se pudo acceder a la cámara.');
    }
  };

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && modelsLoaded && !isScanning) {
        try {
          const detection = await detectFace(videoRef.current);
          setFaceDetected(!!detection);
        } catch (err) {}
      }
    }, 500);
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
    setFaceDetected(false);
  };

  const handleFaceScan = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setIsScanning(true);
    setError('');
    try {
      const descriptor = await extractDescriptor(videoRef.current);
      if (!descriptor) {
        setError('No se detectó ningún rostro. Ilumine su cara.');
        setIsScanning(false);
        return;
      }
      const result = await loginWithFace(descriptor);
      if (!result.success) {
        // Protección contra objetos en el error
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : 'No se pudo verificar el rostro';
        setError(errorMsg);
        setFaceDetected(false);
      }
    } catch (err) {
      setError('Error durante el escaneo facial');
      setFaceDetected(false);
    } finally {
      setIsScanning(false);
    }
  };

  // --- CORRECCIÓN CLAVE AQUÍ ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Llamamos al login (que ahora usa el fix de URLSearchParams en authService)
      const result = await loginWithCredentials(username, password);
      
      if (!result.success) {
        // 2. PROTECCIÓN CONTRA CRASH DE REACT (Error #31)
        // Si result.error es un objeto/array, lo convertimos a string
        if (typeof result.error === 'object') {
           // Intentamos sacar el mensaje si es formato FastAPI
           const msg = result.error?.detail?.[0]?.msg || result.error?.message || JSON.stringify(result.error);
           setError(msg);
        } else {
           setError(result.error || 'Credenciales incorrectas');
        }
      }
    } catch (err) {
      // Catch de red general
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMethod = async (method) => {
    setLoginMethod(method);
    setError('');
    setFaceDetected(false);
    if (method === 'facial') {
      const loaded = await initFaceApi();
      if (loaded) startCamera();
    } else {
      stopCamera();
    }
  };

  useEffect(() => {
    return () => stopCamera();
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
            <span>Contraseña</span>
          </button>
          <button
            className={`method-btn ${loginMethod === 'facial' ? 'active' : ''}`}
            onClick={() => switchMethod('facial')}
          >
            <Scan size={18} />
            <span>Facial</span>
          </button>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="login-error">
            <AlertTriangle size={16} />
            {/* Renderizar solo string para evitar crash */}
            <span>{String(error)}</span>
          </div>
        )}

        {/* Login con contraseña */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="login-form">
            <div className="form-group">
              <label>Usuario</label>
              
              {/* CORRECCIÓN DE ESTILOS AQUÍ */}
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  className="input-field-with-icon" /* Clase CSS Real */
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
              
              {/* CORRECCIÓN DE ESTILOS AQUÍ */}
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  className="input-field-with-icon" /* Clase CSS Real */
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
                  <Loader size={18} className="spinning" /> Verificando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        )}

        {/* Login Facial (Código visual igual, solo asegúrate de importar componentes) */}
        {loginMethod === 'facial' && (
           <div className="facial-login">
             {/* ... Tu código de cámara existente ... */}
             {loadingModels ? (
                <div className="loading-models"><Loader className="spinning"/> Cargando...</div>
             ) : (
                <>
                  <div className="camera-container">
                     {cameraActive ? <video ref={videoRef} autoPlay playsInline muted className="camera-video" /> : <div className="camera-placeholder"><Camera/></div>}
                     {/* Overlays... */}
                  </div>
                  <div className="facial-instructions">
                     <button className="scan-btn" onClick={handleFaceScan} disabled={!cameraActive || isScanning}>
                        {isScanning ? <RefreshCw className="spinning"/> : <Scan/>} Escanear
                     </button>
                  </div>
                </>
             )}
           </div>
        )}

        <div className="demo-credentials">
            <p>Versión 1.0.0 - Conexión Segura</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
