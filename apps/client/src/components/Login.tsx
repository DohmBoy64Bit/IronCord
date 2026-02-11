import React, { useState } from 'react';
import { useStore } from '../store';

const Login: React.FC<{ onSwitch: () => void }> = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setUser = useStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await window.ironcord.login({ email, password });
      if (response.success) {
        setUser(response.user);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-xl">
        <h2 className="mb-6 text-center text-3xl font-bold text-white">Welcome back!</h2>
        <p className="mb-8 text-center text-gray-400">We're so excited to see you again!</p>

        {error && (
          <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-gray-900 p-3 text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase text-gray-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-gray-900 p-3 text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-indigo-600 py-3 font-bold transition-colors hover:bg-indigo-700"
          >
            Log In
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-400">
          Need an account?{' '}
          <button onClick={onSwitch} className="text-indigo-400 hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
