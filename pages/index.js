import Head from 'next/head';

import OrderConsole from '../components/orders/OrderConsole';

export default function OrdersPage() {
  return (
    <>
      <Head>
        <title>Asian Hospitals · Order desk</title>
        <meta
          name="description"
          content="Incoming DRJIVA medicine orders for Asian Multi Speciality Hospitals."
        />
      </Head>
      <OrderConsole />
    </>
  );
}
