import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ScrollingPosterColumn from './ScrollingPosterColumn'; // Re-enable this

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Optional: Collect username at signup
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // For success/confirmation messages
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      // You might want to add password confirmation here
      const { data } = await signUp(email, password, { username: username }); // Pass username as additional data
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setMessage("Signup successful, but there might be an issue with user identity. Please try logging in or contact support.");
      } else if (data.session) {
        // User is signed up and logged in (if email confirmation is off or auto-confirmed)
        navigate('/'); 
      } else {
        // User is signed up but needs to confirm email (if email confirmation is on)
        setMessage('Signup successful! Please check your email to confirm your account.');
        // setEmail(''); setPassword(''); setUsername(''); // Clear form
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 p-4 relative overflow-hidden">
      {/* Background Animation Columns - Apply blur to posters, remove backdrop-blur */}
      <div className="absolute inset-0 flex flex-row justify-center opacity-10 md:opacity-15 z-0 blur-lg">
        <ScrollingPosterColumn mediaType="tv" scrollDirection="down" animationSpeed={30} />
        <ScrollingPosterColumn mediaType="movie" scrollDirection="up" animationSpeed={40} />
        <ScrollingPosterColumn mediaType="tv" scrollDirection="down" animationSpeed={25} />
        <ScrollingPosterColumn mediaType="movie" scrollDirection="up" animationSpeed={35} />
      </div>

      <div className="w-full max-w-md p-8 bg-neutral-800/80 backdrop-blur-md rounded-xl shadow-2xl border border-neutral-700/60 relative z-10">
        <h2 className="text-3xl font-bold text-center text-white mb-8">Create an Account</h2>
        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
        {message && <p className="bg-green-500/20 text-green-300 p-3 rounded-md mb-4 text-sm">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-300 mb-1">Username (optional)</label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} 
                   className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                   className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                   className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors" />
          </div>
          <button type="submit" disabled={loading}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-sm text-neutral-400 mt-8">
          Already have an account? <Link to="/login" className="text-cyan-400 hover:underline font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}; 