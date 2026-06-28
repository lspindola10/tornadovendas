import { useState, useEffect } from 'react';
import { Wifi, Router, Clock, Database, Check } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface HeaderProps {
  clientCount: number;
  totalMrr: number;
  isAdmin?: boolean;
}

export default function Header({ clientCount, totalMrr, isAdmin = true }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-blue-600 border-b border-blue-500 text-white" id="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo and Branding */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-blue-700/80 border border-blue-400/30 shadow-lg shadow-blue-500/10 overflow-hidden group">
              {/* Spinning decorative background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-orange-500/10 to-indigo-500/10 animate-spin" style={{ animationDuration: '8s' }}></div>
              
              {/* Tornado SVG */}
              <img src={logoImg} alt="Logo" className="w-10 h-10 relative z-10 animate-pulse object-contain" />

              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-blue-600 flex items-center justify-center z-20">
                <span className="block w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight uppercase font-sans">
                  <span className="text-white">Tornado</span> <span className="text-orange-500">Fibra</span>
                </h1>
                <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-blue-700/80 text-orange-400 border border-blue-500/30">
                  {isAdmin ? 'ERP v2.5' : 'Cliente'}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-sans font-medium">
                {isAdmin ? 'Ponto de Presença e Cadastro de Assinantes' : 'Adesão de Plano e Autocadastro'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Header or Portal Greeting */}
          {!isAdmin ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700/50 border border-blue-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-blue-50">
                Portal de Autoatendimento <span className="text-white">Tornado</span> <span className="text-orange-450">Fibra</span> • Autocadastro Rápido
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700/50 border border-blue-500/40">
                <Router className="w-4 h-4 text-cyan-300" />
                <div className="text-xs">
                  <span className="text-blue-150 block text-[9px] uppercase font-mono tracking-wider text-blue-200">Assinantes</span>
                  <span className="font-semibold text-white">{clientCount} Ativos</span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700/50 border border-blue-500/40">
                <Database className="w-4 h-4 text-indigo-200" />
                <div className="text-xs">
                  <span className="text-blue-150 block text-[9px] uppercase font-mono tracking-wider text-blue-200">Faturamento</span>
                  <span className="font-semibold text-indigo-200">
                    {totalMrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-700/30 text-blue-100 border border-transparent">
                <Clock className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-mono">{time}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
