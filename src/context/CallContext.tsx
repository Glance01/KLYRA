import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { useAuth } from './AuthContext';
import { 
  startRealWebRTCCall, 
  answerRealWebRTCCall, 
  rejectRealCall, 
  endRealCall, 
  listenForIncomingCalls, 
  CallSignalingDoc,
  callSoundPlayer 
} from '../services/webrtcService';
import { notificationService } from '../services/notificationService';

export interface ActiveCallState {
  callId: string;
  contact: UserProfile;
  type: 'audio' | 'video';
  isCaller: boolean;
  isEchoTest?: boolean;
  status: 'initiating' | 'ringing' | 'connected' | 'rejected' | 'ended';
  durationSeconds: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaker: boolean;
  isScreenSharing: boolean;
}

interface CallContextType {
  activeCall: ActiveCallState | null;
  incomingCall: CallSignalingDoc | null;
  errorMessage: string | null;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  startCall: (contact: UserProfile, type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  toggleScreenShare: () => Promise<void>;
  clearError: () => void;
  isMinimized: boolean;
  setIsMinimized: (min: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSignalingDoc | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const echoAudioCtxRef = useRef<AudioContext | null>(null);

  // Escuta de chamadas recebidas via Firestore quando o usuário está logado
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = listenForIncomingCalls(currentUser.id, (call) => {
      // Se já estiver em outra chamada, ignora ou marca como ocupado
      if (activeCall) return;
      
      callSoundPlayer.playIncomingRing();
      setIncomingCall(call);

      // Disparar notificação Push do Sistema (alerta em segundo plano / tela bloqueada)
      notificationService.showIncomingCallNotification(call, (action) => {
        if (action === 'accept') {
          acceptCall();
        } else if (action === 'reject') {
          rejectCall();
        }
      });
    });

    // Escutar cliques em botões de ação vindos do Service Worker
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.action === 'accept') {
        acceptCall();
      } else if (event.data?.action === 'reject') {
        rejectCall();
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      unsubscribe();
      callSoundPlayer.stopAll();
      notificationService.clearIncomingCallNotification();
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [currentUser?.id, Boolean(activeCall)]);

  // Contador de tempo de chamada ativa
  useEffect(() => {
    let interval: any;
    if (activeCall && activeCall.status === 'connected') {
      interval = setInterval(() => {
        setActiveCall(prev => prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Conecta o remoteStream ao elemento <audio> de saída real para garantir som nos alto-falantes
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch((err) => {
        console.warn('AutoPlay de áudio remoto pausado pelo navegador:', err);
      });
    }
  }, [remoteStream]);

  // Iniciar chamada
  const startCall = useCallback(async (contact: UserProfile, type: 'audio' | 'video') => {
    if (!currentUser) return;

    // REGRA FUNDAMENTAL: Não deve ligar para si mesmo
    if (contact.id === currentUser.id || contact.username?.toLowerCase() === currentUser.username?.toLowerCase()) {
      setErrorMessage('Não é possível efetuar chamadas para si mesmo. Selecione outro contato ou experimente o Teste de Linha.');
      return;
    }

    setErrorMessage(null);
    setIsMinimized(false);

    // MODO ESPECIAL: Teste de Linha / Eco de Voz (Real Audio Loopback)
    if (contact.id === 'echo_test') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);

        // Configurar loopback de áudio com ligeiro delay para teste de microfone real
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        echoAudioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.35; // 350ms delay natural de eco de teste
        const gain = ctx.createGain();
        gain.gain.value = 0.8;

        source.connect(delay);
        delay.connect(gain);
        gain.connect(ctx.destination);

        setActiveCall({
          callId: `echo_${Date.now()}`,
          contact,
          type: 'audio',
          isCaller: true,
          isEchoTest: true,
          status: 'connected',
          durationSeconds: 0,
          isMuted: false,
          isVideoEnabled: false,
          isSpeaker: true,
          isScreenSharing: false
        });

        callSoundPlayer.playConnected();
      } catch (err) {
        setErrorMessage('Não foi possível acessar seu microfone para o teste. Verifique as permissões.');
      }
      return;
    }

    // MODO NORMAL: WebRTC Real P2P Call
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        // Fallback: se falhar o vídeo, tenta apenas áudio
        if (type === 'video') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw mediaErr;
        }
      }

      setLocalStream(stream);

      setActiveCall({
        callId: 'pending',
        contact,
        type,
        isCaller: true,
        status: 'initiating',
        durationSeconds: 0,
        isMuted: false,
        isVideoEnabled: type === 'video' && stream.getVideoTracks().length > 0,
        isSpeaker: true,
        isScreenSharing: false
      });

      const { callId, cleanup } = await startRealWebRTCCall({
        caller: currentUser,
        receiver: contact,
        type,
        localStream: stream,
        onRemoteStream: (remStream) => {
          setRemoteStream(remStream);
        },
        onCallStatusChange: (status) => {
          setActiveCall(prev => prev ? { ...prev, status } : null);
          if (status === 'rejected' || status === 'ended') {
            setTimeout(() => {
              endCall();
            }, 1200);
          }
        }
      });

      cleanupRef.current = cleanup;
      setActiveCall(prev => prev ? { ...prev, callId, status: 'ringing' } : null);
    } catch (err: any) {
      callSoundPlayer.stopAll();
      if (err.message === 'CANNOT_CALL_SELF') {
        setErrorMessage('Não é possível efetuar chamadas para si mesmo.');
      } else {
        setErrorMessage('Permissão de microfone ou câmera negada no dispositivo.');
      }
      setActiveCall(null);
    }
  }, [currentUser]);

  // Atender chamada recebida
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !currentUser) return;
    callSoundPlayer.stopAll();
    notificationService.clearIncomingCallNotification();

    const incoming = incomingCall;
    setIncomingCall(null);
    setIsMinimized(false);

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: incoming.type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      setLocalStream(stream);

      const callerProfile: UserProfile = {
        id: incoming.caller.id,
        displayName: incoming.caller.displayName,
        username: incoming.caller.username,
        avatarUrl: incoming.caller.avatarUrl,
        deviceId: 'DEV_P2P_' + incoming.caller.id.substring(0, 8),
        presence: { 
          status: 'available', 
          customMessage: 'Em chamada',
          visibility: 'everyone',
          updatedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      };

      setActiveCall({
        callId: incoming.id,
        contact: callerProfile,
        type: incoming.type,
        isCaller: false,
        status: 'initiating',
        durationSeconds: 0,
        isMuted: false,
        isVideoEnabled: incoming.type === 'video' && stream.getVideoTracks().length > 0,
        isSpeaker: true,
        isScreenSharing: false
      });

      const { cleanup } = await answerRealWebRTCCall({
        callId: incoming.id,
        localStream: stream,
        onRemoteStream: (remStream) => {
          setRemoteStream(remStream);
        },
        onCallStatusChange: (status) => {
          setActiveCall(prev => prev ? { ...prev, status } : null);
          if (status === 'ended' || status === 'rejected') {
            setTimeout(() => {
              endCall();
            }, 1200);
          }
        }
      });

      cleanupRef.current = cleanup;
      setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
    } catch (err) {
      setErrorMessage('Erro ao atender chamada: verifique as permissões de mídia.');
      if (incoming.id) {
        rejectRealCall(incoming.id).catch(() => {});
      }
      setActiveCall(null);
    }
  }, [incomingCall, currentUser]);

  // Recusar chamada recebida
  const rejectCall = useCallback(async () => {
    if (incomingCall) {
      callSoundPlayer.stopAll();
      const callId = incomingCall.id;
      setIncomingCall(null);
      await rejectRealCall(callId).catch(() => {});
    }
  }, [incomingCall]);

  // Encerrar chamada
  const endCall = useCallback(async () => {
    callSoundPlayer.stopAll();
    
    if (activeCall?.callId && !activeCall.isEchoTest) {
      endRealCall(activeCall.callId).catch(() => {});
    }

    if (echoAudioCtxRef.current) {
      try {
        echoAudioCtxRef.current.close();
      } catch (e) {}
      echoAudioCtxRef.current = null;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setActiveCall(null);
    setIsMinimized(false);
  }, [activeCall, localStream]);

  // Controle de Mute
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const newMuted = !(activeCall?.isMuted ?? false);
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !newMuted;
    });
    setActiveCall(prev => prev ? { ...prev, isMuted: newMuted } : null);
  }, [localStream, activeCall?.isMuted]);

  // Controle de Vídeo (Ligar / Desligar câmera)
  const toggleVideo = useCallback(async () => {
    if (!activeCall) return;
    const willEnable = !activeCall.isVideoEnabled;

    if (willEnable) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (localStream) {
          localStream.addTrack(videoTrack);
        }
        setActiveCall(prev => prev ? { ...prev, isVideoEnabled: true, type: 'video' } : null);
      } catch (e) {
        setErrorMessage('Não foi possível ativar a câmera.');
      }
    } else {
      if (localStream) {
        localStream.getVideoTracks().forEach(t => {
          t.stop();
          localStream.removeTrack(t);
        });
      }
      setActiveCall(prev => prev ? { ...prev, isVideoEnabled: false } : null);
    }
  }, [activeCall, localStream]);

  // Controle de Viva-voz
  const toggleSpeaker = useCallback(() => {
    setActiveCall(prev => prev ? { ...prev, isSpeaker: !prev.isSpeaker } : null);
  }, []);

  // Compartilhamento de tela
  const toggleScreenShare = useCallback(async () => {
    if (!activeCall) return;
    if (activeCall.isScreenSharing) {
      setActiveCall(prev => prev ? { ...prev, isScreenSharing: false } : null);
    } else {
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = screenStream.getVideoTracks()[0];
          screenTrack.onended = () => {
            setActiveCall(prev => prev ? { ...prev, isScreenSharing: false } : null);
          };
          setActiveCall(prev => prev ? { ...prev, isScreenSharing: true } : null);
        } else {
          setErrorMessage('Compartilhamento de tela indisponível no navegador atual.');
        }
      } catch (e) {
        // Cancelado pelo usuário
      }
    }
  }, [activeCall]);

  const clearError = () => setErrorMessage(null);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        errorMessage,
        remoteStream,
        localStream,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        toggleScreenShare,
        clearError,
        isMinimized,
        setIsMinimized
      }}
    >
      {children}

      {/* Áudio real de saída escondido para streaming de voz do interlocutor */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
