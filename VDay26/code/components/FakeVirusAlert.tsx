
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Terminal, Cpu, Info } from 'lucide-react';

interface FakeVirusAlertProps {
  onClear: () => void;
}

export const FakeVirusAlert: React.FC<FakeVirusAlertProps> = ({ onClear }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F2F2F7] p-4 font-sans selection:bg-blue-200">
      {/* Subtle Desktop Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#ffffff_0%,_#E5E5EA_100%)] pointer-events-none" />
      
      {/* Sharp macOS Light Mode Modal */}
      <div className="relative w-full max-w-[420px] bg-white/90 backdrop-blur-2xl border border-gray-200 rounded-[20px] shadow-[0_30px_60px_rgba(0,0,0,0.12)] p-8 flex flex-col items-center animate-in fade-in zoom-in duration-500">
        
        {/* Apple Style Alert Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <AlertTriangle size={56} className="text-[#FFCC00] fill-[#FFCC00]/10" strokeWidth={1.5} />
            <div className="absolute inset-0 animate-pulse bg-[#FFCC00]/10 rounded-full scale-150 -z-10 blur-xl" />
          </div>
        </div>

        <h1 className="text-[#1D1D1F] text-xl font-bold mb-3 tracking-tight">
          System Security Warning
        </h1>
        
        <div className="text-center space-y-4 mb-8">
          <p className="text-[#86868B] text-[14px] leading-relaxed">
            MacOS has detected a critical threat attempting to access your keychain and system resources.
          </p>

          <div className="bg-[#F5F5F7] rounded-xl p-4 border border-gray-100 shadow-inner">
            <p className="text-[11px] font-bold text-[#FF3B30] uppercase tracking-wider mb-1">Infection Detected</p>
            <p className="text-[#1D1D1F] font-mono font-bold text-base">MONKEY_VIRUS.EXE</p>
          </div>
          
          {/* Primal/Monkey Debug Info - Simplified & Sharp */}
          <div className="bg-white rounded-lg border border-gray-100 p-3 text-left space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-2 text-[11px] text-[#86868B] font-mono uppercase tracking-tighter">
              <Terminal size={10} />
              <span>Kernel logs</span>
            </div>
            <div className="font-mono text-[10px] text-[#424245] leading-tight border-l-2 border-[#007AFF] pl-2">
              <p>&gt; Accessing kernel... <span className="text-blue-500">Unauthorized</span></p>
              <p>&gt; Hijacking mouse driver... <span className="text-blue-500">Done</span></p>
              <p>&gt; Monkey business detected{dots}</p>
              <p>&gt; Primating file system...</p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col space-y-3">
          <button
            onClick={onClear}
            className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0077ED] text-white font-semibold rounded-xl transition-all active:scale-[0.97] shadow-[0_4px_12px_rgba(0,122,255,0.3)] text-sm"
          >
            Remove Monkey Virus
          </button>
          
          <button
            className="w-full py-2.5 text-[#007AFF] text-sm font-medium hover:underline transition-all cursor-not-allowed opacity-40"
            disabled
          >
            Show Technical Details
          </button>
        </div>

        {/* Bottom Status Branding */}
        <div className="mt-8 flex items-center space-x-3 text-[#C7C7CC] opacity-60">
          <div className="flex items-center space-x-1.5">
            <Cpu size={12} />
            <span className="text-[9px] font-medium tracking-widest uppercase">Silicon Shield Active</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center space-x-1.5">
            <Info size={12} />
            <span className="text-[9px] font-medium tracking-widest uppercase">Protocol 419</span>
          </div>
        </div>
      </div>

      {/* Subtle bottom-right signature */}
      <div className="fixed bottom-6 right-6 flex items-center space-x-2 opacity-10 select-none">
        <div className="w-4 h-4 rounded-full bg-black" />
        <span className="text-xs font-semibold text-black uppercase tracking-widest">Anti-Primate v2.5</span>
      </div>
    </div>
  );
};
