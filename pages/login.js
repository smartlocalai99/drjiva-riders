// pages/login.js
import { useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useRouter } from 'next/router';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('1234');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(mobile, otp);
      router.replace('/patient');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="glass rounded-lg p-8 shadow-xl w-96"
      >
        <h1 className="text-2xl mb-4 text-center">Shop Login</h1>
        <input
          type="tel"
          placeholder="Mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-white/10"
          required
        />
        <input
          type="text"
          placeholder="OTP (demo = 1234)"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-2 mb-6 rounded bg-white/10"
          required
        />
        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary/80 py-2 rounded transition"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
