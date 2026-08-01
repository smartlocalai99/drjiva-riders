import Head from 'next/head';
import { useState } from 'react';

import AccessGate from '../components/orders/AccessGate';
import OrderConsole from '../components/orders/OrderConsole';

export default function OrdersPage() {
  const [accessCode, setAccessCode] = useState('');

  return (
    <>
      <Head>
        <title>Asian Hospitals · Order desk</title>
        <meta
          name="description"
          content="Incoming DRJIVA medicine orders for Asian Multi Speciality Hospitals."
        />
      </Head>
      {accessCode ? (
        <OrderConsole
          accessCode={accessCode}
          onLock={() => setAccessCode('')}
        />
      ) : (
        <AccessGate onUnlock={setAccessCode} />
      )}
    </>
  );
}
