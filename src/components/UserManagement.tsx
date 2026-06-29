import React, { useEffect, useState } from 'react';

import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AppUser, UserStatus } from '../types';
import { ShieldCheck, UserCheck, UserX, Clock, Search, MoreVertical } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
// Note: firebase/auth doesn't export collection. Wait, I imported it wrong. I need to fix imports.
import { collection as firestoreCollection, query as firestoreQuery, onSnapshot as firestoreOnSnapshot, doc as firestoreDoc, updateDoc as firestoreUpdateDoc, orderBy as firestoreOrderBy } from 'firebase/firestore';

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (appUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso Restrito</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden font-sans">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Gestão de Funcionários
          </h2>
          <p className="text-sm text-slate-500">Aprove ou revogue o acesso da sua equipe ao ERP.</p>
        </div>

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
  );
}
