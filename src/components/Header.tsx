import { useState, useEffect } from 'react';
import { Wifi, Router, Clock, Database, Check, LogOut, ShieldCheck, Lock, PhoneCall } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { useAuth } from '../lib/AuthContext';

interface HeaderProps {
  clientCount: number;
  totalMrr: number;
  isAdmin?: boolean;
}

export default function Header({ clientCount, totalMrr, isAdmin = true }: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const { appUser, logout } = useAuth();

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

  // 1. VISÃO DO CLIENTE (PORTAL DE AUTOCADASTRO / VENDAS)
  if (!isAdmin) {
    return (
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs" id="customer-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo and Branding do Cliente */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-800 shadow-md shadow-blue-500/20 overflow-hidden shrink-0">
                <img src={logoImg} alt="Logo Tornado Fibra" className="w-9 h-9 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight uppercase font-sans">
                    <span className="text-slate-900">Tornado</span> <span className="text-orange-500">Fibra</span>
                  </h1>
                  <span className="hidden sm:inline-block text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Loja Oficial
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans font-medium">
                  Internet 100% Fibra Óptica • Provedor Autorizado ANATEL
                </p>
              </div>
            </div>

            {/* Selo de Segurança e Botão WhatsApp */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ambiente Seguro • SSL 256-bit</span>
              </div>

              <a
                href="https://wa.me/559884112100?text=Ol%C3%A1!%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20os%20planos%20de%20fibra%20da%20Tornado."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5A] text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-[#25D366]/20 transition-all hover:scale-105"
                title="Falar no WhatsApp com um consultor"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.386 0 12.033c0 2.128.552 4.195 1.603 6.012L.266 23.361l5.485-1.439a11.967 11.967 0 006.28 1.761h.004c6.645 0 12.03-5.386 12.03-12.033C24 5.386 18.615 0 12.031 0zm.004 21.684c-1.802 0-3.567-.485-5.11-1.399l-.366-.217-3.8.997 1.015-3.704-.239-.38C2.531 15.352 2 13.722 2 12.033 2 6.49 6.49 2 12.035 2 17.579 2 22 6.49 22 12.033 22 17.575 17.579 21.684 12.035 21.684zm5.518-7.534c-.302-.151-1.791-.884-2.068-.985-.276-.101-.478-.151-.679.151-.201.302-.781.985-.956 1.186-.176.201-.352.226-.654.075-2.071-1.037-3.376-1.785-4.665-3.565-.176-.251.018-.389.168-.539.136-.136.302-.352.453-.528.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.528-.075-.151-.679-1.635-.931-2.239-.245-.589-.494-.509-.679-.518-.176-.009-.377-.009-.578-.009-.201 0-.528.075-.805.377-.276.302-1.056 1.031-1.056 2.515 0 1.484 1.082 2.917 1.233 3.118.151.201 2.128 3.25 5.155 4.555.72.311 1.282.497 1.722.637.723.23 1.381.197 1.9.119.584-.087 1.791-.732 2.043-1.439.252-.707.252-1.311.176-1.439-.075-.127-.277-.202-.579-.353z"/></svg>
                <span className="hidden sm:inline">Dúvidas? Fale no WhatsApp</span>
                <span className="sm:hidden">WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      </header>
    );
  }

  // 2. VISÃO DO PAINEL ADMINISTRATIVO (ERP DA EQUIPE)
  return (
    <header className="bg-[#0B192C] border-b border-[#1E293B] text-white sticky top-0 z-40 shadow-md" id="admin-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo and Branding do Admin */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#0F223D] border border-[#1E3A5F] shadow-md overflow-hidden group shrink-0">
              <img src={logoImg} alt="Logo Tornado" className="w-8 h-8 object-contain" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0B192C]"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight uppercase font-sans">
                  <span className="text-white">Tornado</span> <span className="text-orange-500">Fibra</span>
                </h1>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md bg-[#0F223D] text-blue-300 border border-[#1E3A5F]">
                  ERP Vendas
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans font-medium">
                Gestão de Contratos e Autoatendimento
              </p>
            </div>
          </div>

          {/* Métricas do Topo e Perfil */}
          <div className="flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 text-sm">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F223D]/90 border border-[#1E3A5F]">
              <Router className="w-4 h-4 text-blue-400" />
              <div className="text-xs">
                <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400">Assinantes</span>
                <span className="font-bold text-white">{clientCount} Ativos</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F223D]/90 border border-[#1E3A5F]">
              <Database className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400">Faturamento</span>
                <span className="font-bold text-emerald-400">
                  {totalMrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            {/* Informações do Usuário e Botão de Sair */}
            <div className="flex items-center gap-3 pl-0 lg:pl-3 lg:border-l border-[#1E293B]">
              {appUser && (
                <>
                  <div className="text-right hidden sm:block text-xs">
                    <span className="block font-bold text-white tracking-wide">{appUser.name}</span>
                    <span className="block text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      {appUser.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-400" />}
                      {appUser.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-400/30 flex items-center justify-center font-black text-white text-xs shadow-sm">
                    {appUser.name.charAt(0).toUpperCase()}
                  </div>
                </>
              )}
              
              <button
                onClick={logout}
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#0F223D] hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 border border-[#1E3A5F] rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                title="Sair do sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
