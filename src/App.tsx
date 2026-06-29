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
import { Info, CheckCircle2, AlertTriangle, Users, Monitor, ShieldCheck, HelpCircle, Activity, ServerCrash, X, Calendar, MapPin, Eye, ExternalLink, Check, Copy } from 'lucide-react';

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  
  // Toggle entre o Portal do Cliente (Inscrição Autônoma), ERP Administrativo (Provedor) e Gestão de Usuários
  const [viewMode, setViewMode] = useState<'customer' | 'admin' | 'users'>('admin'); // Padrão é admin para funcionários logados
  const [isSharedPortal, setIsSharedPortal] = useState(false);
  const [notificationClient, setNotificationClient] = useState<Client | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const { currentUser, appUser, loading } = useAuth();

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
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'cliente' || params.get('portal') === 'true') {
      setIsSharedPortal(true);
      setViewMode('customer');
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
            triggerToast(
              `Notificação: O cliente "${newC.name}" realizou cadastro no plano ${planInfo?.speed || 'Turbinado'}!`,
              'success'
            );
          });
        }
      } else {
        isFirstLoad.current = false;
      }

      previousClientsRef.current = list;
      setClients(list);
      localStorage.setItem('conecta_fiber_clients', JSON.stringify(list));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Salvar cliente (Criar ou Atualizar)
  const handleSaveClient = async (savedClient: Client) => {
    try {
      const exists = clients.some(c => c.id === savedClient.id);
      const docRef = doc(db, 'clients', savedClient.id);
      await setDoc(docRef, savedClient);
      
      if (exists) {
        triggerToast(`Cadastro de "${savedClient.name}" atualizado com sucesso!`, 'info');
      } else {
        triggerToast(`Assinatura ativa! Técnico agendado no plano ${PLANS.find(p => p.id === savedClient.planId)?.speed}!`, 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clients');
    }
    setEditingClient(null);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clients');
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
          <div className="bg-white p-8 rounded-2xl max-w-md text-center space-y-4">
            <X className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Acesso Bloqueado</h2>
            <p className="text-slate-600">Sua conta foi desativada pelo administrador.</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Lado Esquerdo: Painel de Registro Manual (Administrador) */}
              <div className="lg:col-span-12 md:grid md:grid-cols-2 lg:grid-cols-2 xl:flex xl:flex-col xl:col-span-5 xl:sticky xl:top-6 gap-6 xl:space-y-4">
                <ClientForm 
                  onSave={handleSaveClient} 
                  editingClient={editingClient} 
                  onCancelEdit={() => setEditingClient(null)} 
                />

                {/* Cartão de Compartilhamento de Link de Cadastro Autônomo */}
                <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-3 text-left">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 text-blue-600">
                    <Users className="w-4 h-4 text-blue-500" /> Link de Autoatendimento
                  </h4>
                  <p className="text-xs text-slate-500 font-sans leading-relaxed">
                    Copie e envie o link abaixo para seus clientes realizarem o próprio cadastro de forma autônoma e segura no celular ou computador:
                  </p>
                  
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}${window.location.pathname}?mode=cliente`}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] font-mono text-slate-600 focus:outline-hidden"
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
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer flex-shrink-0 transition-all flex items-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Caixa informativa de conformidade e ANATEL */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/95 shadow-sm space-y-3.5 text-left h-fit">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-orange-500" /> Regulamento de Assinaturas
                  </h4>
                  <ul className="space-y-2.5 text-xs text-slate-600 font-sans">
                    <li className="flex items-start gap-2">
                      <span className="bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded font-bold mt-0.5 font-mono">1</span>
                      <span><strong>Dia de Vencimento:</strong> Alterações de vencimento (5, 10, 15, 20, 25) entram em vigor na fatura subsequente do assinante.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded font-bold mt-0.5 font-mono">2</span>
                      <span><strong>Status Bloqueado:</strong> Clientes com bloqueio financeiro têm a transmissão reduzida para 100kbps automaticamente pelo roteador de borda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded font-bold mt-0.5 font-mono">3</span>
                      <span><strong>Fila de Atendimento:</strong> Clientes que se cadastram pelo Portal de Clientes entram com status "Instalação Pendente" até que o técnico confirme a ativação física no poste.</span>
                    </li>
                  </ul>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Cadastro homologado de acordo com as normas federais.</span>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Listagem, pesquisas avançadas e alterações de status */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-4">
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

      {/* Modal especial de cadastro completo recebido via portal do cliente */}
      {notificationClient && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setNotificationClient(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
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

    </div>
  );
}
