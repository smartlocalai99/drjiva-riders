import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { mockDb } from './mockDb';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const router = useRouter();

  // persist in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('patient');
    if (stored) setPatient(JSON.parse(stored));
  }, []);

  const login = async (mobile, otp) => {
    if (otp !== '1234') throw new Error('Invalid OTP');
    const p = await mockDb.upsertPatient({ mobile });
    setPatient(p);
    localStorage.setItem('patient', JSON.stringify(p));
    router.replace('/dashboard');
  };

  const logout = () => {
    setPatient(null);
    localStorage.removeItem('patient');
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ patient, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
