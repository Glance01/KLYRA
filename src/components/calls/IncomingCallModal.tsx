import React, { useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../ds/Avatar';
import { Phone, Video, PhoneOff, ShieldCheck, Bell, BellRing } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => 
    notificationService.getPermission()
  );

  // Trigger push alert when modal mounts with an incoming call
  useEffect(() => {
    if (incomingCall) {
      notificationService.showIncomingCallNotification(incomingCall, (action) => {
        if (action === 'accept') {
          acceptCall();
        } else if (action === 'reject') {
          rejectCall();
        }
      });
    }

    return () => {
      notificationService.clearIncomingCallNotification();
    };
  }, [incomingCall, acceptCall, rejectCall]);

  const handleRequestPushNotifications = async () => {
    const permission = await notificationService.requestPermission();
    setNotificationPermission(permission);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-[#121518] text-white border border-neutral-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in zoom-in-95">
        
        {/* Security and Push Status Badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chamada Segura E2EE</span>
          </div>

          {notificationPermission === 'granted' ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[11px] font-medium" title="Notificações push ativas em segundo plano">
              <BellRing className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Push Ativo</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestPushNotifications}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-medium hover:bg-amber-500/25 transition cursor-pointer"
              title="Ativar notificações push em segundo plano"
            >
              <Bell className="w-3 h-3 text-amber-300" />
              <span>Ativar Push</span>
            </button>
          )}
        </div>

        {/* Caller Avatar with Audio Waves */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-[var(--senda-accent)] p-1 animate-pulse shadow-2xl flex items-center justify-center">
            <Avatar
              name={incomingCall.caller.displayName}
              src={incomingCall.caller.avatarUrl}
              size="xl"
              className="w-26 h-26 text-3xl"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 p-2 rounded-full bg-emerald-500 text-white shadow-lg">
            {incomingCall.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </span>
        </div>

        {/* Caller Details */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-100">
            {incomingCall.caller.displayName}
          </h2>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            @{incomingCall.caller.username}
          </p>
          <p className="text-xs text-emerald-400 font-medium mt-2 animate-pulse">
            {incomingCall.type === 'video' ? 'Chamada de vídeo recebida...' : 'Chamada de voz recebida...'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-8 w-full pt-2">
          {/* Reject */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer"
              title="Recusar"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-neutral-400 font-medium">Recusar</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform animate-bounce cursor-pointer"
              title="Atender"
            >
              {incomingCall.type === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] text-emerald-400 font-semibold">Atender</span>
          </div>
        </div>
      </div>
    </div>
  );
};

