import React, { useState, useEffect } from 'react';
import { Client, PlanId, DueDate, ClientStatus, PLANS, DUE_DATES } from '../types';
import { Search, Eye, Filter, Edit, Trash2, Calendar, HardDrive, MapPin, CheckCircle, Clock, AlertTriangle, AlertCircle, CloudDownload, RefreshCw } from 'lucide-react';
import { checkClientInIxc } from '../lib/ixcService';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, state: ClientStatus) => void;
  onSyncIxc?: (client: Client) => Promise<any>;
}

export default function ClientTable({ clients, onEdit, onDelete, onStatusChange, onSyncIxc }: ClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('todos');
  const [filterDueDate, setFilterDueDate] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPeriod, setFilterPeriod] = useState<string>('todos');
  const [customMonth, setCustomMonth] = useState<string>('');
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [modalIxcError, setModalIxcError] = useState<string | null>(null);

  const handleOpenDetailModal = (client: Client) => {
    setModalIxcError(null);
    setSelectedClientDetail(client);
  };

  const handleCloseDetailModal = () => {
    setModalIxcError(null);
    setSelectedClientDetail(null);
  };
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [ixcLookupState, setIxcLookupState] = useState<{
    loading: boolean;
    exists?: boolean;
    ixcId?: string;
    razao?: string;
  }>({ loading: false });

  // Mantém a modal sincronizada quando o cliente receber o ixcId em tempo real
  useEffect(() => {
    if (selectedClientDetail) {
      const updated = clients.find(c => c.id === selectedClientDetail.id);
      if (updated && (updated.ixcId !== selectedClientDetail.ixcId || updated.status !== selectedClientDetail.status)) {
        setSelectedClientDetail(updated);
      }
    }
  }, [clients, selectedClientDetail]);

  // Consulta proativa no IXC ao abrir a ficha do cliente para checar se o CPF já existe
  useEffect(() => {
    if (selectedClientDetail && !selectedClientDetail.ixcId && selectedClientDetail.cpf) {
      let isMounted = true;
      setIxcLookupState({ loading: true });
      checkClientInIxc(selectedClientDetail.cpf)
        .then(res => {
          if (isMounted) {
            if (res.success && res.exists && res.ixcId) {
              setIxcLookupState({
                loading: false,
                exists: true,
                ixcId: res.ixcId,
                razao: res.razao
              });
            } else {
              setIxcLookupState({ loading: false, exists: false });
            }
          }
        })
        .catch(() => {
          if (isMounted) setIxcLookupState({ loading: false });
        });
      return () => {
        isMounted = false;
      };
    } else {
      setIxcLookupState({ loading: false });
    }
  }, [selectedClientDetail?.id, selectedClientDetail?.ixcId, selectedClientDetail?.cpf]);

  const handleSyncClick = async (client: Client) => {
    if (!onSyncIxc) return;
    setSyncingId(client.id);
    setModalIxcError(null);
    try {
      const res = await onSyncIxc(client);
      if (res && res.success === false) {
        setModalIxcError(res.error || 'Falha ao processar cadastro no IXC.');
      } else if (res && res.success) {
        setModalIxcError(null);
      }
    } catch (err: any) {
      setModalIxcError(err?.message || 'Falha desconhecida na integração.');
    } finally {
      setSyncingId(null);
    }
  };

  // Filtragem dos dados
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cpf.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan = filterPlan === 'todos' || client.planId === filterPlan;
    const matchesDueDate = filterDueDate === 'todos' || client.dueDate === parseInt(filterDueDate);
    const matchesStatus = filterStatus === 'todos' || client.status === filterStatus;

    let matchesPeriod = true;
    if (filterPeriod !== 'todos') {
      if (!client.createdAt) {
        matchesPeriod = false;
      } else {
        const clientDate = new Date(client.createdAt);
        if (isNaN(clientDate.getTime())) {
          matchesPeriod = false;
        } else {
          const now = new Date();
          if (filterPeriod === 'hoje') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            matchesPeriod = clientDate >= startOfToday;
          } else if (filterPeriod === '7dias') {
            const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
            matchesPeriod = clientDate >= startOf7Days;
          } else if (filterPeriod === '15dias') {
            const startOf15Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15, 0, 0, 0, 0);
            matchesPeriod = clientDate >= startOf15Days;
          } else if (filterPeriod === '30dias') {
            const startOf30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
            matchesPeriod = clientDate >= startOf30Days;
          } else if (filterPeriod === 'este-mes') {
            matchesPeriod =
              clientDate.getFullYear() === now.getFullYear() &&
              clientDate.getMonth() === now.getMonth();
          } else if (filterPeriod === 'mes-anterior') {
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            matchesPeriod =
              clientDate.getFullYear() === prevMonthDate.getFullYear() &&
              clientDate.getMonth() === prevMonthDate.getMonth();
          } else if (filterPeriod === 'custom-mes') {
            if (customMonth) {
              const [yStr, mStr] = customMonth.split('-');
              const targetYear = parseInt(yStr, 10);
              const targetMonth = parseInt(mStr, 10) - 1;
              matchesPeriod =
                clientDate.getFullYear() === targetYear &&
                clientDate.getMonth() === targetMonth;
            } else {
              matchesPeriod = true;
            }
          }
        }
      }
    }

    return matchesSearch && matchesPlan && matchesDueDate && matchesStatus && matchesPeriod;
  });

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ativo
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Instalação Pendente
          </span>
        );
      case 'Bloqueado':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Bloqueado
          </span>
        );
    }
  };

  // Função para exportar os dados visíveis compatível 100% com Excel (ponto-e-vírgula e UTF-8 BOM)
  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;
    
    const headers = [
      'ID',
      'Nome do Cliente',
      'CPF',
      'Telefone',
      'Email',
      'Plano',
      'Mensalidade (R$)',
      'Vencimento',
      'Status',
      'Origem',
      'Endereço',
      'Bairro',
      'Cidade',
      'CEP',
      'Data do Cadastro'
    ];

    const rows = filteredClients.map(c => {
      const plan = PLANS.find(p => p.id === c.planId);
      const planLabel = plan ? `${plan.speed} (${plan.name})` : c.planId;
      const priceLabel = plan ? plan.price.toFixed(2).replace('.', ',') : '';
      const origin = c.selfRegistered ? 'Auto Atendimento' : (c.registeredBy || 'Sistema');
      const addressFull = c.address ? `${c.address}, Nº ${c.number || 'S/N'}${c.addressReference ? ` (${c.addressReference})` : ''}` : '';

      return [
        c.id,
        c.name.trim(),
        c.cpf,
        c.phone,
        c.email,
        planLabel,
        priceLabel,
        `Dia ${c.dueDate}`,
        c.status,
        origin,
        addressFull,
        c.neighborhood || '',
        c.city || '',
        c.cep || '',
        c.createdAt ? new Date(c.createdAt).toLocaleString('pt-BR') : ''
      ];
    });

    const formatCell = (val: string | number | undefined | null) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).trim();
      return `"${str.replace(/"/g, '""')}"`;
    };

    const delimiter = ';';
    const csvContent = [
      headers.map(formatCell).join(delimiter),
      ...rows.map(row => row.map(formatCell).join(delimiter))
    ].join('\r\n');

    // Adiciona BOM (\uFEFF) para forçar o Excel no Windows a abrir em UTF-8 com acentos corretos
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_tornado_fibra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

   return (
    <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden" id="client-list-panel">
      
      {/* Controles de Filtro e Busca */}
      <div className="p-6 border-b border-slate-150 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-sans">
              Clientes Assinantes ({filteredClients.length})
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Busque, filtre contratos, verifique vencimentos e altere status de serviços
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredClients.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CloudDownload className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterPlan('todos');
                setFilterDueDate('todos');
                setFilterStatus('todos');
                setFilterPeriod('todos');
                setCustomMonth('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200/55"
              title="Limpar todos os filtros"
            >
              <RefreshCw className="w-3 h-3" />
              Resetar
            </button>
          </div>
        </div>

        {/* Atalhos Rápidos de Período de Cadastro */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-slate-200/70">
          <span className="text-[11px] text-slate-500 font-bold font-sans whitespace-nowrap flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            Cadastrado em:
          </span>
          {[
            { id: 'todos', label: 'Todo o Período' },
            { id: 'hoje', label: 'Hoje' },
            { id: '7dias', label: 'Últimos 7 dias' },
            { id: '15dias', label: 'Últimos 15 dias' },
            { id: '30dias', label: 'Últimos 30 dias' },
            { id: 'este-mes', label: 'Este Mês' },
            { id: 'mes-anterior', label: 'Mês Anterior' },
            { id: 'custom-mes', label: 'Escolher Mês 📅' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterPeriod(pill.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                filterPeriod === pill.id
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-orange-600 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              {pill.label}
            </button>
          ))}

          {filterPeriod === 'custom-mes' && (
            <div className="flex items-center gap-1.5 ml-1 animate-fade-in">
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="py-1 px-2.5 text-xs rounded-lg border border-orange-300 bg-orange-50/50 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
              />
              {customMonth && (
                <button
                  type="button"
                  onClick={() => setCustomMonth('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                >
                  Limpar mês
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Caixa de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cpf, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-cyan-550 focus:ring-1 focus:ring-cyan-505/10 transition-all font-sans"
            />
          </div>

          {/* Filtro por Plano */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold font-sans whitespace-nowrap">Plano:</span>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-750 focus:outline-hidden transition-all focus:border-cyan-500"
            >
              <option value="todos" className="bg-white text-slate-900">Todos os Planos</option>
              {PLANS.map(p => (
                <option key={p.id} value={p.id} className="bg-white text-slate-900">{p.speed} ({p.name})</option>
              ))}
            </select>
          </div>

          {/* Filtro por Dia de Vencimento */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-bold font-sans whitespace-nowrap">Venc.:</span>
            <select
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value)}
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-750 focus:outline-hidden transition-all focus:border-cyan-500"
            >
              <option value="todos" className="bg-white text-slate-900">Todos os Dias</option>
              {DUE_DATES.map(date => (
                <option key={date} value={date.toString()} className="bg-white text-slate-900">Dia {date}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Status da Conexão */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-550 font-bold font-sans whitespace-nowrap">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-750 focus:outline-hidden transition-all focus:border-cyan-500"
            >
              <option value="todos" className="bg-white text-slate-900">Todos Status</option>
              <option value="Ativo" className="bg-white text-slate-900">Instalações Ativas</option>
              <option value="Pendente" className="bg-white text-slate-900">Instalações Pendentes</option>
              <option value="Bloqueado" className="bg-white text-slate-900">Bloqueados</option>
            </select>
          </div>

        </div>
      </div>

      {/* Tabela Principal de Clientes */}
      <div className="overflow-x-auto">
        {filteredClients.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-full">Nome & Contato</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">Data Cadastro</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">Origem</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">IXC Soft</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">Plano Ativo</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">Mensalidade</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">Vencimento</th>
                <th className="py-3.5 px-3 text-center w-1 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-right w-1 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => {
                const planDetails = PLANS.find(p => p.id === client.planId) || PLANS[0];
                return (
                  <tr 
                    key={client.id} 
                    className="hover:bg-slate-50/80 transition-colors group text-sm text-slate-700"
                  >
                    
                    {/* Nome & Contato */}
                    <td className="py-4.5 px-4 text-left">
                      <div>
                        <p className="font-extrabold text-slate-900 font-sans group-hover:text-blue-600 transition-colors text-sm">
                          {client.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-sans mt-0.5">
                          <span className="font-mono text-[11px] text-slate-600">CPF: {client.cpf}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px]">{client.phone}</span>
                          {client.phone && (
                            <a
                              href={`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${client.name.split(' ')[0]}! Tudo bem? Sou da Tornado Fibra e estou acompanhando seu cadastro.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md transition-colors shadow-3xs"
                              title="Abrir conversa no WhatsApp"
                            >
                              <svg className="w-3 h-3 fill-[#25D366]" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.386 0 12.033c0 2.128.552 4.195 1.603 6.012L.266 23.361l5.485-1.439a11.967 11.967 0 006.28 1.761h.004c6.645 0 12.03-5.386 12.03-12.033C24 5.386 18.615 0 12.031 0zm.004 21.684c-1.802 0-3.567-.485-5.11-1.399l-.366-.217-3.8.997 1.015-3.704-.239-.38C2.531 15.352 2 13.722 2 12.033 2 6.49 6.49 2 12.035 2 17.579 2 22 6.49 22 12.033 22 17.575 17.579 21.684 12.035 21.684zm5.518-7.534c-.302-.151-1.791-.884-2.068-.985-.276-.101-.478-.151-.679.151-.201.302-.781.985-.956 1.186-.176.201-.352.226-.654.075-2.071-1.037-3.376-1.785-4.665-3.565-.176-.251.018-.389.168-.539.136-.136.302-.352.453-.528.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.528-.075-.151-.679-1.635-.931-2.239-.245-.589-.494-.509-.679-.518-.176-.009-.377-.009-.578-.009-.201 0-.528.075-.805.377-.276.302-1.056 1.031-1.056 2.515 0 1.484 1.082 2.917 1.233 3.118.151.201 2.128 3.25 5.155 4.555.72.311 1.282.497 1.722.637.723.23 1.381.197 1.9.119.584-.087 1.791-.732 2.043-1.439.252-.707.252-1.311.176-1.439-.075-.127-.277-.202-.579-.353z"/></svg>
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                          {client.email}
                        </p>
                      </div>
                    </td>

                    {/* Data do Cadastro */}
                    <td className="py-4.5 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-800">
                          {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          {new Date(client.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Origem */}
                    <td className="py-4.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center justify-center">
                        {client.selfRegistered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                            Autoatendimento
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200" title={`Cadastrado por: ${client.registeredBy || 'Sistema'}`}>
                            {client.registeredBy || 'Painel'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* IXC Soft Status Inteligente */}
                    <td className="py-4.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center">
                        {client.ixcId ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs"
                            title={`Cadastrado no IXC Soft com ID: ${client.ixcId}`}
                          >
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            IXC #{client.ixcId}
                          </span>
                        ) : client.ixcStatus?.toLowerCase().includes('já') || client.ixcStatus?.toLowerCase().includes('duplicado') || client.ixcStatus?.toLowerCase().includes('encontrado') ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(client)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer shadow-3xs"
                            title={client.ixcStatus || "Cliente já possui cadastro no IXC. Clique para vincular."}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Já no IXC
                          </button>
                        ) : onSyncIxc ? (
                          <button
                            type="button"
                            onClick={() => handleSyncClick(client)}
                            disabled={syncingId === client.id}
                            className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer disabled:opacity-50 shadow-3xs"
                            title="Enviar cadastro ao ERP IXC Soft"
                          >
                            <RefreshCw className={`w-3 h-3 text-slate-500 ${syncingId === client.id ? 'animate-spin text-blue-600' : ''}`} />
                            {syncingId === client.id ? 'Enviando...' : '+ Enviar IXC'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Pendente</span>
                        )}
                      </div>
                    </td>

                    {/* Plano Ativo */}
                    <td className="py-4.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center justify-center">
                        <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-md ${planDetails.badgeBg}`}>
                          {planDetails.speed}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{planDetails.name}</span>
                      </div>
                    </td>

                    {/* Preço do plano */}
                    <td className="py-4.5 px-3 text-center font-black text-slate-900 whitespace-nowrap text-sm">
                      R$ {planDetails.price.toFixed(2).replace('.', ',')}
                    </td>

                    {/* Vencimento da Fatura */}
                    <td className="py-4.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Dia {client.dueDate}
                      </span>
                    </td>

                    {/* Status do Cliente (Sem botão verde gigante poluindo a coluna) */}
                    <td className="py-4.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {getStatusBadge(client.status)}
                      </div>
                    </td>

                    {/* Ações (WhatsApp, Detalhes, Editar, Deletar) */}
                    <td className="py-4.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        
                        {/* Botão rápido para conversar/notificar no WhatsApp */}
                        {client.phone && (
                          <a
                            href={`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Obrigado por escolher a TORNADO FIBRA.\nSeu cadastro já foi processado com sucesso e sua instalação será realizada em até 24 horas.\n\nAguarde nosso contato. Assim que o técnico estiver a caminho da sua residência, avisaremos a você.\n\nTORNADO FIBRA — Conectando você ao Mundo.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200/80 cursor-pointer transition-colors shadow-3xs"
                            title="Notificar cliente via WhatsApp"
                          >
                            <svg className="w-4 h-4 fill-emerald-600" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.386 0 12.033c0 2.128.552 4.195 1.603 6.012L.266 23.361l5.485-1.439a11.967 11.967 0 006.28 1.761h.004c6.645 0 12.03-5.386 12.03-12.033C24 5.386 18.615 0 12.031 0zm.004 21.684c-1.802 0-3.567-.485-5.11-1.399l-.366-.217-3.8.997 1.015-3.704-.239-.38C2.531 15.352 2 13.722 2 12.033 2 6.49 6.49 2 12.035 2 17.579 2 22 6.49 22 12.033 22 17.575 17.579 21.684 12.035 21.684zm5.518-7.534c-.302-.151-1.791-.884-2.068-.985-.276-.101-.478-.151-.679.151-.201.302-.781.985-.956 1.186-.176.201-.352.226-.654.075-2.071-1.037-3.376-1.785-4.665-3.565-.176-.251.018-.389.168-.539.136-.136.302-.352.453-.528.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.528-.075-.151-.679-1.635-.931-2.239-.245-.589-.494-.509-.679-.518-.176-.009-.377-.009-.578-.009-.201 0-.528.075-.805.377-.276.302-1.056 1.031-1.056 2.515 0 1.484 1.082 2.917 1.233 3.118.151.201 2.128 3.25 5.155 4.555.72.311 1.282.497 1.722.637.723.23 1.381.197 1.9.119.584-.087 1.791-.732 2.043-1.439.252-.707.252-1.311.176-1.439-.075-.127-.277-.202-.579-.353z"/></svg>
                          </a>
                        )}

                        {/* Botão rápido para detalhar endereço */}
                        <button
                          onClick={() => handleOpenDetailModal(client)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 border border-slate-200 cursor-pointer transition-colors shadow-3xs"
                          title="Ver detalhes de instalação"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botão de Edição */}
                        <button
                          onClick={() => onEdit(client)}
                          className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 cursor-pointer transition-colors shadow-3xs"
                          title="Editar cadastro do assinante"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Botão de Exclusão */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja apagar o registro de ${client.name}?`)) {
                              onDelete(client.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors shadow-3xs"
                          title="Remover cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 px-6 text-center bg-slate-50/50">
            <AlertTriangle className="w-10 h-10 text-orange-550 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Nenhum assinante encontrado para os filtros aplicados</p>
            <p className="text-xs text-slate-500 mt-1">Experimente alterar o período de cadastro, remover o termo de busca ou clicar em <strong>Resetar</strong></p>
          </div>
        )}
      </div>

      {/* Info extra de rodapé da tabela */}
      <div className="bg-slate-50/60 py-3.5 px-6 border-t border-slate-150 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <span>Mostrando <strong>{filteredClients.length}</strong> de <strong>{clients.length}</strong> assinantes inscritos</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ativos: {clients.filter(c => c.status === 'Ativo').length}
          </span>
          <span className="flex items-center gap-1 border-l border-slate-200 pl-4">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Pendentes: {clients.filter(c => c.status === 'Pendente').length}
          </span>
          <span className="flex items-center gap-1 border-l border-slate-200 pl-4">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Bloqueados: {clients.filter(c => c.status === 'Bloqueado').length}
          </span>
        </div>
      </div>

      {/* Modal / Card de Detalhes do Cliente Selecionado */}
      {selectedClientDetail && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={handleCloseDetailModal}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do popup */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-black uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Ficha Completa de Conferência • Instalação
                </span>
                <h4 className="text-base font-black mt-1 text-white max-w-[280px] truncate">{selectedClientDetail.name}</h4>
              </div>
              <button 
                onClick={handleCloseDetailModal} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do popup */}
            <div className="p-6 space-y-4 text-sm text-slate-650 bg-white max-h-[75vh] overflow-y-auto">
              
              {/* Plano e Vencimento */}
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Plano Selecionado</span>
                  <span className="text-sm font-black text-blue-700">
                    {PLANS.find(p => p.id === selectedClientDetail.planId)?.speed} ({PLANS.find(p => p.id === selectedClientDetail.planId)?.name})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Preço / Vencimento</span>
                  <span className="text-sm font-black text-slate-900">
                    R$ {PLANS.find(p => p.id === selectedClientDetail.planId)?.price.toFixed(2).replace('.', ',')} • Dia {selectedClientDetail.dueDate}
                  </span>
                </div>
              </div>

              {/* Informações IXC Soft */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Sistema IXC Soft</span>
                {selectedClientDetail.ixcId ? (
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 mt-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Cadastrado no IXC Soft • ID #{selectedClientDetail.ixcId} (Sincronizado)</span>
                  </div>
                ) : ixcLookupState.loading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600" />
                    <span>Consultando se este CPF já existe no IXC...</span>
                  </div>
                ) : ixcLookupState.exists && ixcLookupState.ixcId ? (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-left">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-black text-amber-900 block">
                          Cliente Já Cadastrado no IXC Soft!
                        </span>
                        <span className="text-amber-800 text-[11px] block mt-0.5">
                          Encontrado como <strong>{ixcLookupState.razao}</strong> (ID #{ixcLookupState.ixcId}).
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 font-bold mt-1">
                    Novo Cliente (Não consta cadastro prévio no IXC)
                  </p>
                )}
              </div>

              {/* Contato rápida */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Dados de Contato & Filiação</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 font-sans text-xs">
                  <p className="text-slate-800"><strong>CPF:</strong> {selectedClientDetail.cpf}</p>
                  <p className="text-slate-800"><strong>Telefone:</strong> {selectedClientDetail.phone}</p>
                  <p className="text-slate-800 sm:col-span-2"><strong>E-mail:</strong> {selectedClientDetail.email}</p>
                  {selectedClientDetail.naturalidade && (
                    <p className="text-slate-800"><strong>Naturalidade:</strong> {selectedClientDetail.naturalidade}</p>
                  )}
                  {selectedClientDetail.birthDate && (
                    <p className="text-slate-800"><strong>Nascimento:</strong> {selectedClientDetail.birthDate.split('-').reverse().join('/')}</p>
                  )}
                  {(selectedClientDetail.motherName || selectedClientDetail.fatherName) && (
                    <div className="sm:col-span-2 text-slate-800 text-xs bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Filiação</span>
                      {selectedClientDetail.motherName && <p><strong>Mãe:</strong> {selectedClientDetail.motherName}</p>}
                      {selectedClientDetail.fatherName && <p className="mt-0.5"><strong>Pai:</strong> {selectedClientDetail.fatherName}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço Completo de Instalação Física */}
              <div className="space-y-2 border-t border-slate-150 pt-3 text-left">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" /> Endereço de Instalação Física (CTO)
                </span>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 space-y-1 font-sans text-xs">
                  <p className="font-black text-slate-900 text-sm">
                    {selectedClientDetail.address}, Nº {selectedClientDetail.number}
                  </p>
                  <p className="text-slate-600">
                    Bairro {selectedClientDetail.neighborhood} • CEP {selectedClientDetail.cep}
                  </p>
                  <p className="text-slate-500">
                    {selectedClientDetail.city}
                  </p>
                  {selectedClientDetail.addressReference && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg mt-1 text-xs text-amber-900">
                      <strong className="block text-amber-950 font-black mb-0.5">Ponto de Referência:</strong>
                      {selectedClientDetail.addressReference}
                    </div>
                  )}
                </div>
              </div>

              {/* Serviços Adicionais Opcionais */}
              {selectedClientDetail.additionalServices.length > 0 && (
                <div className="border-t border-slate-150 pt-3 space-y-1.5 text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Adicionais Contratados</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClientDetail.additionalServices.map((srv, index) => (
                      <span key={index} className="inline-block text-[10px] font-bold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="border-t border-slate-150 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">Mudar status rápido:</span>
                <div className="flex gap-1" id="quick-action-status">
                  {(['Ativo', 'Pendente', 'Bloqueado'] as ClientStatus[]).map(state => (
                    <button
                      key={state}
                      onClick={() => {
                        onStatusChange(selectedClientDetail.id, state);
                        setSelectedClientDetail(prev => prev ? { ...prev, status: state } : null);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-md border transition-all cursor-pointer ${
                        selectedClientDetail.status === state
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Rodapé popup com as Ações de Conferência */}
            <div className="bg-slate-50 p-4 border-t border-slate-150 space-y-2.5">
              
              {/* Alerta de Erro IXC visível dentro da própria modal */}
              {modalIxcError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2.5 text-xs text-left animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-black text-rose-950 mb-0.5">Aviso do IXC Soft:</strong>
                    <p className="leading-relaxed">{modalIxcError}</p>
                  </div>
                </div>
              )}

              {/* Botão de Envio / Aprovação no IXC */}
              {!selectedClientDetail.ixcId && onSyncIxc && (
                <button
                  type="button"
                  onClick={() => handleSyncClick(selectedClientDetail)}
                  disabled={syncingId === selectedClientDetail.id}
                  className={`w-full py-3 rounded-xl text-white font-black text-xs cursor-pointer flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 ${
                    ixcLookupState.exists && ixcLookupState.ixcId
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 ring-2 ring-blue-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 ring-2 ring-emerald-500/30'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {syncingId === selectedClientDetail.id
                    ? 'Processando no IXC...'
                    : ixcLookupState.exists && ixcLookupState.ixcId
                      ? `🔗 Vincular a este Cadastro Existente no IXC (#${ixcLookupState.ixcId})`
                      : '🚀 Dados Conferidos! Aprovar e Cadastrar no IXC'}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const clientToEdit = selectedClientDetail;
                    handleCloseDetailModal();
                    onEdit(clientToEdit);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-600" />
                  ✏️ Corrigir / Editar Dados
                </button>

                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-black cursor-pointer transition-colors"
                >
                  📁 Fechar Ficha
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Ícon auxiliar X para fechar modal se não estiver disponível antes
function X({ className, ...props }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className} 
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
