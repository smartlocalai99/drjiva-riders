import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

import '../styles/globals.css';
import { HospitalProvider } from '../utils/HospitalContext';

const plexSans = IBM_Plex_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-plex-sans',
  weight: ['400', '500', '600', '700'],
});
const plexMono = IBM_Plex_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['500', '600'],
});

export default function App({ Component, pageProps }) {
  return (
    <div className={`${plexSans.variable} ${plexMono.variable}`}>
      <HospitalProvider>
        <Component {...pageProps} />
      </HospitalProvider>
    </div>
  );
}
