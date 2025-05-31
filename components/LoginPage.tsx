import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      navigate('/'); // Navigate to homepage or dashboard after login
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 p-4">
      <div className="w-full max-w-md p-8 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700">
        <h2 className="text-3xl font-bold text-center text-white mb-8">Login to Seen</h2>
        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                   className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                   className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors" />
          </div>
          <button type="submit" disabled={loading}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm text-neutral-400 mt-8">
          Don't have an account? <Link to="/signup" className="text-cyan-400 hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}; 