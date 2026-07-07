import React, { useState, useEffect } from 'react';
import { Client, PlanId, DueDate, ClientStatus, PLANS, DUE_DATES } from '../types';
import { isValidCPF } from '../lib/cpfValidator';
import { UserPlus, Save, Sparkles, MapPin, Phone, HelpCircle, FileText, Check, AlertCircle, RefreshCw, X } from 'lucide-react';

interface ClientFormProps {
  onSave: (client: Client) => void;
  editingClient: Client | null;
  onCancelEdit: () => void;
}

const INITIAL_FORM_STATE = {
  name: '',
  cpf: '',
  phone: '',
  email: '',
  cep: '',
  address: '',
  number: '',
  neighborhood: '',
  city: 'São Paulo', // valor padrão comum no mockup, atualizável via CEP
  planId: '300M' as PlanId,
  dueDate: 10 as DueDate,
  status: 'Ativo' as ClientStatus,
  additionalServices: [] as string[],
  naturalidade: '',
  birthDate: '',
  fatherName: '',
  motherName: '',
  addressReference: '',
};

export default function ClientForm({ onSave, editingClient, onCancelEdit }: ClientFormProps) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Efeito se estiver editando um cliente existente
  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name,
        cpf: editingClient.cpf,
        phone: editingClient.phone,
        email: editingClient.email,
        cep: editingClient.cep,
        address: editingClient.address,
        number: editingClient.number,
        neighborhood: editingClient.neighborhood,
        city: editingClient.city,
        planId: editingClient.planId,
        dueDate: editingClient.dueDate,
        status: editingClient.status,
        additionalServices: editingClient.additionalServices,
        naturalidade: editingClient.naturalidade || '',
        birthDate: editingClient.birthDate || '',
        fatherName: editingClient.fatherName || '',
        motherName: editingClient.motherName || '',
        addressReference: editingClient.addressReference || '',
      });
      setValidationErrors({});
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
  }, [editingClient]);

  // Função para aplicar máscara no CPF (000.000.000-00)
  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  // Função para aplicar máscara no Telefone ((00) 00000-0000)
  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  // Função para aplicar máscara no CEP (00000-000)
  const formatCEP = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
  };

  // Função para aplicar máscara na Data de Nascimento (DD/MM/YYYY)
  const formatDate = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 2) return raw;
    if (raw.length <= 4) return `${raw.slice(0, 2)}/${raw.slice(2)}`;
    return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    } else if (name === 'birthDate') {
      formattedValue = formatDate(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Remove erro de validação ao digitar
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Busca CEP via API ViaCEP
  const handleCepBlur = async () => {
    const sanitizedCep = formData.cep.replace(/\D/g, '');
    if (sanitizedCep.length !== 8) {
      if (sanitizedCep.length > 0) {
        setCepError('CEP inválido! Precisa de 8 dígitos.');
      }
      return;
    }

    setIsFetchingCep(true);
    setCepError('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${sanitizedCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado na base pública.');
      } else {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: `${data.localidade} - ${data.uf}`,
        }));
        // Limpar erros para os campos autocompletados
        setValidationErrors(prev => {
          const temp = { ...prev };
          delete temp.address;
          delete temp.neighborhood;
          return temp;
        });
      }
    } catch {
      setCepError('Erro de conexão ao buscar o CEP.');
    } finally {
      setIsFetchingCep(false);
    }
  };

  // Adiciona/Remove serviços adicionais do array
  const handleServiceToggle = (service: string) => {
    setFormData(prev => {
      const services = prev.additionalServices.includes(service)
        ? prev.additionalServices.filter(s => s !== service)
        : [...prev.additionalServices, service];
      return { ...prev, additionalServices: services };
    });
  };

  // Validação simplificada do formulário
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nome completo é obrigatório.';
    if (!formData.cpf.trim() || !isValidCPF(formData.cpf)) {
      errors.cpf = 'CPF válido é obrigatório (11 dígitos, verifique o formato correto).';
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Telefone válido com DDD é obrigatório.';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errors.email = 'Insira um e-mail válido.';
    }
    if (!formData.cep.trim() || formData.cep.replace(/\D/g, '').length !== 8) {
      errors.cep = 'Insira o CEP.';
    }
    if (!formData.address.trim()) errors.address = 'Rua/Logradouro é obrigatório.';
    if (!formData.number.trim()) errors.number = 'Nº é obrigatório.';
    if (!formData.neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório.';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalClient: Client = {
      id: editingClient ? editingClient.id : `cl-${Date.now()}`,
      ...formData,
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString()
    };

    onSave(finalClient);
    setFormData(INITIAL_FORM_STATE);
  };

  const handlePresetFill = () => {
    // Autocompleta dados fictícios rápidos para ajudar nos testes
    setFormData({
      name: 'Leonardo Alves de Souza',
      cpf: '345.987.211-10',
      phone: '(11) 98011-9231',
      email: 'leo.alves@exemplo.com.br',
      cep: '04538-133',
      address: 'Avenida Brigadeiro Faria Lima',
      number: '3477',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo - SP',
      planId: '1G',
      dueDate: 15,
      status: 'Ativo',
      additionalServices: ['Wi-Fi Expandido', 'Suporte Técnico Premium'],
    });
    setValidationErrors({});
    setCepError('');
  };

  const selectedPlan = PLANS.find(p => p.id === formData.planId) || PLANS[1];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="registration-form-card">
      
      {/* Banner Superior do Formulário */}
      <div className="bg-slate-900 border-b border-slate-850 px-6 py-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-500/10 border border-indigo-500/10 p-2 rounded-lg">
            <UserPlus className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-sans tracking-tight text-white uppercase">
              {editingClient ? 'Atualizar Assinante' : 'Novo Contrato'}
            </h2>
            <p className="text-xs text-slate-350">
              {editingClient ? `Editando o cadastro de ID: ${editingClient.id}` : 'Insira os dados cadastrais do cliente'}
            </p>
          </div>
        </div>
        
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-left bg-white">
        
        {/* Seção 1: Dados Pessoais */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-widest mb-4">
            <FileText className="w-4 h-4 text-orange-500" />
            <span>1. Informações Básicas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo <span className="text-orange-500">*</span>
              </label>
              <input
                id="name-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex. Marina de Souza Queiroz"
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                  validationErrors.name ? 'border-rose-350 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                }`}
              />
              {validationErrors.name && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.name}
                </p>
              )}
            </div>

            {/* CPF */}
            <div>
              <label htmlFor="cpf-input" className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / Documento <span className="text-orange-500">*</span>
              </label>
              <input
                id="cpf-input"
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                maxLength={14}
                placeholder="000.000.000-00"
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                  validationErrors.cpf ? 'border-rose-350 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                }`}
              />
              {validationErrors.cpf && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.cpf}
                </p>
              )}
            </div>

            {/* Whatsapp/Telefone */}
            <div>
              <label htmlFor="phone-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Telefone / WhatsApp <span className="text-orange-500">*</span>
              </label>
              <input
                id="phone-input"
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                maxLength={15}
                placeholder="(00) 00000-0000"
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                  validationErrors.phone ? 'border-rose-350 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                }`}
              />
              {validationErrors.phone && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.phone}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Email de Contato <span className="text-orange-500">*</span>
              </label>
              <input
                id="email-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="cliente@provedorexemplo.com.br"
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                  validationErrors.email ? 'border-rose-350 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                }`}
              />
              {validationErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.email}
                </p>
              )}
            </div>

            {/* Naturalidade */}
            <div>
              <label htmlFor="naturalidade-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Naturalidade
              </label>
              <input
                id="naturalidade-input"
                type="text"
                name="naturalidade"
                value={formData.naturalidade}
                onChange={handleInputChange}
                placeholder="Cidade/Estado de nascimento"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>

            {/* Data de Nascimento */}
            <div>
              <label htmlFor="birthDate-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Nascimento
              </label>
              <input
                id="birthDate-input"
                type="text"
                maxLength={10}
                name="birthDate"
                placeholder="DD/MM/AAAA"
                value={formData.birthDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>

            {/* Filiação: Nome da Mãe */}
            <div>
              <label htmlFor="motherName-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Filiação: Nome da Mãe
              </label>
              <input
                id="motherName-input"
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleInputChange}
                placeholder="Nome completo da mãe"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>

            {/* Filiação: Nome do Pai */}
            <div>
              <label htmlFor="fatherName-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Filiação: Nome do Pai
              </label>
              <input
                id="fatherName-input"
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleInputChange}
                placeholder="Nome completo do pai (opcional)"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Endereço de Instalação */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-widest">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>2. Endereço de Instalação</span>
            </div>
            {isFetchingCep && (
              <span className="text-[11px] text-cyan-600 font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Buscando cep...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CEP */}
            <div>
              <label htmlFor="cep-input" className="block text-xs font-semibold text-slate-700 mb-1">
                CEP <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="cep-input"
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleInputChange}
                  onBlur={handleCepBlur}
                  maxLength={9}
                  placeholder="00000-000"
                  className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                    validationErrors.cep ? 'border-rose-350 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                  }`}
                />
              </div>
              {cepError ? (
                <p className="text-[10px] text-orange-600 mt-1">{cepError}</p>
              ) : (
                <p className="text-[9px] text-slate-500 mt-1">Digite e clique fora para autocompletar.</p>
              )}
              {validationErrors.cep && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.cep}
                </p>
              )}
            </div>

            {/* Rua */}
            <div className="col-span-1 sm:col-span-2">
              <label htmlFor="address-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Endereço / Logradouro <span className="text-orange-500">*</span>
              </label>
              <input
                id="address-input"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Rua, Avenida, Alameda..."
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                  validationErrors.address ? 'border-rose-350 bg-rose-50/50 focus:ring-1 focus:ring-rose-500' : 'border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                }`}
              />
              {validationErrors.address && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {validationErrors.address}
                </p>
              )}
            </div>

            {/* Número */}
            <div>
              <label htmlFor="number-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Número <span className="text-orange-500">*</span>
              </label>
              <input
                id="number-input"
                type="text"
                name="number"
                value={formData.number}
                onChange={handleInputChange}
                placeholder="Ex. 120"
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                   validationErrors.number ? 'border-rose-350 bg-rose-50/50' : 'border-slate-200 focus:border-cyan-500'
                }`}
              />
              {validationErrors.number && (
                <p className="text-[11px] text-rose-600 mt-1">{validationErrors.number}</p>
              )}
            </div>

            {/* Bairro */}
            <div>
              <label htmlFor="neighborhood-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Bairro <span className="text-orange-500">*</span>
              </label>
              <input
                id="neighborhood-input"
                type="text"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleInputChange}
                placeholder="Bairro"
                className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:bg-white ${
                  validationErrors.neighborhood ? 'border-rose-350 bg-rose-50/50' : 'border-slate-200 focus:border-cyan-500'
                }`}
              />
              {validationErrors.neighborhood && (
                <p className="text-[11px] text-rose-600 mt-1">{validationErrors.neighborhood}</p>
              )}
            </div>

            {/* Cidade / Estado */}
            <div>
              <label htmlFor="city-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade / UF
              </label>
              <input
                id="city-input"
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Ex. São Paulo - SP"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-805 font-sans focus:outline-hidden transition-all focus:border-cyan-500"
              />
            </div>

            {/* Ponto de Referência */}
            <div className="col-span-1 sm:col-span-3">
              <label htmlFor="addressReference-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Ponto de Referência para Instalação
              </label>
              <input
                id="addressReference-input"
                type="text"
                name="addressReference"
                value={formData.addressReference}
                onChange={handleInputChange}
                placeholder="Ex: Próximo ao mercado municipal, portão verde..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
          </div>
        </div>

        {/* Seção 3: Plano Contratado e Vencimento */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>3. Plano e Faturamento</span>
          </div>

          <div className="space-y-4">
            
            {/* Escolha do Plano (5 Opções Interativas) */}
            <div>
              <p className="block text-xs font-semibold text-slate-700 mb-2 font-sans">
                Qual plano deseja contratar? <span className="text-cyan-600 font-bold">({selectedPlan.speed} - R$ {selectedPlan.price.toFixed(2)}/mês)</span>
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2" id="plans-selector">
                {PLANS.map(plan => {
                  const isSelected = formData.planId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, planId: plan.id }))}
                      className={`text-left p-3 rounded-xl border-2 transition-all relative cursor-pointer ${
                        isSelected
                          ? `border-orange-500 bg-orange-50 ring-2 ring-orange-500/10 text-slate-900`
                          : 'border-slate-200 hover:border-slate-350 bg-slate-50 text-slate-800'
                      }`}
                    >
                       <div className="flex flex-col h-full justify-between gap-1">
                        <div>
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-tight ${plan.badgeBg}`}>
                              {plan.name}
                            </span>
                            <span className="text-[8.5px] px-1 font-mono uppercase bg-slate-100 border border-slate-200 text-slate-550 rounded">
                              {plan.id}
                            </span>
                          </div>
                          <p className="font-extrabold text-lg text-orange-600 mt-1.5 select-none">
                            {plan.speed}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-green-600 font-semibold font-sans line-clamp-2 leading-tight">
                            {plan.description}
                          </p>
                          <p className="text-sm font-bold text-slate-900 mt-2">
                            R$ {plan.price.toFixed(2)}
                            <span className="text-[9px] text-slate-450 font-light block">/mensal</span>
                          </p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-gradient-to-br from-orange-500 to-red-650 text-white rounded-full p-0.5 border border-white">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data de Vencimento de Fatura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="block text-xs font-semibold text-slate-700 mb-2">
                  Dia de Vencimento de Mensalidades <span className="text-orange-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2" id="due-dates-selector">
                  {DUE_DATES.map(date => {
                    const isSelected = formData.dueDate === date;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, dueDate: date }))}
                        className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Dia {date}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Faturas geradas automaticamente 5 dias antes da data escolhida.
                </p>
              </div>

              {/* Status Inicial do Cliente */}
              <div>
                <label htmlFor="status-select" className="block text-xs font-medium text-slate-700 mb-2">
                  Status Inicial da Instalação
                </label>
                <select
                  id="status-select"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-cyan-500/35"
                >
                  <option value="Ativo" className="bg-white text-slate-800">Instalação Ativa / Rodando</option>
                  <option value="Pendente" className="bg-white text-slate-800">Aguardando Instalação Física</option>
                  <option value="Bloqueado" className="bg-white text-slate-800">Bloqueado / Pendência Financeira</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Mudanças de status alteram o faturamento imediato.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Serviços Adicionais (Checkboxes Modernas) */}
        <div className="border-t border-slate-100 pt-4">
          <p className="block text-xs font-semibold text-slate-700 mb-2">
            Serviços e Benefícios Adicionais (Opcionais)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'wifi', label: 'Wi-Fi Expandido (Sinal Mesh)', desc: '+ R$ 15,00/mês' },
              { id: 'suporte', label: 'Suporte Técnico Premium 24h', desc: '+ R$ 10,00/mês' },
              { id: 'seguranca', label: 'Segurança Avançada Antivírus', desc: 'Incluso no plano' }
            ].map(srv => {
              const checked = formData.additionalServices.includes(srv.label);
              return (
                <label
                  key={srv.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    checked
                      ? 'bg-cyan-500/10 border-cyan-500/25 text-slate-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleServiceToggle(srv.label)}
                    className="mt-0.5 rounded-md border-slate-350 text-orange-500 focus:ring-orange-500 h-4 w-4 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-850">{srv.label}</span>
                    <span className="block text-[10px] text-slate-500 font-light">{srv.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
          {editingClient && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar Edição
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-orange-500 via-orange-600 to-red-650 border border-orange-600 rounded-lg hover:opacity-95 transition-all shadow-md shadow-orange-500/10 cursor-pointer uppercase tracking-wider"
          >
            <Save className="w-4 h-4 text-white" />
            {editingClient ? 'Salvar Alterações' : 'Confirmar e Ativar Cadastro'}
          </button>
        </div>

      </form>
    </div>
  );
}
