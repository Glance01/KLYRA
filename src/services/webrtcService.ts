import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export interface CallSignalingDoc {
  id: string;
  caller: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  receiver: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'rejected' | 'ended' | 'busy';
  offer?: {
    type: string;
    sdp: string;
  };
  answer?: {
    type: string;
    sdp: string;
  };
  createdAt?: any;
  startedAt?: any;
  endedAt?: any;
}

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Tone & Ringtone Sound Synthesizer via Web Audio API (Zero external MP3 dependencies)
class CallAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private ringInterval: any = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  stopAll() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.activeOscillators = [];
    this.activeGainNodes.forEach(g => {
      try {
        g.disconnect();
      } catch (e) {}
    });
    this.activeGainNodes = [];
  }

  // Outgoing phone calling tone (Dual frequency 440Hz + 480Hz cadence)
  playOutgoingRing() {
    this.stopAll();
    const ctx = this.getContext();

    const triggerBeep = () => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);

      this.activeOscillators.push(osc1, osc2);
      this.activeGainNodes.push(gain);
    };

    triggerBeep();
    this.ringInterval = setInterval(triggerBeep, 3500);
  }

  // Incoming melodic ringtone pattern
  playIncomingRing() {
    this.stopAll();
    const ctx = this.getContext();

    const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50]; // C5, E5, G5, C6
    const triggerMelody = () => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const startTime = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = startTime + idx * 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.16);

        this.activeOscillators.push(osc);
        this.activeGainNodes.push(gain);
      });
    };

    triggerMelody();
    this.ringInterval = setInterval(triggerMelody, 2400);
  }

  // Connected chime
  playConnected() {
    this.stopAll();
    const ctx = this.getContext();
    const now = ctx.currentTime;

    [523.25, 659.25].forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  // End call beep
  playEnded() {
    this.stopAll();
    const ctx = this.getContext();
    const now = ctx.currentTime;

    [440, 330, 220].forEach((freq, i) => {
      const t = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }
}

export const callSoundPlayer = new CallAudioSynthesizer();

/**
 * Cria uma oferta WebRTC e registra o documento de chamada no Firestore
 */
export async function startRealWebRTCCall({
  caller,
  receiver,
  type,
  localStream,
  onRemoteStream,
  onCallStatusChange
}: {
  caller: UserProfile;
  receiver: UserProfile;
  type: 'audio' | 'video';
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onCallStatusChange: (status: 'ringing' | 'connected' | 'rejected' | 'ended') => void;
}): Promise<{
  callId: string;
  peerConnection: RTCPeerConnection;
  cleanup: () => void;
}> {
  if (caller.id === receiver.id || caller.username.toLowerCase() === receiver.username.toLowerCase()) {
    throw new Error('CANNOT_CALL_SELF');
  }

  callSoundPlayer.playOutgoingRing();

  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const callDocRef = doc(db, 'calls', callId);
  const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
  const receiverCandidatesCol = collection(db, 'calls', callId, 'receiverCandidates');

  const pc = new RTCPeerConnection(RTC_CONFIGURATION);
  const unsubs: Unsubscribe[] = [];

  // Adicionar faixas locais (áudio e vídeo)
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // Capturar faixas remotas da outra pessoa
  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    } else {
      const inboundStream = new MediaStream();
      inboundStream.addTrack(event.track);
      onRemoteStream(inboundStream);
    }
  };

  // Coletar ICE Candidates locais do chamador e salvar no Firestore
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidatesCol, event.candidate.toJSON()).catch(() => {});
    }
  };

  // Criar Oferta SDP
  const offerDescription = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: type === 'video'
  });
  await pc.setLocalDescription(offerDescription);

  const callPayload: CallSignalingDoc = {
    id: callId,
    caller: {
      id: caller.id,
      displayName: caller.displayName,
      username: caller.username,
      avatarUrl: caller.avatarUrl
    },
    receiver: {
      id: receiver.id,
      displayName: receiver.displayName,
      username: receiver.username,
      avatarUrl: receiver.avatarUrl
    },
    type,
    status: 'ringing',
    offer: {
      type: offerDescription.type,
      sdp: offerDescription.sdp || ''
    },
    createdAt: new Date().toISOString()
  };

  await setDoc(callDocRef, callPayload);

  // Escutar atualizações do documento de chamada (resposta e status)
  const unsubCall = onSnapshot(callDocRef, async (snapshot) => {
    const data = snapshot.data() as CallSignalingDoc | undefined;
    if (!data) return;

    if (data.status === 'connected') {
      callSoundPlayer.playConnected();
      onCallStatusChange('connected');

      if (!pc.currentRemoteDescription && data.answer) {
        const answerDesc = new RTCSessionDescription({
          type: data.answer.type as RTCSdpType,
          sdp: data.answer.sdp
        });
        await pc.setRemoteDescription(answerDesc).catch(console.warn);
      }
    } else if (data.status === 'rejected') {
      callSoundPlayer.playEnded();
      onCallStatusChange('rejected');
    } else if (data.status === 'ended') {
      callSoundPlayer.playEnded();
      onCallStatusChange('ended');
    }
  }, (err) => {
    console.warn('[WebRTC Call onSnapshot error]:', err);
  });
  unsubs.push(unsubCall);

  // Escutar ICE candidates do receptor
  const unsubCandidates = onSnapshot(receiverCandidatesCol, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data();
        const candidate = new RTCIceCandidate(candidateData);
        pc.addIceCandidate(candidate).catch(console.warn);
      }
    });
  }, (err) => {
    console.warn('[WebRTC Receiver Candidates onSnapshot error]:', err);
  });
  unsubs.push(unsubCandidates);

  const cleanup = () => {
    callSoundPlayer.stopAll();
    unsubs.forEach(u => u());
    try {
      pc.close();
    } catch (e) {}
  };

  return { callId, peerConnection: pc, cleanup };
}

/**
 * Atende uma chamada recebida, responde a oferta WebRTC e conecta o fluxo P2P
 */
export async function answerRealWebRTCCall({
  callId,
  localStream,
  onRemoteStream,
  onCallStatusChange
}: {
  callId: string;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onCallStatusChange: (status: 'ringing' | 'connected' | 'rejected' | 'ended') => void;
}): Promise<{
  peerConnection: RTCPeerConnection;
  cleanup: () => void;
}> {
  callSoundPlayer.stopAll();

  const callDocRef = doc(db, 'calls', callId);
  const snap = await getDoc(callDocRef);
  if (!snap.exists()) {
    throw new Error('CALL_NOT_FOUND');
  }

  const callData = snap.data() as CallSignalingDoc;
  if (!callData.offer) {
    throw new Error('NO_OFFER_IN_CALL');
  }

  const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
  const receiverCandidatesCol = collection(db, 'calls', callId, 'receiverCandidates');

  const pc = new RTCPeerConnection(RTC_CONFIGURATION);
  const unsubs: Unsubscribe[] = [];

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    } else {
      const inboundStream = new MediaStream();
      inboundStream.addTrack(event.track);
      onRemoteStream(inboundStream);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(receiverCandidatesCol, event.candidate.toJSON()).catch(() => {});
    }
  };

  // Configurar descrição remota a partir da oferta do chamador
  const offerDescription = new RTCSessionDescription({
    type: callData.offer.type as RTCSdpType,
    sdp: callData.offer.sdp
  });
  await pc.setRemoteDescription(offerDescription);

  // Criar resposta
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  // Atualizar documento de chamada no Firestore
  await updateDoc(callDocRef, {
    status: 'connected',
    startedAt: new Date().toISOString(),
    answer: {
      type: answerDescription.type,
      sdp: answerDescription.sdp || ''
    }
  });

  callSoundPlayer.playConnected();
  onCallStatusChange('connected');

  // Escutar ICE candidates do chamador
  const unsubCandidates = onSnapshot(callerCandidatesCol, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data();
        const candidate = new RTCIceCandidate(candidateData);
        pc.addIceCandidate(candidate).catch(console.warn);
      }
    });
  }, (err) => {
    console.warn('[WebRTC Caller Candidates onSnapshot error]:', err);
  });
  unsubs.push(unsubCandidates);

  // Escutar encerramento da chamada
  const unsubCall = onSnapshot(callDocRef, (snapshot) => {
    const data = snapshot.data() as CallSignalingDoc | undefined;
    if (!data) return;
    if (data.status === 'ended' || data.status === 'rejected') {
      callSoundPlayer.playEnded();
      onCallStatusChange('ended');
    }
  }, (err) => {
    console.warn('[WebRTC Call status onSnapshot error]:', err);
  });
  unsubs.push(unsubCall);

  const cleanup = () => {
    callSoundPlayer.stopAll();
    unsubs.forEach(u => u());
    try {
      pc.close();
    } catch (e) {}
  };

  return { peerConnection: pc, cleanup };
}

/**
 * Recusa uma chamada recebida
 */
export async function rejectRealCall(callId: string): Promise<void> {
  callSoundPlayer.stopAll();
  try {
    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, {
      status: 'rejected',
      endedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Erro ao rejeitar chamada:', e);
  }
}

/**
 * Encerra uma chamada ativa
 */
export async function endRealCall(callId: string): Promise<void> {
  callSoundPlayer.playEnded();
  try {
    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, {
      status: 'ended',
      endedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Erro ao encerrar chamada:', e);
  }
}

/**
 * Escuta chamadas recebidas em tempo real para o usuário atual
 */
export function listenForIncomingCalls(
  currentUserId: string,
  onIncomingCall: (call: CallSignalingDoc) => void
): () => void {
  if (!currentUserId) return () => {};

  const callsCol = collection(db, 'calls');
  const q = query(callsCol, where('receiver.id', '==', currentUserId), where('status', '==', 'ringing'));

  const unsub = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const callData = { id: change.doc.id, ...change.doc.data() } as CallSignalingDoc;
        onIncomingCall(callData);
      }
    });
  }, (err) => {
    console.warn('Escuta de chamadas recebidas:', err);
  });

  return unsub;
}
