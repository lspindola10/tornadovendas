import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function PendingApproval() {
  const { logout, appUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/20 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-200/50 text-center">
        <div className="p-8 sm:p-10 space-y-6">
          
          <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center shadow-inner">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Aguardando Aprovação</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Olá, <span className="font-bold text-slate-700">{appUser?.name}</span>! Sua conta foi criada com sucesso, mas o acesso ao painel ERP precisa ser liberado por um administrador.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 flex items-start gap-3 text-left">
            <ShieldAlert className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              Por favor, avise o administrador do sistema que você já realizou o cadastro para que ele possa aprovar o seu perfil.
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all border border-slate-300"
          >
            <LogOut className="w-4 h-4" />
            Sair e Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  );
}
