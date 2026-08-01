// pages/_app.js
import '../styles/globals.css';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { HospitalProvider } from '../utils/HospitalContext';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600'] });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex-sans', weight: ['400', '500', '600'] });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] });

function MyApp({ Component, pageProps }) {
  return (
    <div className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <HospitalProvider>
        <Component {...pageProps} />
      </HospitalProvider>
    </div>
  );
}

export default MyApp;
