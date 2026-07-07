import { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import MetricCard from './components/MetricCard';
import ClientForm from './components/ClientForm';
import ClientTable from './components/ClientTable';
import CustomerPortal from './components/CustomerPortal';
import LoginScreen from './components/LoginScreen';
import PendingApproval from './components/PendingApproval';
import UserManagement from './components/UserManagement';
import { useAuth } from './lib/AuthContext';
import { Client, INITIAL_CLIENTS, PLANS, ClientStatus } from './types';
import { db, collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, query, orderBy, handleFirestoreError, OperationType } from './lib/firebase';
import { Info, CheckCircle2, AlertTriangle, Users, Monitor, ShieldCheck, HelpCircle, Activity, ServerCrash, X, Calendar, MapPin, Eye, ExternalLink, Check, Copy, LogOut, UserPlus } from 'lucide-react';

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  
  // Toggle entre o Portal do Cliente (Inscrição Autônoma), ERP Administrativo (Provedor) e Gestão de Usuários
  const [viewMode, setViewMode] = useState<'customer' | 'admin' | 'users'>('admin'); // Padrão é admin para funcionários logados
  const [isSharedPortal, setIsSharedPortal] = useState(false);
  const [notificationClient, setNotificationClient] = useState<Client | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  const { currentUser, appUser, loading, logout } = useAuth();

  const isFirstLoad = useRef(true);
  const previousClientsRef = useRef<Client[]>([]);

  // Mostra mensagens flutuantes temporárias (Toasts)
  const triggerToast = (text: string, type: 'success' | 'info' | 'danger' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Sincronização em Tempo Real com Firestore
  useEffect(() => {
    // Solicita permissão para notificações do sistema (desktop/mobile)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const params = new URLSearchParams(window.location.search);
    const isCustomerMode = params.get('mode') === 'cliente' || params.get('portal') === 'true';
    if (isCustomerMode) {
      setIsSharedPortal(true);
      setViewMode('customer');
      // No modo cliente (portal público), não tentamos ler a lista de clientes para evitar erro de permissão e proteger a privacidade.
      return;
    }

    const playNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.15, start);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        const now = audioContext.currentTime;
        playTone(523.25, now, 0.4); // Tone 1
        playTone(659.25, now + 0.12, 0.5); // Tone 2
      } catch (error) {
        console.warn('Audio context blocked or unsupported:', error);
      }
    };

    const clientsCollectionRef = collection(db, 'clients');
    const q = query(clientsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        console.log('Semeando clientes iniciais no Firestore...');
        try {
          for (const client of INITIAL_CLIENTS) {
            await setDoc(doc(db, 'clients', client.id), client);
          }
        } catch (err) {
          console.error('Erro ao semear dados no Firestore:', err);
        }
        return;
      }

      const list: Client[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as Client);
      });

      // Ordenação secundária por data de criação
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Se não for o primeiro carregamento, verifica se tem novos registros
      if (!isFirstLoad.current) {
        const previousIds = new Set(previousClientsRef.current.map((c) => c.id));
        const newClients = list.filter((c) => !previousIds.has(c.id));

        if (newClients.length > 0) {
          newClients.forEach((newC) => {
            playNotificationSound();
            const planInfo = PLANS.find((p) => p.id === newC.planId);
            const mensagem = `Notificação: O cliente "${newC.name}" realizou cadastro no plano ${planInfo?.speed || 'Turbinado'}!`;
            
            triggerToast(mensagem, 'success');

            // Dispara a Notificação Nativa do Computador se tiver permissão
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Tornado Fibra - Novo Cadastro!', {
                body: `O cliente "${newC.name}" solicitou o plano de ${planInfo?.speed || 'Internet'}. Verifique o painel para agendar a instalação!`,
                requireInteraction: true // A notificação fica na tela até ser fechada ou clicada
              });
            }
          });
        }
      } else {
        isFirstLoad.current = false;
      }

      previousClientsRef.current = list;
      setClients(list);
      localStorage.setItem('conecta_fiber_clients', JSON.stringify(list));
    }, (error) => {
      // Apenas ignora em vez de dar throw se for erro de permissão no onSnapshot
      console.error('Erro no onSnapshot:', error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Salvar cliente (Criar ou Atualizar)
  const handleSaveClient = async (savedClient: Client) => {
    try {
      const exists = clients.some(c => c.id === savedClient.id);
      
      const clientToSave = { ...savedClient };
      if (!exists && !clientToSave.selfRegistered) {
        clientToSave.registeredBy = appUser?.name || 'Admin';
      }

      const docRef = doc(db, 'clients', clientToSave.id);
      await setDoc(docRef, clientToSave);
      
      if (exists) {
        triggerToast(`Cadastro de "${savedClient.name}" atualizado com sucesso!`, 'info');
      } else {
        triggerToast(`Assinatura ativa! Técnico agendado no plano ${PLANS.find(p => p.id === savedClient.planId)?.speed}!`, 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clients');
    }
    setEditingClient(null);
    setIsFormModalOpen(false);
  };

  // Callback de sucesso vindo do portal público do próprio cliente (Autocadastro)
  const handleClientSelfSubscribe = async (newClient: Client) => {
    try {
      const docRef = doc(db, 'clients', newClient.id);
      // Garante que é tratado como notificação recente para que o ERP exiba o balão
      const clientWithProps: Client = {
        ...newClient,
        selfRegistered: true,
        isNewNotification: true
      };
      await setDoc(docRef, clientWithProps);
      triggerToast(`Olá ${newClient.name}! Sua solicitação de banda larga Fibra foi enviada para o faturamento!`, 'success');
    } catch (error: any) {
      console.error("Erro ao salvar cadastro do cliente:", error);
      triggerToast('Ocorreu um erro de permissão ao salvar seu cadastro. Contate o provedor.', 'danger');
    }
  };

  // Deletar cliente
  const handleDeleteClient = async (id: string) => {
    const clientToRemove = clients.find(c => c.id === id);
    try {
      const docRef = doc(db, 'clients', id);
      await deleteDoc(docRef);
      if (clientToRemove) {
        triggerToast(`Fidelização de "${clientToRemove.name}" foi desativada e removida de todos os dispositivos.`, 'danger');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
    
    if (editingClient && editingClient.id === id) {
      setEditingClient(null);
    }
  };

  // Mudar status rapidamente
  const handleStatusChange = async (id: string, newStatus: ClientStatus) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    try {
      const docRef = doc(db, 'clients', id);
      await updateDoc(docRef, { status: newStatus });
      triggerToast(`Sinal de "${client.name}" foi atualizado para [${newStatus}].`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
  };

  // Arquivar ou descartar a notificação
  const handleDismissNotification = async (id: string) => {
    try {
      const docRef = doc(db, 'clients', id);
      await updateDoc(docRef, { isNewNotification: false });
      triggerToast('Notificação arquivada!', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
    if (notificationClient && notificationClient.id === id) {
      setNotificationClient(null);
    }
  };


  // Iniciar edição de cliente
  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
    triggerToast(`Modo edição ERP: Carregando dados de ${client.name}`, 'info');
    
    // Rola de volta para o topo do formulário suavemente
    const formElement = document.getElementById('registration-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const calculateMrr = () => {
    return clients.reduce((acc, client) => {
      if (client.status === 'Ativo') {
        const plan = PLANS.find(p => p.id === client.planId);
        return acc + (plan?.price || 0);
      }
      return acc;
    }, 0);
  };

  // Verifica Autenticação primeiro
  if (!isSharedPortal) {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!currentUser) {
      return <LoginScreen />;
    }

    if (appUser?.status === 'pending') {
      return <PendingApproval />;
    }
    
    if (appUser?.status === 'rejected') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
              <X className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Acesso Bloqueado</h2>
              <p className="text-slate-600 text-sm">Sua conta foi desativada pelo administrador. Se achar que isso é um erro, entre em contato com o suporte.</p>
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
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col" id="app-root-container">
      
      {/* Top Navbar Header */}
      <Header clientCount={clients.length} totalMrr={calculateMrr()} isAdmin={!isSharedPortal} />

      {/* Top Sticky bar para alternar entre as visões do Provedor (ERP) e do Cliente final */}
      {!isSharedPortal && (
        <div className="bg-white text-slate-800 border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8 shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans">
            
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-slate-500 font-bold">
                Alternador de Ambientes do Protótipo:
              </span>
            </div>

            <div className="flex items-center flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200/80 gap-1 overflow-hidden">
              
              {/* Botão de Vista do Cliente */}
              <button
                onClick={() => {
                  setViewMode('customer');
                  setEditingClient(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black transition-all cursor-pointer uppercase text-[10px] tracking-wider ${
                  viewMode === 'customer'
                    ? 'bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-cyan-600" />
                Portal de Cadastro (Cliente)
              </button>

              {/* Botão de Vista Administração */}
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black transition-all cursor-pointer uppercase text-[10px] tracking-wider ${
                  viewMode === 'admin'
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Monitor className="w-4 h-4 text-orange-600" />
                Painel Interno (ERP Provedor)
              </button>
              
              {/* Botão Gestão de Usuários (Apenas Admin) */}
              {appUser?.role === 'admin' && (
                <button
                  onClick={() => setViewMode('users')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-black transition-all cursor-pointer uppercase text-[10px] tracking-wider ${
                    viewMode === 'users'
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-purple-700 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Gestão de Equipe
                </button>
              )}

            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-600 font-medium font-sans">
              <Activity className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>Preencha como cliente e veja o faturamento e fila de fiação ótica rodar no ERP!</span>
            </div>

          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Toast Notificação Flutuante */}
        {toastMessage && (
          <div 
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold transition-all animate-bounce max-w-[420px] ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-250' 
                : toastMessage.type === 'danger'
                ? 'bg-rose-50 text-rose-900 border-rose-250'
                : 'bg-indigo-50 text-indigo-900 border-indigo-250'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {toastMessage.type === 'danger' && <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* MODO PORTAL DO CLIENTE (Autoatendimento Intuitivo) */}
        {viewMode === 'customer' ? (
          <div className="animate-fade-in space-y-6">
            <CustomerPortal onRegisterSuccess={handleClientSelfSubscribe} />
          </div>
        ) : viewMode === 'users' ? (
          /* MODO GESTÃO DE USUÁRIOS */
          <div className="animate-fade-in space-y-6">
            <UserManagement />
          </div>
        ) : (
          /* MODO ERP ADMINISTRATIVO (Gestão e faturamento) */
          <div className="animate-fade-in space-y-6">
            
            {/* Cartões de Indicadores Chave de Desempenho (Dashboards) */}
            <MetricCard clients={clients} />

            {/* Alerta de Novos Cadastros via Portal de Autoatendimento */}
            {clients.some(c => c.isNewNotification) && (
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50/50 border border-blue-200 rounded-2xl p-5 shadow-xs space-y-3.5 animate-pulse">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                    </span>
                    <div className="text-left">
                      <h3 className="text-sm font-extrabold text-slate-900 font-sans flex items-center gap-1.5Box">
                        Novos Clientes Cadastrados pelo Portal! ({clients.filter(c => c.isNewNotification).length})
                      </h3>
                      <p className="text-xs text-slate-500 font-sans">
                        Seus clientes preencheram o autoatendimento. Clique para acessar o cadastro completo e ativar a fibra.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-150 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200/50">
                    Ação Requerida
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clients.filter(c => c.isNewNotification).map(newC => {
                    const planInfo = PLANS.find(p => p.id === newC.planId);
                    return (
                      <div 
                        key={newC.id} 
                        className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition-colors"
                      >
                        <div className="truncate text-left">
                          <p className="font-extrabold text-slate-900 text-xs truncate max-w-[120px]" title={newC.name}>
                            {newC.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                            {planInfo?.speed || 'Fibra'} • Dia {newC.dueDate}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setNotificationClient(newC)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Ver Ficha
                          </button>
                          <button
                            onClick={() => handleDismissNotification(newC.id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                            title="Arquivar aviso"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 items-stretch w-full mb-6">
              <button 
                onClick={() => setIsFormModalOpen(true)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-6 flex flex-col justify-center items-start shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                 <div className="flex items-center gap-3 mb-2">
                   <div className="bg-blue-500/20 p-2.5 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                     <UserPlus className="w-6 h-6 text-blue-400" />
                   </div>
                   <h3 className="text-xl font-bold font-sans tracking-wide">NOVO CONTRATO</h3>
                 </div>
                 <p className="text-slate-400 text-sm font-sans text-left">Clique aqui para abrir a ficha de cadastro e inserir um novo assinante manualmente.</p>
              </button>
              
              <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-205 shadow-sm text-left flex flex-col justify-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 text-blue-600 mb-2.5">
                  <Users className="w-4 h-4 text-blue-500" /> Link de Autoatendimento
                </h4>
                <p className="text-xs text-slate-500 font-sans leading-relaxed mb-3">
                  Copie e envie o link abaixo para seus clientes realizarem o próprio cadastro de forma autônoma e segura:
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}${window.location.pathname}?mode=cliente`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 focus:outline-hidden"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    title="Clique para selecionar tudo"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?mode=cliente`);
                      setCopiedLink(true);
                      triggerToast('Link de cadastro copiado com sucesso!', 'success');
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer flex-shrink-0 transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/20"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Lado Direito: Listagem, pesquisas avançadas e alterações de status */}
              <div className="lg:col-span-12 space-y-4">
                <ClientTable 
                  clients={clients} 
                  onEdit={handleStartEdit} 
                  onDelete={handleDeleteClient} 
                  onStatusChange={handleStatusChange} 
                />
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer Area */}
      <footer className="bg-white border-t border-slate-200 text-slate-600 py-6 text-center text-xs mt-12 font-sans shadow-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 Tornado Fibra Telecomunicações Ltda. Todos os direitos reservados.</p>
          <p className="text-[10px] text-slate-400">
            Plataforma interna ERP e de Vendas integrada homologada pela ANATEL para cadastro de faturas de banda larga residencial de alta velocidade de Tornado Fibra.
          </p>
        </div>
      </footer>

      {/* Modal Notification para Detalhes do Cliente */}
      {notificationClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-slide-up relative">
            {/* Cabeçalho */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
              <div className="text-left">
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-black uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Ficha do Cliente • Autoatendimento Portal
                </span>
                <h4 className="text-base font-black mt-1 text-white max-w-[320px] truncate">{notificationClient.name}</h4>
              </div>
              <button 
                onClick={() => setNotificationClient(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo */}
            <div className="p-6 space-y-5 text-sm text-slate-650 bg-white max-h-[70vh] overflow-y-auto">
              
              {/* Plano Selecionado */}
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-left">
                  <span className="text-[10px] text-emerald-700 uppercase font-black tracking-wider block">Plano Selecionado</span>
                  <span className="text-sm font-black text-emerald-800">
                    {PLANS.find(p => p.id === notificationClient.planId)?.speed} ({PLANS.find(p => p.id === notificationClient.planId)?.name})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Preço / Vencimento</span>
                  <span className="text-sm font-black text-slate-900">
                    R$ {PLANS.find(p => p.id === notificationClient.planId)?.price.toFixed(2)} • Dia {notificationClient.dueDate}
                  </span>
                </div>
              </div>

              {/* Informações Pessoais */}
              <div className="space-y-2 text-left">
                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider">Identificação & Contatos</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-sans">
                  <p className="text-slate-700"><strong>Nome:</strong> <span className="font-extrabold text-slate-900">{notificationClient.name}</span></p>
                  <p className="text-slate-700"><strong>CPF:</strong> <span className="font-bold text-slate-900">{notificationClient.cpf}</span></p>
                  <p className="text-slate-700"><strong>Telefone:</strong> <span className="font-bold text-slate-900">{notificationClient.phone}</span></p>
                  <p className="text-slate-700"><strong>E-mail:</strong> <span className="font-bold text-slate-900 text-xs block truncate" title={notificationClient.email}>{notificationClient.email}</span></p>
                  {notificationClient.birthDate && <p className="text-slate-700"><strong>Nascimento:</strong> <span className="font-bold text-slate-900">{notificationClient.birthDate.split('-').reverse().join('/')}</span></p>}
                </div>
              </div>

              {/* Endereço de Instalação */}
              <div className="space-y-2 text-left">
                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" /> Endereço de Instalação Física
                </h5>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5 font-sans">
                  <p className="font-black text-slate-900">{notificationClient.address}, Nº {notificationClient.number}</p>
                  <p className="text-slate-600">Bairro: <span className="font-bold text-slate-800">{notificationClient.neighborhood}</span></p>
                  <p className="text-slate-600">CEP: <span className="font-bold text-slate-800">{notificationClient.cep}</span></p>
                  <p className="text-slate-500 text-xs">{notificationClient.city}</p>
                </div>
              </div>

              {/* Serviços Adicionais */}
              {notificationClient.additionalServices && notificationClient.additionalServices.length > 0 && (
                <div className="space-y-1.5 text-left pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Adicionais Contratados</span>
                  <div className="flex flex-wrap gap-1.5">
                    {notificationClient.additionalServices.map((srv, idx) => (
                      <span key={idx} className="inline-block text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data e hora de criação */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-sans">
                <span>Registrado em: {new Date(notificationClient.createdAt).toLocaleString('pt-BR')}</span>
                <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase text-[9px] tracking-wide">
                  Autoatendimento
                </span>
              </div>

              {/* Ações de Gestão */}
              <div className="border-t border-slate-150 pt-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-500 block text-left">Ações Rápidas do Administrador:</span>
                <div className="flex flex-col sm:flex-row gap-2 font-sans">
                  <button
                    onClick={() => {
                      handleStatusChange(notificationClient.id, 'Ativo');
                      handleDismissNotification(notificationClient.id);
                      setNotificationClient(null);
                      triggerToast(`Cliente ${notificationClient.name} ativado comercialmente!`, 'success');
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Ativar Contrato / Sinal Ativo
                  </button>
                  <button
                    onClick={() => {
                      handleDismissNotification(notificationClient.id);
                      setNotificationClient(null);
                    }}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Marcar Como Lido / Pendente
                  </button>
                </div>
              </div>

            </div>

            {/* Rodapé modal */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setNotificationClient(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Voltar à Lista
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Ficha de Cadastro (Novo ou Edição) */}
      {(isFormModalOpen || editingClient) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-transparent w-full max-w-4xl max-h-[95vh] overflow-y-auto relative rounded-3xl pb-10">
            <button 
              onClick={() => { setIsFormModalOpen(false); setEditingClient(null); }} 
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 z-10 transition-colors shadow-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <ClientForm 
              onSave={handleSaveClient} 
              editingClient={editingClient} 
              onCancelEdit={() => { setIsFormModalOpen(false); setEditingClient(null); }} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
