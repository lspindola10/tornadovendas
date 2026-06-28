import { Client, PLANS } from '../types';
import { Users, TrendingUp, Calendar, AlertTriangle, Cpu } from 'lucide-react';

interface MetricCardProps {
  clients: Client[];
}

export default function MetricCard({ clients }: MetricCardProps) {
  // Calculando MRR (Faturamento recorrente do provedor)
  const totalMrr = clients.reduce((acc, client) => {
    if (client.status === 'Ativo') {
      const plan = PLANS.find(p => p.id === client.planId);
      return acc + (plan?.price || 0);
    }
    return acc;
  }, 0);

  const activeClients = clients.filter(c => c.status === 'Ativo').length;
  const pendingClients = clients.filter(c => c.status === 'Pendente').length;
  const blockedClients = clients.filter(c => c.status === 'Bloqueado').length;

  // Plano mais popular
  const planCounts = clients.reduce((acc, client) => {
    acc[client.planId] = (acc[client.planId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let mostPopularPlan = 'Nenhum';
  let maxCount = 0;
  Object.entries(planCounts).forEach(([planId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostPopularPlan = planId;
    }
  });

  const popularPlanDetails = PLANS.find(p => p.id === mostPopularPlan);

  // Porcentagem de conexões ultra-rápidas (>= 500 Mega ou 1 Giga)
  const ultraFastClients = clients.filter(c => c.planId === '500M' || c.planId === '600M' || c.planId === '1G').length;
  const ultraFastPercentage = clients.length > 0 ? Math.round((ultraFastClients / clients.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics-grid">
      
      {/* Total de Clientes */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-xs transition-all duration-300 group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">
              Base de Assinantes
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 font-sans tracking-tight">
              {clients.length}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {activeClients} ativos
              </span>
              {pendingClients > 0 && (
                <span className="inline-flex items-center text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {pendingClients} pendentes
                </span>
              )}
            </div>
          </div>
          <div className="bg-cyan-50 p-3 rounded-lg text-cyan-600 border border-cyan-100 group-hover:scale-110 transition-transform duration-200">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Faturamento Mensal Estimado (MRR) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-xs transition-all duration-300 group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">
              Faturamento Recorrente (MRR)
            </p>
            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mt-2 font-sans tracking-tight">
              {totalMrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              ★ faturamento ativo
            </p>
          </div>
          <div className="bg-orange-55/70 bg-orange-50 p-3 rounded-lg text-orange-600 border border-orange-100 group-hover:scale-110 transition-transform duration-200">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Plano Líder de Vendas */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-xs transition-all duration-300 group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">
              Plano Mais Vendido
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-2 font-sans tracking-tight">
              {popularPlanDetails ? popularPlanDetails.speed : 'N/A'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              {popularPlanDetails ? `${popularPlanDetails.name} (${maxCount} contr.)` : 'Sem dados'}
            </p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform duration-200">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Ultravelocidade (Conexões >= 500M) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-xs transition-all duration-300 group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">
              Média Ultra-Velocidade
            </p>
            <h3 className="text-3xl font-extrabold text-cyan-600 mt-2 font-sans tracking-tight">
              {ultraFastPercentage}%
            </h3>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 max-w-[140px] overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 via-red-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${ultraFastPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-cyan-50 p-3 rounded-lg text-cyan-600 border border-cyan-100 group-hover:scale-110 transition-transform duration-200">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
        </div>
      </div>

    </div>
  );
}
