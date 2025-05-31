import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// Simple Google Icon SVG - you can replace this with a better one or an icon library
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // For email/password login
  const [oauthLoading, setOauthLoading] = useState(false); // For OAuth provider login
  const { signInWithPassword, signInWithGoogle } = useAuth(); // Added signInWithGoogle
  const navigate = useNavigate();

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      navigate('/'); 
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setOauthLoading(true);
    try {
      await signInWithGoogle();
      // Navigation will happen automatically upon successful OAuth redirect and session update
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setOauthLoading(false); // Only set to false if there's an error before redirect
    }
    // If no error, redirect happens, so oauthLoading might not be reset here
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 p-4">
      <div className="w-full max-w-md p-8 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Login to Seen</h2>
        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
        
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-5">
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
          <button type="submit" disabled={loading || oauthLoading}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-neutral-600"></div>
          <span className="px-3 text-xs text-neutral-500 uppercase">Or continue with</span>
          <div className="flex-grow border-t border-neutral-600"></div>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading || oauthLoading}
                className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center border border-neutral-600">
          {oauthLoading ? <span className='animate-pulse'>Connecting...</span> : <><GoogleIcon /> Sign in with Google</>}
        </button>

        <p className="text-center text-sm text-neutral-400 mt-8">
          Don't have an account? <Link to="/signup" className="text-cyan-400 hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}; 