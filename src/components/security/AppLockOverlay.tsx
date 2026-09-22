import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SendaLogo } from '../ds/SendaLogo';
import { Lock, Delete } from 'lucide-react';

export const AppLockOverlay: React.FC = () => {
  const { isLocked, unlockApp } = useAuth();
  const [pinInput, setPinInput] = useState('');
  const [errorShake, setErrorShake] = useState(false);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        const success = unlockApp(nextPin);
        if (!success) {
          setErrorShake(true);
          setTimeout(() => {
            setPinInput('');
            setErrorShake(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B0D0F] flex flex-col items-center justify-center p-6 text-white select-none">
      <div className={`w-full max-w-xs flex flex-col items-center text-center ${errorShake ? 'animate-bounce' : ''}`}>
        <div className="mb-6">
          <SendaLogo size={48} showText={false} />
        </div>

        <div className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-[var(--senda-accent)] mb-3">
          <Lock className="w-5 h-5" />
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-1">
          SENDA Bloqueado
        </h2>

        <p className="text-xs text-neutral-400 mb-6">
          Digite seu PIN de segurança para desbloquear.
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-3 mb-8">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                idx < pinInput.length
                  ? 'bg-[var(--senda-accent)] scale-110'
                  : 'bg-neutral-800 border border-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 active:scale-95 text-lg font-semibold flex items-center justify-center transition-all cursor-pointer"
            >
              {digit}
            </button>
          ))}

          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 active:scale-95 text-lg font-semibold flex items-center justify-center transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800/50 active:scale-95 text-sm flex items-center justify-center text-neutral-400 transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
