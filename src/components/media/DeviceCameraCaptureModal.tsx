import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Video, Play, Square, Circle } from 'lucide-react';
import { Button } from '../ds/Button';

interface DeviceCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (mediaDataUrl: string, mediaType: 'image' | 'video') => void;
  title?: string;
}

export const DeviceCameraCaptureModal: React.FC<DeviceCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capturar Mídia com a Câmera'
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isStarting, setIsStarting] = useState(false);

  // Video recording states
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Start the camera feed
  const startCamera = async (facing: 'user' | 'environment', captureMode: 'photo' | 'video') => {
    setIsStarting(true);
    setError(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      // In video mode, try to get both video and audio
      if (captureMode === 'video') {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: true
          });
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            videoRef.current.play().catch(console.warn);
          }
          setIsStarting(false);
          return;
        } catch (audioErr) {
          console.warn('Microfone negado ou indisponível, iniciando apenas vídeo:', audioErr);
          // Fall back to video-only constraints below
        }
      }

      // Default or fallback constraints (video-only)
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn('Falha ao abrir câmera do dispositivo:', err);
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permissão de câmera negada. Conceda acesso à câmera nas configurações do navegador.'
          : 'Não foi possível acessar a câmera do dispositivo.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setRecordedVideoBlob(null);
      setRecordedVideoUrl(null);
      setIsRecording(false);
      setRecordingSeconds(0);
      startCamera(facingMode, mode);
    } else {
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [isOpen, facingMode, mode]);

  const cleanupStream = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  // Capture frame from video feed (PHOTO MODE)
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      // Mirror front camera naturally
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);

    // Stop active camera stream while previewing captured photo
    cleanupStream();
  };

  // Start Video Recording
  const handleStartRecording = () => {
    if (!stream) return;

    videoChunksRef.current = [];
    let recorder: MediaRecorder;

    try {
      // Try with mp4, webm or standard defaults
      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        recorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        recorder = new MediaRecorder(stream, options);
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } else {
        recorder = new MediaRecorder(stream);
      }
    } catch (e) {
      console.warn('Pre-specified mimeType unsupported, using standard encoder:', e);
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        videoChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const mime = recorder.mimeType || 'video/mp4';
      const videoBlob = new Blob(videoChunksRef.current, { type: mime });
      const url = URL.createObjectURL(videoBlob);
      setRecordedVideoBlob(videoBlob);
      setRecordedVideoUrl(url);

      // Stop camera stream while reviewing
      cleanupStream();
    };

    recorder.start(100); // chunk every 100ms
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingSeconds(0);

    // Increment recording clock
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => {
        const next = prev + 1;
        // Auto-stop at 15 seconds limit to optimize file transfer and storage
        if (next >= 15) {
          handleStopRecording();
        }
        return next;
      });
    }, 1000);
  };

  // Stop Video Recording
  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setRecordedVideoBlob(null);
    setRecordedVideoUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    startCamera(facingMode, mode);
  };

  const handleConfirm = () => {
    if (mode === 'photo' && capturedPhoto) {
      onCapture(capturedPhoto, 'image');
      onClose();
    } else if (mode === 'video' && recordedVideoBlob) {
      // Convert Blob to Base64 dataURL
      const reader = new FileReader();
      reader.onerror = () => {
        setError('Erro ao converter arquivo de vídeo.');
      };
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onCapture(base64, 'video');
        onClose();
      };
      reader.readAsDataURL(recordedVideoBlob);
    }
  };

  if (!isOpen) return null;

  const hasCapturedMedia = capturedPhoto || recordedVideoUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            {mode === 'photo' ? (
              <Camera className="w-4 h-4 text-[var(--senda-accent)]" />
            ) : (
              <Video className="w-4 h-4 text-[var(--senda-accent)]" />
            )}
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only shown before capture) */}
        {!hasCapturedMedia && (
          <div className="flex border-b border-neutral-900 bg-neutral-900/40">
            <button
              type="button"
              onClick={() => setMode('photo')}
              disabled={isRecording}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'photo'
                  ? 'text-white border-b-2 border-[var(--senda-accent)] bg-white/5'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              } disabled:opacity-50`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('video')}
              disabled={isRecording}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                mode === 'video'
                  ? 'text-white border-b-2 border-[var(--senda-accent)] bg-white/5'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              } disabled:opacity-50`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vídeo (Máx 15s)</span>
            </button>
          </div>
        )}

        {/* Viewfinder / Preview Area */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {capturedPhoto ? (
            /* Captured snapshot review */
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
          ) : recordedVideoUrl ? (
            /* Recorded video review */
            <video
              src={recordedVideoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : error ? (
            /* Error state */
            <div className="p-6 text-center max-w-xs space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs text-neutral-300 leading-relaxed">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => startCamera(facingMode, mode)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            /* Live Camera Stream */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {isStarting && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <RefreshCw className="w-4 h-4 animate-spin text-[var(--senda-accent)]" />
                    <span>Iniciando câmera...</span>
                  </div>
                </div>
              )}

              {/* Viewfinder Reticle Guide */}
              <div className="absolute inset-8 border border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <span className="w-3 h-3 border-t-2 border-l-2 border-white/60" />
                  <span className="w-3 h-3 border-t-2 border-r-2 border-white/60" />
                </div>
                <div className="flex justify-between">
                  <span className="w-3 h-3 border-b-2 border-l-2 border-white/60" />
                  <span className="w-3 h-3 border-b-2 border-r-2 border-white/60" />
                </div>
              </div>

              {/* Video Recording Status HUD Overlay */}
              {isRecording && (
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-500/30 flex items-center gap-2 text-xs font-mono">
                  <Circle className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse shrink-0" />
                  <span className="font-bold text-rose-500">REC</span>
                  <span>0:{recordingSeconds.toString().padStart(2, '0')} / 0:15</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-950 flex items-center justify-between">
          {hasCapturedMedia ? (
            /* Confirm or Retake */
            <div className="flex items-center justify-between w-full gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={handleRetake}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                className="w-1/2"
              >
                Refazer Captura
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirm}
                leftIcon={<Check className="w-4 h-4" />}
                className="w-1/2"
              >
                {mode === 'photo' ? 'Usar Esta Foto' : 'Usar Este Vídeo'}
              </Button>
            </div>
          ) : (
            /* Camera Shutter & Flip */
            <div className="flex items-center justify-between w-full">
              {/* Flip camera button */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                disabled={isRecording}
                title="Trocar câmera (frontal / traseira)"
                className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Central Shutter / Record Trigger */}
              {mode === 'photo' ? (
                <button
                  type="button"
                  disabled={Boolean(error) || isStarting}
                  onClick={handleTakeSnapshot}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 bg-transparent hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  title="Capturar Foto"
                >
                  <div className="w-full h-full rounded-full bg-white active:bg-neutral-300 transition-colors" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(error) || isStarting}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`w-16 h-16 rounded-full border-4 ${
                    isRecording ? 'border-rose-500' : 'border-white'
                  } flex items-center justify-center p-1 bg-transparent hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none`}
                  title={isRecording ? 'Parar Gravação' : 'Gravar Vídeo'}
                >
                  <div 
                    className={`w-full h-full transition-all ${
                      isRecording ? 'rounded-md bg-rose-500 scale-75' : 'rounded-full bg-rose-600'
                    }`} 
                  />
                </button>
              )}

              {/* Cancel Close button */}
              <button
                type="button"
                onClick={onClose}
                disabled={isRecording}
                className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
