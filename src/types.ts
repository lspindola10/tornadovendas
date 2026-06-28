export type PlanId = '100M' | '300M' | '500M' | '600M' | '1G';
export type DueDate = 5 | 10 | 15 | 20 | 25;
export type ClientStatus = 'Ativo' | 'Pendente' | 'Bloqueado';

export interface Plan {
  id: PlanId;
  name: string;
  speed: string;
  price: number;
  description: string;
  color: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  planId: PlanId;
  dueDate: DueDate;
  status: ClientStatus;
  additionalServices: string[];
  createdAt: string;
  selfRegistered?: boolean;
  isNewNotification?: boolean;
  naturalidade?: string;
  fatherName?: string;
  motherName?: string;
  addressReference?: string;
}

export const PLANS: Plan[] = [
  {
    id: '100M',
    name: 'Plano Bronze',
    speed: '100 Mega',
    price: 68.90,
    description: 'Navegação básica, redes sociais e vídeos HD',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-700'
  },
  {
    id: '300M',
    name: 'Plano Prata',
    speed: '300 Mega',
    price: 87.90,
    description: 'Excelente para streaming, reuniões e estudos',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-700'
  },
  {
    id: '500M',
    name: 'Plano Ouro',
    speed: '500 Mega',
    price: 99.90,
    description: 'Perfeito para gamers, downloads pesados e 4K',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'text-amber-700'
  },
  {
    id: '600M',
    name: 'Plano Platinum',
    speed: '600 Mega',
    price: 128.90,
    description: 'Altas taxas de upload e múltiplos usuários simultâneos',
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-700',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-700'
  },
  {
    id: '1G',
    name: 'Plano Giga Ultra',
    speed: '1 Giga',
    price: 159.90,
    description: 'Performance máxima absoluta sem gargalos',
    color: 'rose',
    gradient: 'from-rose-500 to-pink-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-700'
  }
];

export const DUE_DATES: DueDate[] = [5, 10, 15, 20, 25];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cl-1',
    name: 'Ana Carolina Silva',
    cpf: '123.456.789-00',
    phone: '(11) 98765-4321',
    email: 'ana.silva@exemplo.com.br',
    cep: '01311-200',
    address: 'Avenida Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    planId: '500M',
    dueDate: 10,
    status: 'Ativo',
    additionalServices: ['Wi-Fi Expandido', 'Clube de Vantagens'],
    createdAt: '2026-04-12T10:30:00Z'
  },
  {
    id: 'cl-2',
    name: 'Bruno Ramos de Oliveira',
    cpf: '234.567.890-11',
    phone: '(21) 99888-7766',
    email: 'bruno.ramos@exemplo.com.br',
    cep: '22041-011',
    address: 'Rua Siqueira Campos',
    number: '143',
    neighborhood: 'Copacabana',
    city: 'Rio de Janeiro',
    planId: '300M',
    dueDate: 5,
    status: 'Ativo',
    additionalServices: [],
    createdAt: '2026-05-02T14:15:00Z'
  },
  {
    id: 'cl-3',
    name: 'Carla Beatriz Mendes',
    cpf: '345.678.901-22',
    phone: '(31) 97654-3210',
    email: 'carla.mendes@exemplo.com.br',
    cep: '30140-061',
    address: 'Rua Sergipe',
    number: '820',
    neighborhood: 'Savassi',
    city: 'Belo Horizonte',
    planId: '1G',
    dueDate: 15,
    status: 'Ativo',
    additionalServices: ['IP Fixo', 'Suporte Técnico Premium'],
    createdAt: '2026-06-01T09:00:00Z'
  },
  {
    id: 'cl-4',
    name: 'Diego Souza Cruz',
    cpf: '456.789-012-33',
    phone: '(41) 98877-6655',
    email: 'diego.s@exemplo.com',
    cep: '80020-100',
    address: 'Rua XV de Novembro',
    number: '45',
    neighborhood: 'Centro',
    city: 'Curitiba',
    planId: '100M',
    dueDate: 20,
    status: 'Pendente',
    additionalServices: [],
    createdAt: '2026-06-14T16:45:00Z'
  },
  {
    id: 'cl-5',
    name: 'Fernanda Martins Lima',
    cpf: '567.890.123-44',
    phone: '(51) 99345-6789',
    email: 'fernanda.lima@exemplo.com',
    cep: '90010-240',
    address: 'Rua dos Andradas',
    number: '1205',
    neighborhood: 'Centro Histórico',
    city: 'Porto Alegre',
    planId: '600M',
    dueDate: 25,
    status: 'Bloqueado',
    additionalServices: ['Segurança Avançada Antivírus'],
    createdAt: '2026-03-20T11:20:00Z'
  },
  {
    id: 'cl-6',
    name: 'Gabriel Pinheiro dos Santos',
    cpf: '678.901.234-55',
    phone: '(81) 98122-3344',
    email: 'gabriel.pinheiro@exemplo.com.br',
    cep: '50030-230',
    address: 'Avenida Alfredo Lisboa',
    number: '500',
    neighborhood: 'Bairro do Recife',
    city: 'Recife',
    planId: '500M',
    dueDate: 10,
    status: 'Ativo',
    additionalServices: ['Wi-Fi Expandido'],
    createdAt: '2026-06-10T14:00:00Z'
  }
];
