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
              setAppUser(docSnap.data() as AppUser);
            } else {
              setAppUser(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Erro de permissão no Firestore:", error);
            // Previne tela de loading infinita caso as Regras do Firestore bloqueiem
            setAppUser(null);
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
    const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL;
    
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
