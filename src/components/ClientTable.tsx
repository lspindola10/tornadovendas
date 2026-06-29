import React, { useState } from 'react';
import { Client, PlanId, DueDate, ClientStatus, PLANS, DUE_DATES } from '../types';
import { Search, Eye, Filter, Edit, Trash2, Calendar, HardDrive, MapPin, CheckCircle, Clock, AlertTriangle, CloudDownload, RefreshCw } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, state: ClientStatus) => void;
}

export default function ClientTable({ clients, onEdit, onDelete, onStatusChange }: ClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('todos');
  const [filterDueDate, setFilterDueDate] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);

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

    return matchesSearch && matchesPlan && matchesDueDate && matchesStatus;
  });

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse shadow-sm shadow-emerald-400/50"></span>
            Ativo
          </span>
        );
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-450 animate-ping"></span>
            Instalação Pendente
          </span>
        );
      case 'Bloqueado':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-450"></span>
            Bloqueado
          </span>
        );
    }
  };

  // Função para exportar os dados visíveis como CSV simples
  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;
    
    const headers = ['ID', 'Nome', 'CPF', 'Email', 'Telefone', 'Plano', 'Vencimento', 'Status', 'Cidade'];
    const rows = filteredClients.map(c => [
      c.id,
      c.name,
      c.cpf,
      c.email,
      c.phone,
      c.planId,
      `Dia ${c.dueDate}`,
      c.status,
      c.city
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_provedor_internet_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200/55"
              title="Limpar todos os filtros"
            >
              <RefreshCw className="w-3 h-3" />
              Resetar
            </button>
          </div>
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
              <tr className="bg-slate-50/75 border-b border-slate-150 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="py-3 px-4 w-full">Nome & Contato</th>
                <th className="py-3 px-2 text-center w-1 whitespace-nowrap">Data do Cadastro</th>
                <th className="py-3 px-2 text-center w-1 whitespace-nowrap">Origem</th>
                <th className="py-3 px-2 text-center w-1 whitespace-nowrap">Plano Ativo</th>
                <th className="py-3 px-2 text-center w-1 whitespace-nowrap">Mensalidade</th>
                <th className="py-3 px-2 text-center w-1 whitespace-nowrap">Vencimento</th>
                <th className="py-3 px-2 text-center w-1 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right w-1 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => {
                const planDetails = PLANS.find(p => p.id === client.planId) || PLANS[0];
                return (
                  <tr 
                    key={client.id} 
                    className="hover:bg-slate-50/70 transition-colors group text-sm text-slate-655"
                  >
                    
                    {/* Nome & Contato */}
                    <td className="py-4 px-4 text-left">
                      <div>
                        <p className="font-extrabold text-slate-900 font-sans group-hover:text-cyan-600 transition-colors">
                          {client.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                          CPF: {client.cpf} • {client.phone}
                        </p>
                        <p className="text-[11px] text-slate-450 font-sans">
                          {client.email}
                        </p>
                      </div>
                    </td>

                    {/* Data do Cadastro */}
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[11px] font-bold text-slate-700">
                          {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          <Clock className="w-2.5 h-2.5 inline mr-1" />
                          {new Date(client.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Origem */}
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center justify-center">
                        {client.selfRegistered ? (
                          <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200">
                            Auto Atendimento
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200" title={`Cadastrado por: ${client.registeredBy || 'Sistema'}`}>
                            Usuário: {client.registeredBy || 'Sistema'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Plano Ativo */}
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center justify-center">
                        <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${planDetails.badgeBg}`}>
                          {planDetails.speed}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">{planDetails.name}</span>
                      </div>
                    </td>

                    {/* Preço do plano */}
                    <td className="py-4 px-2 text-center font-bold text-slate-900 whitespace-nowrap">
                      R$ {planDetails.price.toFixed(2)}
                    </td>

                    {/* Vencimento da Fatura */}
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono text-slate-700 bg-slate-55 border border-slate-200/90 px-2 py-1 rounded">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Dia {client.dueDate}
                      </span>
                    </td>

                    {/* Status do Cliente */}
                    <td className="py-4 px-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        {getStatusBadge(client.status)}
                        {client.status === 'Pendente' && client.phone && (
                          <a
                            href={`https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Obrigado por escolher a TORNADO FIBRA.\nSeu cadastro já foi processado com sucesso e sua instalação será realizada em até 24 horas.\n\nAguarde nosso contato. Assim que o técnico estiver a caminho da sua residência, avisaremos a você.\n\nTORNADO FIBRA — Conectando você ao Mundo.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full gap-1.5 px-2 py-1.5 bg-[#25D366] hover:bg-[#1EBE5A] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors shadow-sm shadow-[#25D366]/20 whitespace-nowrap"
                            title="Enviar mensagem no WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.386 0 12.033c0 2.128.552 4.195 1.603 6.012L.266 23.361l5.485-1.439a11.967 11.967 0 006.28 1.761h.004c6.645 0 12.03-5.386 12.03-12.033C24 5.386 18.615 0 12.031 0zm.004 21.684c-1.802 0-3.567-.485-5.11-1.399l-.366-.217-3.8.997 1.015-3.704-.239-.38C2.531 15.352 2 13.722 2 12.033 2 6.49 6.49 2 12.035 2 17.579 2 22 6.49 22 12.033 22 17.575 17.579 21.684 12.035 21.684zm5.518-7.534c-.302-.151-1.791-.884-2.068-.985-.276-.101-.478-.151-.679.151-.201.302-.781.985-.956 1.186-.176.201-.352.226-.654.075-2.071-1.037-3.376-1.785-4.665-3.565-.176-.251.018-.389.168-.539.136-.136.302-.352.453-.528.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.528-.075-.151-.679-1.635-.931-2.239-.245-.589-.494-.509-.679-.518-.176-.009-.377-.009-.578-.009-.201 0-.528.075-.805.377-.276.302-1.056 1.031-1.056 2.515 0 1.484 1.082 2.917 1.233 3.118.151.201 2.128 3.25 5.155 4.555.72.311 1.282.497 1.722.637.723.23 1.381.197 1.9.119.584-.087 1.791-.732 2.043-1.439.252-.707.252-1.311.176-1.439-.075-.127-.277-.202-.579-.353z"/></svg>
                            Notificar Cliente
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Ações (Editar, Detalhes, Deletar, Bloquear/Ativar rápidos) */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        
                        {/* Botão rápido para detalhar endereço */}
                        <button
                          onClick={() => setSelectedClientDetail(client)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-550 hover:text-cyan-600 border border-slate-200/80 hover:border-cyan-500/20 cursor-pointer transition-colors"
                          title="Ver detalhes de instalação"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botão de Edição */}
                        <button
                          onClick={() => onEdit(client)}
                          className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/50 cursor-pointer transition-colors"
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
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 cursor-pointer transition-colors"
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
            <p className="text-sm font-semibold text-slate-700">Nenhum assinante encontrado para o filtro aplicado</p>
            <p className="text-xs text-slate-500 mt-1">Experimente remover a busca ou selecionar 'Todos os Planos'</p>
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
          onClick={() => setSelectedClientDetail(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do popup */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">Ordem de Instalação Físico-Lógica</span>
                <h4 className="text-base font-bold mt-1 text-white max-w-[280px] truncate">{selectedClientDetail.name}</h4>
              </div>
              <button 
                onClick={() => setSelectedClientDetail(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 border border-slate-750 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do popup */}
            <div className="p-6 space-y-4 text-sm text-slate-650 bg-white">
              
              {/* Plano e Vencimento */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Plano Selecionado</span>
                  <span className="text-sm font-extrabold text-cyan-600">
                    {PLANS.find(p => p.id === selectedClientDetail.planId)?.speed} ({PLANS.find(p => p.id === selectedClientDetail.planId)?.name})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Vencimento</span>
                  <span className="text-sm font-black text-slate-950">Dia {selectedClientDetail.dueDate}</span>
                </div>
              </div>

              {/* Contato rápida */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Dados de Contato</span>
                <p className="text-slate-800"><strong>CPF:</strong> {selectedClientDetail.cpf}</p>
                <p className="text-slate-800"><strong>Telefone:</strong> {selectedClientDetail.phone}</p>
                <p className="text-slate-800"><strong>E-mail:</strong> {selectedClientDetail.email}</p>
                {selectedClientDetail.naturalidade && (
                  <p className="text-slate-800"><strong>Naturalidade:</strong> {selectedClientDetail.naturalidade}</p>
                )}
                {selectedClientDetail.birthDate && (
                  <p className="text-slate-800"><strong>Nascimento:</strong> {selectedClientDetail.birthDate.split('-').reverse().join('/')}</p>
                )}
                {(selectedClientDetail.motherName || selectedClientDetail.fatherName) && (
                  <div className="text-slate-800 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150 mt-1">
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block mb-1">Filiação</span>
                    {selectedClientDetail.motherName && <p><strong>Mãe:</strong> {selectedClientDetail.motherName}</p>}
                    {selectedClientDetail.fatherName && <p className="mt-0.5"><strong>Pai:</strong> {selectedClientDetail.fatherName}</p>}
                  </div>
                )}
              </div>

              {/* Endereço Completo de Instalação Física */}
              <div className="space-y-2 border-t border-slate-150 pt-3 text-left">
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" /> Endereço de Entrega/Instalação
                </span>
                <p className="font-extrabold text-slate-900">
                  {selectedClientDetail.address}, Nº {selectedClientDetail.number}
                </p>
                <p className="text-slate-600">
                  Bairro {selectedClientDetail.neighborhood} • CEP {selectedClientDetail.cep}
                </p>
                <p className="text-slate-500 text-xs">
                  {selectedClientDetail.city}
                </p>
                {selectedClientDetail.addressReference && (
                  <div className="bg-orange-500/5 border border-orange-500/10 p-2.5 rounded-lg mt-1 text-xs text-orange-850">
                    <strong className="block text-orange-900 mb-0.5">Ponto de Referência:</strong>
                    {selectedClientDetail.addressReference}
                  </div>
                )}
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
                <span className="text-xs text-slate-500">Mudar status rápido:</span>
                <div className="flex gap-1" id="quick-action-status">
                  {(['Ativo', 'Pendente', 'Bloqueado'] as ClientStatus[]).map(state => (
                    <button
                      key={state}
                      onClick={() => {
                        onStatusChange(selectedClientDetail.id, state);
                        setSelectedClientDetail(prev => prev ? { ...prev, status: state } : null);
                      }}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                        selectedClientDetail.status === state
                          ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-650 text-white border-orange-600'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Rodapé popup */}
            <div className="bg-slate-50 p-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setSelectedClientDetail(null)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 text-white rounded-lg text-xs font-black cursor-pointer transition-colors uppercase tracking-wider"
              >
                Entendi, Fechar
              </button>
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
