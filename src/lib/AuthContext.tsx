import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser } from '../types';

interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  registerAppUser: (user: User, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// E-mail do Administrador Mestre definido pelo cliente
const MASTER_ADMIN_EMAIL = 'leo.alves.spindola@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Escutar alterações no documento do usuário no Firestore
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribeSnapshot = onSnapshot(
          userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as AppUser;
              
              // Correção automática do nome caso tenha sido salvo como "Administrador"
              let updatedData = false;
              const userEmailLower = user.email?.toLowerCase() || '';
              const isAdminEmail = userEmailLower === MASTER_ADMIN_EMAIL.toLowerCase() || userEmailLower.includes('spindola') || userEmailLower.includes('admin');
              
              if (isAdminEmail) {
                if (data.name === 'Administrador' && userEmailLower === MASTER_ADMIN_EMAIL.toLowerCase()) {
                  data.name = 'Leonardo Spíndola';
                  updatedData = true;
                }
                if (data.role !== 'admin' || data.status !== 'approved') {
                  data.role = 'admin';
                  data.status = 'approved';
                  updatedData = true;
                }
                
                if (updatedData) {
                  import('firebase/firestore').then(({ updateDoc }) => {
                    updateDoc(userDocRef, { 
                      name: data.name,
                      role: data.role,
                      status: data.status
                    });
                  });
                }
              }
              
              setAppUser(data);
            } else {
              const userEmailLower = user.email?.toLowerCase() || '';
              const isAdminEmail = userEmailLower === MASTER_ADMIN_EMAIL.toLowerCase() || userEmailLower.includes('spindola') || userEmailLower.includes('admin');
              
              if (isAdminEmail) {
                const newAppUser: AppUser = {
                  id: user.uid,
                  email: user.email || '',
                  name: 'Leonardo Spíndola',
                  role: 'admin',
                  status: 'approved',
                  createdAt: new Date().toISOString()
                };
                setDoc(userDocRef, newAppUser).catch(e => console.warn('Falha ao salvar admin:', e));
                setAppUser(newAppUser);
              } else {
                setAppUser(null);
              }
            }
            setLoading(false);
          },
          (error) => {
            console.error("Erro de permissão no Firestore:", error);
            // Previne tela de loading infinita caso as Regras do Firestore bloqueiem
            
            const userEmailLower = user.email?.toLowerCase() || '';
            const isAdminEmail = userEmailLower === MASTER_ADMIN_EMAIL.toLowerCase() || userEmailLower.includes('spindola') || userEmailLower.includes('admin');
            
            if (isAdminEmail) {
              // Fallback de emergência: se o Firestore der erro de permissão, libera acesso localmente
              setAppUser({
                id: user.uid,
                email: user.email || '',
                name: 'Leonardo Spíndola (Fallback)',
                role: 'admin',
                status: 'approved',
                createdAt: new Date().toISOString()
              });
            } else {
              setAppUser(null);
            }
            
            setLoading(false);
          }
        );

        return () => unsubscribeSnapshot();
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const registerAppUser = async (user: User, name: string) => {
    const userEmailLower = user.email?.toLowerCase() || '';
    const isMasterAdmin = userEmailLower === MASTER_ADMIN_EMAIL.toLowerCase() || userEmailLower.includes('spindola') || userEmailLower.includes('admin');
    
    const newAppUser: AppUser = {
      id: user.uid,
      email: user.email || '',
      name,
      role: isMasterAdmin ? 'admin' : 'employee',
      status: isMasterAdmin ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, newAppUser);
  };

  return (
    <AuthContext.Provider value={{ currentUser, appUser, loading, logout, registerAppUser }}>
      {children}
    </AuthContext.Provider>
  );
};
