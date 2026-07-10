import React, { useState, useEffect } from 'react';
import { Client, PlanId, DueDate, ClientStatus, PLANS, DUE_DATES } from '../types';
import { isValidCPF } from '../lib/cpfValidator';
import { 
  Wifi, Phone, User, Mail, ShieldCheck, MapPin, 
  CreditCard, Calendar, Check, ChevronRight, ChevronLeft, 
  Sparkles, CalendarClock, ShoppingBag, Smartphone, CloudLightning, BadgePercent,
  Gamepad2, Play, Download, Award, Heart, Globe, Crown, Zap, Flame, Shield, Trophy
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import bannerImg from '../assets/baner.png';

interface CustomerPortalProps {
  onRegisterSuccess: (newClient: Client) => Promise<void> | void;
}

export default function CustomerPortal({ onRegisterSuccess }: CustomerPortalProps) {
  const getPlanEmblemData = (planId: PlanId) => {
    switch (planId) {
      case '100M':
        return {
          category: 'Bronze',
          classif: 'Essencial',
          badgeBg: 'bg-amber-50 text-amber-850 border-amber-200/60',
          sealBg: 'from-amber-700/10 to-orange-600/5',
          sealBorder: 'border-orange-200',
          icon: <Shield className="w-4 h-4 text-amber-700" />,
          colorClass: 'text-amber-800',
          subLabel: 'Navegação Leve'
        };
      case '300M':
        return {
          category: 'Prata',
          classif: 'Recomendado',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
          sealBg: 'from-slate-400/10 to-slate-500/5',
          sealBorder: 'border-slate-305',
          icon: <Trophy className="w-4 h-4 text-slate-500" />,
          colorClass: 'text-slate-800',
          subLabel: 'Melhor Wireless'
        };
      case '500M':
        return {
          category: 'Ouro',
          classif: 'Custo-Benefício',
          badgeBg: 'bg-amber-500/10 text-amber-900 border-amber-500/20',
          sealBg: 'from-amber-400/25 to-yellow-500/5',
          sealBorder: 'border-amber-400',
          icon: <Award className="w-4 h-4 text-amber-600" />,
          colorClass: 'text-amber-950 font-black',
          subLabel: 'Gamer & Streaming'
        };
      case '600M':
        return {
          category: 'Platinum',
          classif: 'Elite Multi-uso',
          badgeBg: 'bg-purple-100 text-purple-900 border-purple-200/60',
          sealBg: 'from-purple-500/15 to-indigo-500/5',
          sealBorder: 'border-purple-300',
          icon: <Zap className="w-4 h-4 text-purple-600" />,
          colorClass: 'text-purple-900',
          subLabel: 'Home Office'
        };
      case '1G':
        return {
          category: 'Diamond',
          classif: 'Velocidade Extrema',
          badgeBg: 'bg-slate-950 text-cyan-300 border-cyan-500/40',
          sealBg: 'from-cyan-500/25 via-indigo-500/10 to-transparent',
          sealBorder: 'border-cyan-400',
          icon: <Crown className="w-4 h-4 text-cyan-400 animate-pulse" />,
          colorClass: 'text-cyan-400 font-extrabold',
          subLabel: 'Banda Ultra Larga'
        };
    }
  };

  const [step, setStep] = useState<number>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('300M');

  useEffect(() => {
    const wizardEl = document.getElementById('wizard-content-box');
    if (wizardEl) {
      wizardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);
  
  // Form States
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [dueDate, setDueDate] = useState<DueDate>(10);
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);
  const [naturalidade, setNaturalidade] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [addressReference, setAddressReference] = useState('');
  
  // UI States
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [registeredClient, setRegisteredClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Formats
  const applyCpfMask = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  const applyPhoneMask = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const applyCepMask = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
  };

  const applyDateMask = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 2) return raw;
    if (raw.length <= 4) return `${raw.slice(0, 2)}/${raw.slice(2)}`;
    return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
  };

  const handleCepLookup = async (cepVal: string) => {
    const sanitized = cepVal.replace(/\D/g, '');
    if (sanitized.length !== 8) return;

    setIsFetchingCep(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${sanitized}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado. Digite o endereço manualmente.');
      } else {
        setAddress(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(`${data.localidade} - ${data.uf}`);
        // Limpa erros anteriores de endereço
        setValidationErrors(prev => {
          const c = { ...prev };
          delete c.address;
          delete c.neighborhood;
          return c;
        });
      }
    } catch {
      setCepError('Indisponibilidade temporária. Digite seu endereço.');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleServiceToggle = (srv: string) => {
    setAdditionalServices(prev => 
      prev.includes(srv) ? prev.filter(s => s !== srv) : [...prev, srv]
    );
  };

  // Preenche dados simulados para testes rápidos
  const handleAutoFill = () => {
    setName('Carlos Eduardo de Souza');
    setCpf('321.456.987-10');
    setPhone('(11) 99876-5432');
    setEmail('carlos.eduardo@exemplo.com');
    setCep('01311-200');
    setAddress('Avenida Paulista');
    setNumber('1500');
    setNeighborhood('Bela Vista');
    setCity('São Paulo - SP');
    setDueDate(15);
    setNaturalidade('São Paulo - SP');
    setBirthDate('1985-06-15');
    setFatherName('Roberto de Souza');
    setMotherName('Lúcia de Souza');
    setAddressReference('Perto do metrô MASP Trianon');
    setStep(4);
  };

  // Validação por etapa
  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 2) {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) errors.cep = 'Por favor, digite seu CEP de 8 dígitos.';
      if (!address.trim()) errors.address = 'Informe a rua correspondente.';
      if (!number.trim()) errors.number = 'Informe o número.';
      if (!neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
      if (!addressReference.trim()) errors.addressReference = 'O ponto de referência é obrigatório.';
    }

    if (currentStep === 3) {
      if (!name.trim()) errors.name = 'Nome completo é obrigatório para o contrato.';
      if (!cpf.trim() || !isValidCPF(cpf)) errors.cpf = 'Insira um CPF válido com 11 dígitos, verifique o formato.';
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) errors.phone = 'Insira um WhatsApp/telefone com DDD.';
      if (!email.trim() || !email.includes('@')) errors.email = 'Insira um endereço de e-mail válido.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBackStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const selectedPlanObj = PLANS.find(p => p.id === selectedPlanId) || PLANS[1];

  const handleSubmitSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateStep(3)) {
      setStep(3);
      return;
    }
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const newClient: Client = {
      id: `cl-cust-${Date.now()}`,
      name,
      cpf,
      phone,
      email,
      cep,
      address,
      number,
      neighborhood,
      city: city || 'São Paulo - SP',
      planId: selectedPlanId,
      dueDate,
      status: 'Pendente', // Novo cadastro do próprio cliente entra como instalação agendada (Pendente)
      additionalServices,
      createdAt: new Date().toISOString(),
      selfRegistered: true,
      isNewNotification: true,
      naturalidade,
      birthDate,
      fatherName,
      motherName,
      addressReference
    };

    try {
      await onRegisterSuccess(newClient);
      setRegisteredClient(newClient);
      setStep(5); // vai pro passo de Sucesso
    } catch (error: any) {
      console.error("Erro durante o autocadastro:", error);
      setSubmitError(error?.message || 'Houve um erro de conexão com o banco de dados. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reiniciar formulário
  const handleReset = () => {
    setName('');
    setCpf('');
    setPhone('');
    setEmail('');
    setCep('');
    setAddress('');
    setNumber('');
    setNeighborhood('');
    setCity('');
    setDueDate(10);
    setAdditionalServices([]);
    setRegisteredClient(null);
    setNaturalidade('');
    setBirthDate('');
    setFatherName('');
    setMotherName('');
    setAddressReference('');
    setStep(1);
    setValidationErrors({});
  };

  return (
    <div className="max-w-4xl mx-auto" id="customer-portal-main">
      
      {/* Banner / Hero Principal de Vendas (Estilo Premium Tornado Fibra) */}
      {step < 5 && (
        <div className="mb-8 w-full rounded-3xl shadow-xl overflow-hidden hover:opacity-95 transition-opacity hover:shadow-2xl hover:-translate-y-1 transform duration-300" id="tornado-fibra-sales-hero">
          <a href="https://wa.me/559884112100" target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer" title="Converse com um de nossos atendentes">
            <img src={bannerImg} alt="Banner Promocional Tornado Fibra" className="w-full h-auto object-cover block" />
          </a>
        </div>
      )}

      {/* Barra de Progresso Interativa (Wizard Step) */}
      {step < 5 && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs" id="wizard-progress-bar">
          <div className="flex items-center justify-between">
            {[
              { id: 1, label: 'Plano' },
              { id: 2, label: 'Endereço' },
              { id: 3, label: 'Seus Dados' },
              { id: 4, label: 'Faturamento' }
            ].map((s) => (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Permite retroceder livremente ou avançar se já preencheu passos anteriores
                    if (s.id < step) {
                      setStep(s.id);
                    } else if (s.id > step && validateStep(step)) {
                      setStep(s.id);
                    }
                  }}
                  className="flex items-center gap-2 group focus:outline-hidden"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.id 
                      ? 'bg-slate-900 text-white ring-4 ring-indigo-500/10' 
                      : step > s.id 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                  }`}>
                    {step > s.id ? <Check className="w-4 h-4 stroke-[3]" /> : s.id}
                  </div>
                  <span className={`text-xs font-bold hidden sm:inline ${
                    step === s.id ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {s.id < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                    step > s.id ? 'bg-emerald-500' : 'bg-slate-100'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Caixa de Checkout Principal */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 relative" id="wizard-content-box">
        


        {/* STEP 1: Lista e Seleção do Plano */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-linear-to-r from-blue-700 to-indigo-800 rounded-2xl p-5 shadow-lg relative overflow-hidden mb-8 text-center sm:text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans relative z-10 flex items-center gap-3">
                <Wifi className="w-7 h-7 text-blue-200" />
                Selecione o melhor plano para você
              </h2>
              <p className="text-blue-100 text-sm mt-2 relative z-10 font-medium max-w-lg">
                Todas as opções acompanham fibra direta, download & upload rápidos e suporte técnico prioritário.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const emblem = getPlanEmblemData(plan.id);
                
                // Destaques e badges específicos para clientes de autoatendimento
                const isPromo = plan.id === '500M' || plan.id === '1G';
                const promoLabel = plan.id === '500M' ? 'Custo-Benefício ★' : plan.id === '1G' ? 'Velocidade Extrema' : '';

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`rounded-2xl border-2 transition-all p-4 flex flex-col justify-between cursor-pointer relative select-none ${
                      isSelected 
                        ? 'border-indigo-600 bg-linear-to-b from-indigo-50/40 to-white ring-4 ring-indigo-600/20 scale-[1.04] shadow-xl z-10' 
                        : 'border-slate-300 bg-white hover:border-slate-400 hover:shadow-xs'
                    }`}
                  >
                    {isPromo && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-indigo-600 to-cyan-500 text-white text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase shadow-xs whitespace-nowrap">
                        {promoLabel}
                      </span>
                    )}

                    <div className="space-y-3 mt-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${plan.badgeBg}`}>
                          {plan.id}
                        </span>
                        {isSelected && (
                          <span className="p-0.5 bg-indigo-600 text-white rounded-full">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        )}
                      </div>

                      {/* Visual Emblem Badge & Seal */}
                      {emblem && (
                        <div className={`flex items-center gap-2 p-2 rounded-xl border border-slate-150/80 bg-gradient-to-br ${emblem.sealBg} ${emblem.sealBorder} shadow-2xs`}>
                          <div className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center shadow-3xs shrink-0 select-none">
                            {emblem.icon}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[10px] font-black tracking-tight ${emblem.colorClass} truncate uppercase`}>
                              {emblem.category}
                            </p>
                            <p className="text-[8px] text-slate-500 font-semibold truncate leading-none">
                              {emblem.classif}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="font-sans font-black text-xl text-slate-950">
                          {plan.speed}
                        </h3>
                        <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-tight">
                          {emblem?.subLabel}
                        </p>
                      </div>

                      <p className="text-[11px] text-blue-600 font-bold font-sans leading-tight min-h-[44px]">
                        {plan.description}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-3 mt-4 space-y-3">
                      <div>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                          R$ {plan.price.toFixed(2)}
                          <span className="text-[10px] text-slate-400 font-light block mt-0.5">/mensal</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'PLANO SELECIONADO' : 'Quero Este'}
                      </button>
                      
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita re-selecionar o plano
                            handleNextStep();
                          }}
                          className="w-full sm:hidden flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg cursor-pointer shadow-md transition-all animate-heartbeat"
                        >
                          Continuar Cadastro
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sumário do Plano ativo atualmente no rodapé */}
            <div className="hidden sm:flex flex-col sm:flex-row items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Você selecionou</p>
                  <p className="text-sm font-bold text-slate-900">
                    O plano {selectedPlanObj.name} de {selectedPlanObj.speed} por apenas R$ {selectedPlanObj.price.toFixed(2)}/mês!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all animate-heartbeat"
              >
                Prosseguir Cadastro
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Cobertura e CEP */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-lg relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans flex items-center gap-3 relative z-10">
                <MapPin className="w-7 h-7 text-blue-100 animate-bounce" />
                Onde vai ser sua instalação?
              </h2>
              <p className="text-blue-100 text-sm mt-2 relative z-10 font-medium max-w-lg">
                A fibra óptica precisa estar disponível em sua região. Insira seu CEP para localização imediata do endereço de instalação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* CEP Input */}
              <div className="space-y-1.5 focus-within:text-indigo-600">
                <label htmlFor="wizard-cep" className="block text-xs font-bold text-slate-700">
                  Consulte seu CEP de Instalação: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="wizard-cep"
                    type="text"
                    value={cep}
                    onChange={(e) => {
                      const value = applyCepMask(e.target.value);
                      setCep(value);
                      if (value.replace(/\D/g, '').length === 8) {
                        handleCepLookup(value);
                      }
                    }}
                    maxLength={9}
                    placeholder="Efetue busca... Ex: 01311-200"
                    className="w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans font-bold"
                  />
                  {isFetchingCep && (
                    <div className="absolute right-3 top-3">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin"></div>
                    </div>
                  )}
                </div>
                {cepError ? (
                  <p className="text-[10px] text-amber-600 font-semibold">{cepError}</p>
                ) : (
                  <p className="text-[10px] text-slate-400">Insira os 8 dígitos numéricos.</p>
                )}
                {validationErrors.cep && (
                  <p className="text-[11px] text-rose-500">{validationErrors.cep}</p>
                )}
              </div>

              {/* Endereço auto completado */}
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="wizard-address" className="block text-xs font-medium text-slate-700">
                  Rua / Logradouro: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Nome do local de instalação"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                {validationErrors.address && (
                  <p className="text-[11px] text-rose-500">{validationErrors.address}</p>
                )}
              </div>

              {/* Número da residência */}
              <div className="space-y-1.5">
                <label htmlFor="wizard-number" className="block text-xs font-medium text-slate-700">
                  Número: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-number"
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Nº da casa ou apto"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-slate-900"
                />
                {validationErrors.number && (
                  <p className="text-[11px] text-rose-500">{validationErrors.number}</p>
                )}
              </div>

              {/* Bairro */}
              <div className="space-y-1.5">
                <label htmlFor="wizard-neighborhood" className="block text-xs font-medium text-slate-700">
                  Bairro: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro correspondente"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                {validationErrors.neighborhood && (
                  <p className="text-[11px] text-rose-500">{validationErrors.neighborhood}</p>
                )}
              </div>

              {/* Cidade auto completada */}
              <div className="space-y-1.5">
                <label htmlFor="wizard-city" className="block text-xs font-medium text-slate-700">
                  Cidade / UF:
                </label>
                <input
                  id="wizard-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex. São Paulo - SP"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-150 text-slate-600 focus:outline-hidden font-medium"
                />
              </div>

              {/* Ponto de Referência */}
              <div className="sm:col-span-3 space-y-1.5">
                <label htmlFor="wizard-addressReference" className="block text-xs font-medium text-slate-700">
                  Ponto de Referência para Instalação: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-addressReference"
                  type="text"
                  value={addressReference}
                  onChange={(e) => setAddressReference(e.target.value)}
                  placeholder="Ex: Próximo à igreja matriz, portão azul, travessa da avenida principal..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                />
                {validationErrors.addressReference && (
                  <p className="text-[11px] text-rose-500">{validationErrors.addressReference}</p>
                )}
              </div>

            </div>

            {/* Navegadores de passo */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={handleBackStep}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Mudar de Plano
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Confirmar Endereço
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 3: Dados Pessoais do Cliente */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-linear-to-r from-violet-600 to-purple-600 rounded-2xl p-5 shadow-lg relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans flex items-center gap-3 relative z-10">
                <User className="w-7 h-7 text-violet-100" />
                Quem será o titular da assinatura?
              </h2>
              <p className="text-violet-100 text-sm mt-2 relative z-10 font-medium max-w-lg">
                Conforme regulamento ANATEL, todas as assinaturas exigem identificação lógica por CPF válida.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Assinante */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label htmlFor="wizard-name" className="block text-xs font-medium text-slate-700">
                  Nome Completo: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.name) setValidationErrors(p => { const copy = { ...p }; delete copy.name; return copy; });
                  }}
                  placeholder="Nome titular da via do contrato"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                    validationErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-[11px] text-rose-500 font-semibold">{validationErrors.name}</p>
                )}
              </div>

              {/* CPF do titular */}
              <div className="space-y-1.5">
                <label htmlFor="wizard-cpf" className="block text-xs font-medium text-slate-700">
                  CPF do titular: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-cpf"
                  type="text"
                  value={cpf}
                  maxLength={14}
                  onChange={(e) => {
                    setCpf(applyCpfMask(e.target.value));
                    if (validationErrors.cpf) setValidationErrors(p => { const copy = { ...p }; delete copy.cpf; return copy; });
                  }}
                  placeholder="000.000.000-00"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                    validationErrors.cpf ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                />
                {validationErrors.cpf && (
                  <p className="text-[11px] text-rose-500 font-semibold">{validationErrors.cpf}</p>
                )}
              </div>

              {/* Celular / WhatsApp */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <label htmlFor="wizard-phone" className="block text-xs font-medium text-slate-700">
                  WhatsApp para combinarmos a instalação: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-phone"
                  type="text"
                  value={phone}
                  maxLength={15}
                  onChange={(e) => {
                    setPhone(applyPhoneMask(e.target.value));
                    if (validationErrors.phone) setValidationErrors(p => { const copy = { ...p }; delete copy.phone; return copy; });
                  }}
                  placeholder="(00) 90000-0000"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                    validationErrors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                />
                {validationErrors.phone && (
                  <p className="text-[11px] text-rose-500 font-semibold">{validationErrors.phone}</p>
                )}
              </div>

              {/* Email para recebimento de faturas */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label htmlFor="wizard-email" className="block text-xs font-medium text-slate-700">
                  Email para receber faturas mensais: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="wizard-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) setValidationErrors(p => { const copy = { ...p }; delete copy.email; return copy; });
                  }}
                  placeholder="Ex. meuemail@provedor.com.br"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all ${
                    validationErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  }`}
                />
                {validationErrors.email && (
                  <p className="text-[11px] text-rose-500 font-semibold">{validationErrors.email}</p>
                )}
              </div>

              {/* Naturalidade */}
              <div className="space-y-1.5 col-span-1">
                <label htmlFor="wizard-naturalidade" className="block text-xs font-medium text-slate-700">
                  Naturalidade:
                </label>
                <input
                  id="wizard-naturalidade"
                  type="text"
                  value={naturalidade}
                  onChange={(e) => setNaturalidade(e.target.value)}
                  placeholder="Cidade/Estado de nascimento"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                />
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-1.5 col-span-1">
                <label htmlFor="wizard-birthDate" className="block text-xs font-medium text-slate-700">
                  Data de Nascimento:
                </label>
                <input
                  id="wizard-birthDate"
                  type="text"
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  value={birthDate}
                  onChange={(e) => setBirthDate(applyDateMask(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                />
              </div>

              {/* Nome da Mãe */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label htmlFor="wizard-motherName" className="block text-xs font-medium text-slate-700">
                  Filiação: Nome da Mãe:
                </label>
                <input
                  id="wizard-motherName"
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Nome completo da sua mãe"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                />
              </div>

              {/* Nome do Pai */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <label htmlFor="wizard-fatherName" className="block text-xs font-medium text-slate-700">
                  Filiação: Nome do Pai:
                </label>
                <input
                  id="wizard-fatherName"
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Nome completo do seu pai (opcional)"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900"
                />
              </div>

            </div>

            {/* Rodapé navegadores */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={handleBackStep}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Alterar Endereço
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Garantir Identificação
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 4: Vencimento e Adicionais Opcionais */}
        {step === 4 && (
          <form onSubmit={handleSubmitSubscription} className="space-y-6">
            <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 shadow-lg relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans flex items-center gap-3 relative z-10">
                <CreditCard className="w-7 h-7 text-emerald-100" />
                Preferências de Faturamento
              </h2>
              <p className="text-emerald-100 text-sm mt-2 relative z-10 font-medium max-w-lg">
                Defina o melhor dia mensal para o vencimento da sua fatura e opte por serviços bônus adicionais.
              </p>
            </div>

            {/* Dia do Vencimento */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Escolha o Melhor Dia para Vencimento da Mensalidade:
              </span>
              
              <div className="flex flex-wrap gap-2 sm:gap-3" id="wizard-due-dates">
                {DUE_DATES.map((day) => {
                  const isSelected = dueDate === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDueDate(day)}
                      className={`flex-1 min-w-[70px] text-center py-2.5 px-3 rounded-xl border-2 transition-all font-sans font-extrabold cursor-pointer select-none text-xs sm:text-sm ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs' 
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Dia {day}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Recomendação: faturas são enviadas para o seu e-mail 5-10 dias antes do dia de vencimento escolhido.
              </p>
            </div>


            {/* Sumário Completo Lateral/Final antes de Enviar */}
            <div className="p-5 rounded-2xl bg-white border-2 border-blue-500 text-slate-800 space-y-4 shadow-md mt-8">
              <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-blue-700" />
                  </div>
                  <span className="text-sm sm:text-base font-black text-blue-900 tracking-wide uppercase">Resumo da sua Assinatura</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 uppercase tracking-wider">Ativação Rápida</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-2">
                <div>
                  <span className="text-slate-400 font-bold block text-[9.5px] uppercase tracking-wider mb-1">Plano Escolhido</span>
                  <span className="font-black text-blue-700 text-base">{selectedPlanObj.speed}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[9.5px] uppercase tracking-wider mb-1">Pagamento Mensal</span>
                  <span className="font-black text-emerald-600 text-base">R$ {selectedPlanObj.price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[9.5px] uppercase tracking-wider mb-1">Dia do Vencimento</span>
                  <span className="font-black text-blue-700 text-base">Dia {dueDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[9.5px] uppercase tracking-wider mb-1">Local da Instalação</span>
                  <span className="font-bold text-slate-700 truncate block text-xs" title={`Rua ${address}, ${number}`}>Rua {address}, {number}</span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-250 rounded-xl text-left animate-shake">
                  ⚠️ {submitError}
                </div>
              )}
            </div>

            {/* Ações Finais (Fora do Box) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
              <p className="text-[11px] text-slate-500 font-medium max-w-sm">
                Ao finalizar, seu contrato será emitido e a instalação física será agendada na sua residência.
              </p>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleBackStep}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-center"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] sm:flex-none px-6 py-3 rounded-xl bg-linear-to-tr from-emerald-500 via-emerald-600 to-teal-600 text-white font-black text-sm cursor-pointer shadow-lg shadow-emerald-200 hover:opacity-95 flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Processando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      Finalizar Assinatura!
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

        {/* STEP 5: SUCESSO DO CLIENTE! */}
        {step === 5 && registeredClient && (
          <div className="space-y-6 text-center py-6">
            
            {/* Animador Central de Sucesso */}
            <div className="relative w-18 h-18 mx-auto flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border-4 border-white shadow-md animate-bounce">
              <Check className="w-9 h-9 stroke-[3]" />
              <div className="absolute inset-0 rounded-full bg-emerald-100 -z-10 animate-ping"></div>
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[10px] font-extrabold tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase">
                Inscrição Concluída Online com Sucesso! 🎉
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                Parabéns {registeredClient.name}!
              </h2>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Seu cadastro de banda larga de fibra foi homologado com o ID interno <strong className="font-mono text-slate-700">{registeredClient.id}</strong>. Nosso técnico entrará em contato via WhatsApp para confirmar o horário de instalação física.
              </p>
            </div>

            {/* Caixa Recapitulativa do Contrato do Cliente */}
            <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-4">
              <span className="block text-[10px] text-slate-400 uppercase font-black tracking-widest text-center border-b border-slate-200/60 pb-2">
                Recibo do Cliente - Tornado Fibra
              </span>

              <div className="text-xs space-y-2 text-slate-700 font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plano Selecionado:</span>
                  <strong className="text-indigo-900">{selectedPlanObj.speed} ({selectedPlanObj.name})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mensalidade:</span>
                  <strong className="text-slate-900">R$ {selectedPlanObj.price.toFixed(2)}/mês</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vencimento Escolhido:</span>
                  <strong className="text-slate-900">Todo Dia {registeredClient.dueDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local de Instalação:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
                    {registeredClient.address}, {registeredClient.number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WhatsApp de Contato:</span>
                  <strong className="text-slate-900">{registeredClient.phone}</strong>
                </div>
                {registeredClient.additionalServices.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase mb-1">Benefícios Ativados:</span>
                    <div className="flex flex-wrap gap-1">
                      {registeredClient.additionalServices.map((as, inx) => (
                        <span key={inx} className="text-[9px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                          {as}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Box de Agendamento da Instalação */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <CalendarClock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-indigo-950">Previsão do Comparecimento do Técnico:</p>
                  <p className="text-slate-600 text-[11px]">Nas próximas 24 horas úteis (inclusive de Sábado).</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Simular Nova Inscrição
              </button>
              
              <div className="text-[11px] text-slate-400 font-medium">
                Dica: Mude para a <strong>"Área do Administrador"</strong> acima para ver seu nome na lista oficial de faturamento e fiação ótica!
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Informativos de Segurança de Dados e Rodapé de Checkout */}
      {step < 5 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2.5 px-4 font-sans">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Conexão TLS 1.3 Criptografada • Seus dados estão seguros sob a LGPD
          </span>
          <span>
            Precisa de suporte na inscrição? Ligue para <strong>(98) 98411-2100</strong> ou <strong>(98) 98425-6646</strong>
          </span>
        </div>
      )}

    </div>
  );
}
