import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../ds/Avatar';
import { 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Minimize2, 
  Maximize2, 
  MonitorUp, 
  Sparkles,
  Radio
} from 'lucide-react';

export const ActiveCallOverlay: React.FC = () => {
  const {
    activeCall,
    remoteStream,
    localStream,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    toggleScreenShare,
    isMinimized,
    setIsMinimized
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 20, 25, 18, 30, 22, 16, 28, 20, 15]);

  // Attach local media stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.isVideoEnabled]);

  // Attach remote media stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.type]);

  // Real-time audio waveform visualizer from active stream
  useEffect(() => {
    const streamToAnalyze = remoteStream || localStream;
    if (!streamToAnalyze || activeCall?.isMuted) return;

    let animFrame: number;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(streamToAnalyze);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWave = () => {
        analyser.getByteFrequencyData(dataArray);
        const sampleSlice = Array.from(dataArray.slice(0, 10)).map(val => Math.max(10, Math.min(80, (val / 255) * 80)));
        setAudioLevels(sampleSlice);
        animFrame = requestAnimationFrame(updateWave);
      };

      updateWave();

      return () => {
        cancelAnimationFrame(animFrame);
        try {
          ctx.close();
        } catch (e) {}
      };
    } catch (e) {
      // Audio analysis fallback
    }
  }, [remoteStream, localStream, activeCall?.isMuted]);

  if (!activeCall) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Minimized PiP View
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 bg-[#121518] text-white p-3 rounded-2xl border border-neutral-700 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 select-none">
        <Avatar
          name={activeCall.contact.displayName}
          src={activeCall.contact.avatarUrl}
          size="sm"
        />
        <div className="text-left">
          <p className="text-xs font-bold truncate max-w-[120px]">{activeCall.contact.displayName}</p>
          <span className="text-[10px] font-mono text-emerald-400">
            {activeCall.status === 'connected' ? formatDuration(activeCall.durationSeconds) : 'Chamando...'}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            title={activeCall.isMuted ? 'Desmutar' : 'Mutar'}
          >
            {activeCall.isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            title="Expandir chamada"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={endCall}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            title="Desligar"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full Screen Active Call Stage
  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D0F] text-white flex flex-col justify-between p-4 sm:p-6 animate-in fade-in select-none">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-2xl w-full mx-auto z-20">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {activeCall.isEchoTest 
              ? 'Teste de Linha & Áudio em Tempo Real'
              : 'WebRTC P2P Criptografado Ponta a Ponta'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-neutral-300 bg-white/10 px-2.5 py-1 rounded-full">
            {activeCall.status === 'connected' 
              ? formatDuration(activeCall.durationSeconds) 
              : activeCall.status === 'ringing' 
                ? 'Chamando...' 
                : 'Conectando canal...'}
          </span>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            title="Minimizar chamada"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video or Voice Center Stage */}
      <div className="relative flex-1 flex items-center justify-center my-auto w-full max-w-2xl mx-auto overflow-hidden rounded-3xl bg-neutral-900 border border-white/10">
        
        {/* Screen share banner */}
        {activeCall.isScreenSharing && (
          <div className="absolute top-4 left-4 z-30 bg-emerald-500 text-neutral-950 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl animate-pulse">
            <MonitorUp className="w-3.5 h-3.5" />
            <span>Compartilhando Tela</span>
          </div>
        )}

        {/* Video Mode */}
        {activeCall.type === 'video' ? (
          <div className="relative w-full h-full min-h-[380px] flex items-center justify-center bg-black">
            {/* Remote Video Stream */}
            {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <Avatar
                  name={activeCall.contact.displayName}
                  src={activeCall.contact.avatarUrl}
                  size="xl"
                  className="w-24 h-24 mb-3"
                />
                <p className="text-xs text-neutral-400">Aguardando vídeo de {activeCall.contact.displayName}...</p>
              </div>
            )}

            {/* Local Video Stream (Self PiP) */}
            {activeCall.isVideoEnabled && (
              <div className="absolute top-4 right-4 w-28 h-36 rounded-2xl bg-neutral-800 border-2 border-white/20 overflow-hidden shadow-2xl flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 px-1 rounded text-white font-mono">Você</span>
              </div>
            )}
          </div>
        ) : (
          /* Voice Mode Display */
          <div className="flex flex-col items-center justify-center text-center space-y-5 p-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-[var(--senda-accent)] flex items-center justify-center shadow-2xl animate-pulse">
                <Avatar
                  name={activeCall.contact.displayName}
                  src={activeCall.contact.avatarUrl}
                  size="xl"
                  className="w-28 h-28 text-4xl"
                />
              </div>
              <span className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ring-4 ring-[#0B0D0F] ${
                activeCall.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-400 animate-ping'
              }`} />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
                {activeCall.contact.displayName}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-mono">
                {activeCall.isEchoTest
                  ? 'Fale ao microfone para ouvir o retorno em tempo real'
                  : activeCall.status === 'connected' 
                    ? 'Áudio de voz em tempo real ativo' 
                    : 'Chamando contato...'}
              </p>
            </div>

            {/* Real Audio Waveform Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-12 py-2">
              {audioLevels.map((lvl, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    activeCall.isMuted ? 'bg-neutral-600 h-1.5' : 'bg-emerald-400'
                  }`}
                  style={{
                    height: activeCall.isMuted ? '4px' : `${Math.max(6, lvl * 0.45)}px`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="max-w-md w-full mx-auto flex items-center justify-center gap-4 py-4 z-20">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition-colors cursor-pointer ${
            activeCall.isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={activeCall.isMuted ? 'Ativar microfone' : 'Silenciar'}
        >
          {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Video Toggle */}
        <button
          type="button"
          onClick={toggleVideo}
          className={`p-4 rounded-2xl transition-colors cursor-pointer ${
            !activeCall.isVideoEnabled ? 'bg-white/10 text-neutral-400' : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title={activeCall.isVideoEnabled ? 'Desligar câmera' : 'Ligar câmera'}
        >
          {!activeCall.isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        {/* Speaker Toggle */}
        <button
          type="button"
          onClick={toggleSpeaker}
          className={`p-4 rounded-2xl transition-colors cursor-pointer ${
            activeCall.isSpeaker ? 'bg-white/20 text-white' : 'bg-white/10 text-neutral-400'
          }`}
          title={activeCall.isSpeaker ? 'Viva-voz ativo' : 'Fone normal'}
        >
          {activeCall.isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`p-4 rounded-2xl transition-colors cursor-pointer ${
            activeCall.isScreenSharing ? 'bg-[var(--senda-accent)] text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Compartilhar tela"
        >
          <MonitorUp className="w-6 h-6" />
        </button>

        {/* End Call */}
        <button
          type="button"
          onClick={endCall}
          className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-xl active:scale-95 transition-transform cursor-pointer"
          title="Encerrar ligação"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
