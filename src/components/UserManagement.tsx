import React, { useEffect, useState } from 'react';

import { db, handleFirestoreError, OperationType, secondaryAuth } from '../lib/firebase';
import { AppUser, UserStatus } from '../types';
import { ShieldCheck, UserCheck, UserX, Clock, Search, Plus, X, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { collection as firestoreCollection, query as firestoreQuery, onSnapshot as firestoreOnSnapshot, doc as firestoreDoc, updateDoc as firestoreUpdateDoc, orderBy as firestoreOrderBy, setDoc as firestoreSetDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'employee'>('employee');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const { appUser } = useAuth();

  useEffect(() => {
    if (appUser?.role !== 'admin') return;

    const usersRef = firestoreCollection(db, 'users');
    const q = firestoreQuery(usersRef, firestoreOrderBy('createdAt', 'desc'));

    const unsubscribe = firestoreOnSnapshot(q, (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as AppUser);
      });
      setUsers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [appUser]);

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      const userRef = firestoreDoc(db, 'users', userId);
      await firestoreUpdateDoc(userRef, { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const formatAuthEmail = (input: string) => {
    const trimmed = input.trim();
    if (trimmed.includes('@')) return trimmed;
    const formatted = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${formatted}@app.tornadofibra.com`;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      const authEmail = formatAuthEmail(newUserUsername);
      
      // Create user in Firebase Auth using the SECONDARY app so main user is not logged out
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, newUserPassword);
      
      const newAppUser: AppUser = {
        id: userCredential.user.uid,
        email: newUserUsername.trim(), // Save the actual username they typed
        name: newUserName.trim(),
        role: newUserRole,
        status: 'approved', // Automatically approved since admin created it
        createdAt: new Date().toISOString()
      };

      // Save to Firestore using the main db
      const userDocRef = firestoreDoc(db, 'users', userCredential.user.uid);
      await firestoreSetDoc(userDocRef, newAppUser);

      // Sign out the secondary auth to clean up
      await secondaryAuth.signOut();

      // Close modal and reset form
      setShowAddModal(false);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('employee');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setCreateError('Este nome de usuário já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        setCreateError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setCreateError('Erro ao criar usuário: ' + error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (appUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso Restrito</div>;
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden font-sans relative z-10">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Gestão de Funcionários
            </h2>
            <p className="text-sm text-slate-500">Aprove ou revogue o acesso da sua equipe ao ERP.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Perfil
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status de Acesso
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cadastrado em
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-slate-900">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full ${
                      user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : 'Funcionário'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.status === 'approved' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                        <UserCheck className="w-4 h-4" /> Aprovado
                      </span>
                    )}
                    {user.status === 'pending' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                        <Clock className="w-4 h-4" /> Aguardando
                      </span>
                    )}
                    {user.status === 'rejected' && (
                      <span className="flex items-center gap-1.5 text-sm font-bold text-rose-500">
                        <UserX className="w-4 h-4" /> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.id !== appUser?.id ? (
                      <div className="flex justify-end gap-2">
                        {user.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                        {user.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'rejected')}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            Bloquear
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium italic">Você</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Novo Usuário */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800">Novo Funcionário</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                  {createError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome de Usuário (Login)
                </label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="Ex: joao ou joao.silva"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Esse é o nome que o funcionário vai digitar na tela de login.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Senha (mín. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nível de Acesso
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'employee')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="employee">Funcionário (Apenas Portal de Vendas)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-sm transition-colors flex items-center justify-center disabled:opacity-70"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
