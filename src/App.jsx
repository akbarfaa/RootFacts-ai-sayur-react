import { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { CameraService } from './services/CameraService';
import { DetectionService } from './services/DetectionService';
import { RootFactsService } from './services/RootFactsService';

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const [currentTone, setCurrentTone] = useState('normal');
  const servicesRef = useRef({ camera: null, detector: null, generator: null });

  useEffect(() => {
    const cam = new CameraService();
    const det = new DetectionService();
    const gen = new RootFactsService();

    servicesRef.current = { camera: cam, detector: det, generator: gen };
    actions.setServices({ camera: cam, detector: det, generator: gen });

    let detProgress = 0;
    let factProgress = 0;

    const updateProgress = () => {
      const avg = Math.round((detProgress + factProgress) / 2);
      actions.setModelStatus(`Memuat Model (${avg}%)...`);
    };

    const handleDetProgress = (e) => {
      detProgress = e.detail;
      updateProgress();
    };

    const handleFactProgress = (e) => {
      factProgress = e.detail;
      updateProgress();
    };

    window.addEventListener('model-loading-progress', handleDetProgress);
    window.addEventListener('facts-loading-progress', handleFactProgress);

    actions.setModelStatus('Memuat Model AI...');

    Promise.all([
      det.loadModel(),
      gen.loadModel()
    ]).then(() => {
      actions.setModelStatus('Model AI Siap');
    }).catch((err) => {
      console.error(err);
      actions.setError(`Gagal memuat model: ${err.message}`);
      actions.setModelStatus('Error');
    }).finally(() => {
      window.removeEventListener('model-loading-progress', handleDetProgress);
      window.removeEventListener('facts-loading-progress', handleFactProgress);
    });

    return () => {
      cam.stopCamera();
      window.removeEventListener('model-loading-progress', handleDetProgress);
      window.removeEventListener('facts-loading-progress', handleFactProgress);
    };
  }, []);

  const detectFrameLoop = async (loopId) => {
    const delayBetweenFrames = () => 1000 / (servicesRef.current.camera?.fps || 30);

    while (isRunningRef.current && detectionCleanupRef.current === loopId) {
      const startTime = performance.now();
      const { camera, detector } = servicesRef.current;

      if (camera && camera.isReady()) {
        try {
          const prediction = await detector.predict(camera.video);
          if (prediction && prediction.score >= 0.70) {
            isRunningRef.current = false;
            actions.setRunning(false);
            camera.stopCamera();
            await generateAndShowResults(prediction);
            break;
          }
        } catch (e) {
          console.error('Error in React detection loop', e);
        }
      }

      const elapsed = performance.now() - startTime;
      const delay = Math.max(0, delayBetweenFrames() - elapsed);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  };

  const generateAndShowResults = async (prediction) => {
    actions.setAppState('result');
    actions.setDetectionResult(prediction);
    actions.setFunFactData(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fact = await servicesRef.current.generator.generateFacts(prediction.className, currentTone);
      actions.setFunFactData(fact);
    } catch (e) {
      console.error('Error generating fun fact in React', e);
      actions.setFunFactData('error');
    }
  };

  const handleToggleCamera = async () => {
    const { camera } = servicesRef.current;

    if (state.isRunning) {
      isRunningRef.current = false;
      actions.setRunning(false);
      if (camera) camera.stopCamera();
      actions.resetResults();
    } else {
      try {
        if (camera) {
          const selectEl = document.getElementById('camera-select');
          const selectedCam = selectEl ? selectEl.value : 'default';

          await camera.startCamera(selectedCam);
          actions.setRunning(true);
          isRunningRef.current = true;
          actions.setAppState('analyzing');

          const loopId = Math.random().toString(36).substring(2, 9);
          detectionCleanupRef.current = loopId;
          detectFrameLoop(loopId);
        }
      } catch (err) {
        actions.setError(err.message);
      }
    }
  };

  const handleToneChange = (tone) => {
    setCurrentTone(tone);
    if (servicesRef.current.generator) {
      servicesRef.current.generator.setTone(tone);
    }
  };

  const handleCopyFact = async () => {
    if (state.funFactData && state.funFactData !== 'error') {
      try {
        await navigator.clipboard.writeText(state.funFactData);
        const btn = document.getElementById('btn-copy');
        if (btn) {
          btn.classList.add('copied');
          btn.innerHTML = '✓';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '📋';
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
      }
    }
  };

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
