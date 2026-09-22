// src/services/notificationService.ts
// Sistema de Notificações 100% Gratuito, Prático e Nativo do Navegador (Web Notification API + Service Worker + Web Audio API)
// Não requer Firebase Cloud Messaging (FCM) pago, chaves VAPID comerciais nem servidores externos.

import { CallSignalingDoc } from './webrtcService';

export interface MessageNotificationPayload {
  id: string;
  senderName: string;
  senderAvatar?: string;
  conversationId: string;
  conversationTitle?: string;
  textPreview: string;
}

class FreeNativeNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private activeCallNotification: Notification | null = null;
  private originalTitle: string = typeof document !== 'undefined' ? document.title : 'SENDA';
  private titleFlashInterval: any = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initServiceWorker();
      this.initVisibilityListener();
    }
  }

  // Inicializa o Service Worker padrão do navegador (sem custos)
  async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      let reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (!reg) {
        reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
      }
      this.swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('[SENDA Notificações Nativas] Registro do Service Worker:', err);
      return null;
    }
  }

  // Monitora visibilidade da janela para restaurar o título original
  private initVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.stopTitleFlash();
      }
    });

    window.addEventListener('focus', () => {
      this.stopTitleFlash();
    });
  }

  // Retorna status atual da permissão do navegador
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Solicita permissão gratuita nativa do navegador (1 clique)
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.initServiceWorker();
      }
      return permission;
    } catch (e) {
      console.warn('[SENDA Notificações Nativas] Erro ao solicitar permissão:', e);
      return 'denied';
    }
  }

  // Síntese de áudio ultraleve via Web Audio API (100% offline e sem arquivos pesados)
  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  // Toca um sino sutil e elegante para novas mensagens
  playMessageChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Primeiro tom harmônico (Fá#5 / 739.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(739.99, now);
      osc1.frequency.exponentialRampToValueAtTime(1108.73, now + 0.12); // Desliza para Dó#6

      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);

      // Segundo tom ressonante de sustentação
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1108.73, now + 0.08);

      gain2.gain.setValueAtTime(0.12, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (err) {
      // Ignorar caso políticas de autoplay do navegador restrinjam temporariamente
    }
  }

  // Pisca o título da aba do navegador para alertar o usuário mesmo se outras abas estiverem abertas
  flashTabTitle(alertText: string) {
    if (typeof document === 'undefined') return;
    this.stopTitleFlash();

    let toggle = false;
    this.titleFlashInterval = setInterval(() => {
      document.title = toggle ? alertText : `● ${alertText}`;
      toggle = !toggle;
    }, 1000);
  }

  stopTitleFlash() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
    }
    if (typeof document !== 'undefined') {
      document.title = this.originalTitle || 'SENDA • Mensagens Criptografadas';
    }
  }

  // Dispara Notificação Nativa Gratuita de Chamada Recebida
  async showIncomingCallNotification(call: CallSignalingDoc, onAction?: (action: 'accept' | 'reject') => void) {
    const callerName = call.caller.displayName || `@${call.caller.username}`;
    const callType = call.type === 'video' ? 'Vídeo' : 'Voz';
    const title = `📞 Chamada de ${callType} recebida`;
    const body = `${callerName} está chamando no SENDA E2EE. Toque para atender.`;

    // 1. Alerta na aba do navegador
    this.flashTabTitle(`📞 Chamada de ${callerName}`);

    // 2. Vibração física no dispositivo móvel
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 500]);
      } catch (e) {}
    }

    // 3. Notificação do Sistema Operacional (Desktop e Mobile)
    if (this.getPermission() === 'granted') {
      try {
        const reg = this.swRegistration || await this.initServiceWorker();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon: call.caller.avatarUrl || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'senda-incoming-call',
            renotify: true,
            requireInteraction: true,
            data: {
              callId: call.id,
              type: 'call',
              caller: call.caller
            },
            actions: [
              { action: 'accept', title: 'Atender' },
              { action: 'reject', title: 'Recusar' }
            ]
          } as any);
        } else {
          const notif = new Notification(title, {
            body,
            icon: call.caller.avatarUrl || '/favicon.ico',
            tag: 'senda-incoming-call',
            requireInteraction: true
          });

          notif.onclick = () => {
            window.focus();
            if (onAction) onAction('accept');
            notif.close();
          };

          this.activeCallNotification = notif;
        }
      } catch (err) {
        console.warn('[SENDA Notificações Nativas] Aviso ao exibir notificação:', err);
      }
    }
  }

  // Dispara Notificação Nativa Gratuita de Nova Mensagem Criptografada
  async showMessageNotification(payload: MessageNotificationPayload, onOpen?: () => void) {
    const title = `💬 ${payload.senderName}${payload.conversationTitle ? ` em ${payload.conversationTitle}` : ''}`;
    const body = payload.textPreview || 'Nova mensagem criptografada ponta a ponta recebida.';

    // 1. Sino sonoro Web Audio
    this.playMessageChime();

    // 2. Piscar título na aba
    this.flashTabTitle(`(1) Nova mensagem de ${payload.senderName}`);

    // 3. Vibração tátil
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch (e) {}
    }

    // 4. Notificação do Sistema
    if (this.getPermission() === 'granted') {
      try {
        const reg = this.swRegistration || await this.initServiceWorker();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon: payload.senderAvatar || '/favicon.ico',
            badge: '/favicon.ico',
            tag: `senda-msg-${payload.conversationId}`,
            renotify: true,
            data: {
              type: 'message',
              conversationId: payload.conversationId
            },
            actions: [
              { action: 'open', title: 'Abrir Chat' }
            ]
          } as any);
        } else {
          const notif = new Notification(title, {
            body,
            icon: payload.senderAvatar || '/favicon.ico',
            tag: `senda-msg-${payload.conversationId}`
          });

          notif.onclick = () => {
            window.focus();
            if (onOpen) onOpen();
            notif.close();
          };
        }
      } catch (err) {
        console.warn('[SENDA Notificações Nativas] Aviso ao exibir notificação de mensagem:', err);
      }
    }
  }

  // Limpa notificações ativas de chamada
  clearIncomingCallNotification() {
    this.stopTitleFlash();

    if (this.activeCallNotification) {
      this.activeCallNotification.close();
      this.activeCallNotification = null;
    }

    if (this.swRegistration) {
      this.swRegistration.getNotifications({ tag: 'senda-incoming-call' }).then((notifications) => {
        notifications.forEach((n) => n.close());
      }).catch(() => {});
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  }

  // Dispara uma notificação de teste completa para o usuário validar na hora
  async triggerTestNotification(): Promise<{ sound: boolean; vibration: boolean; nativeBanner: boolean }> {
    let soundSuccess = false;
    let vibrationSuccess = false;
    let bannerSuccess = false;

    // 1. Sempre executa o sino de áudio sintetizado Web Audio (independente de permissão do SO)
    try {
      this.playMessageChime();
      soundSuccess = true;
    } catch (e) {
      console.warn('[SENDA Teste] Erro no sintetizador de áudio:', e);
    }

    // 2. Sempre dispara a vibração tátil no smartphone se suportado
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 60, 120]);
        vibrationSuccess = true;
      } catch (e) {}
    }

    // 3. Tenta disparar o banner nativo do sistema operacional se autorizado
    try {
      let currentPermission = this.getPermission();
      if (currentPermission === 'default') {
        currentPermission = await this.requestPermission();
      }

      if (currentPermission === 'granted') {
        const reg = this.swRegistration || await this.initServiceWorker();
        const title = '✨ Notificações SENDA Ativas!';
        const body = 'Sistema de alertas sonoros e visuais 100% gratuito e nativo funcionando com perfeição.';

        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'senda-test-notification'
          } as any);
          bannerSuccess = true;
        } else if (typeof Notification !== 'undefined') {
          new Notification(title, {
            body,
            icon: '/favicon.ico'
          });
          bannerSuccess = true;
        }
      }
    } catch (err) {
      console.warn('[SENDA Teste] Banner nativo:', err);
    }

    return {
      sound: soundSuccess,
      vibration: vibrationSuccess,
      nativeBanner: bannerSuccess
    };
  }
}

export const notificationService = new FreeNativeNotificationService();
