// pages/_app.js
import '../styles/globals.css';
import { AuthProvider } from '../utils/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Simple client‑side guard: public pages are /login only
  useEffect(() => {
    if (!router.isReady) return;
    const publicPaths = ['/login'];
    const path = router.pathname;
    const patient = typeof window !== 'undefined' && localStorage.getItem('patient');
    // If not on a public page and no patient, redirect to login
    if (!publicPaths.includes(path) && !patient) {
      router.replace('/login');
    }
  }, [router.isReady, router.pathname]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
