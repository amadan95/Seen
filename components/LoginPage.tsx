import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ScrollingPosterColumn from './ScrollingPosterColumn';
import { APP_NAME, ACCENT_COLOR_CLASS_BG, ACCENT_COLOR_CLASS_BG_HOVER, ACCENT_COLOR_CLASS_TEXT } from '../constants';
import { UserIcon, EyeIcon } from '../icons';
import HCaptcha from '@hcaptcha/react-hcaptcha';

// Self-contained GoogleIcon SVG to avoid import issues
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
);

// Self-contained EyeSlashIcon SVG
const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // For email/password login
  const [oauthLoading, setOauthLoading] = useState(false); // For OAuth provider login
  const { signInWithPassword, signInWithGoogle, signInWithApple, signInAnonymously, loading: authLoading, error: authError, resetPasswordForEmail } = useAuth();
  const navigate = useNavigate();

  const [captchaToken, setCaptchaToken] = useState<string | null>(null); // State for hCaptcha token
  const captchaRef = useRef<HCaptcha>(null); // Ref for hCaptcha instance
  const [showCaptcha, setShowCaptcha] = useState(false); // New state for captcha visibility
  const [attemptAnonSignInAfterCaptcha, setAttemptAnonSignInAfterCaptcha] = useState(false); // New state to trigger sign-in post-captcha
  const [showPasswordResetInput, setShowPasswordResetInput] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Simple validation
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await signInWithPassword(email, password); 
      setLoading(false);
      if (!signInError) {
        navigate('/'); 
      } else {
        // authError from useAuth() will display Supabase errors for signInWithPassword
      }
    } catch (err: any) { 
      setLoading(false);
      setError(err.message || "An unexpected error occurred during sign-in.");
    }
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

  const handlePasswordResetRequest = async () => {
    if (!resetEmail) {
      setError("Please enter your email address.");
      return;
    }
    setError(null);
    setPasswordResetMessage(null);
    setLoading(true); // Use general loading or a specific one for password reset
    try {
      // @ts-ignore
      const { error: resetError } = await resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`, // Replace with your actual update password page URL
      });
      setLoading(false);
      if (resetError) {
        setError(resetError.message);
      } else {
        setPasswordResetMessage("If an account exists for this email, a password reset link has been sent.");
        setShowPasswordResetInput(false);
        setResetEmail('');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Failed to send password reset email.");
    }
  };

  const handleRequestAnonymousSignIn = () => {
    setError(null); // Clear previous errors
    if (!showCaptcha) {
      setShowCaptcha(true);
      setAttemptAnonSignInAfterCaptcha(true); // Set flag to sign in after captcha
      // Captcha will render and user will solve it. onHCaptchaVerify will trigger next step.
    } else if (!captchaToken) {
      // Captcha is already visible but not solved
      setError("Please complete the CAPTCHA challenge.");
      captchaRef.current?.execute(); // Re-trigger execution if needed
    } else {
      // Captcha is visible AND solved, but this function was called again (e.g. user clicked button again)
      // This case should ideally not happen if button is disabled correctly, but as a fallback:
      performAnonymousSignIn(); // Directly attempt sign-in
    }
  };

  const performAnonymousSignIn = async () => {
    if (!captchaToken) {
      setError("CAPTCHA verification is required.");
      setShowCaptcha(true); // Ensure captcha is visible if somehow bypassed
      return;
    }
    // setLoading(true); // Consider a specific loading state for anonymous sign-in if different from general authLoading
    const { error: anonError } = await signInAnonymously(captchaToken);
    // setLoading(false);
    if (!anonError) {
      navigate('/');
    } else {
      // authError from useAuth() or local error state will display Supabase/captcha errors
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      setShowCaptcha(false); // Hide captcha on error to allow re-try from button click
      setAttemptAnonSignInAfterCaptcha(false); // Reset flag
    }
  };

  // useEffect to trigger anonymous sign-in when captcha is verified AND flag is set
  useEffect(() => {
    if (captchaToken && attemptAnonSignInAfterCaptcha) {
      performAnonymousSignIn();
      setAttemptAnonSignInAfterCaptcha(false); // Reset the flag after attempting sign-in
    }
  }, [captchaToken, attemptAnonSignInAfterCaptcha]);

  const onHCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setError(null); // Clear any previous captcha errors
    // The useEffect will now pick this up if attemptAnonSignInAfterCaptcha is true
  };

  const onHCaptchaError = (err: string) => {
    setError(`CAPTCHA error: ${err}`);
    setCaptchaToken(null);
  };

  const onHCaptchaExpire = () => {
    setError("CAPTCHA challenge expired. Please try again.");
    setCaptchaToken(null);
  };

  // Make sure to get this from your .env file
  const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || 'YOUR_HCAPTCHA_SITE_KEY'; // Fallback for safety

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 p-4 relative overflow-hidden">
      {/* Background Animation Columns - Apply blur to posters, remove backdrop-blur */}
      <div className="absolute inset-0 flex flex-row justify-center opacity-10 md:opacity-15 z-0 blur-lg">
        <ScrollingPosterColumn mediaType="movie" scrollDirection="down" animationSpeed={30} />
        <ScrollingPosterColumn mediaType="tv" scrollDirection="up" animationSpeed={40} />
        <ScrollingPosterColumn mediaType="movie" scrollDirection="down" animationSpeed={25} />
        <ScrollingPosterColumn mediaType="tv" scrollDirection="up" animationSpeed={35} />
      </div>
      
      <div className="w-full max-w-md p-8 bg-neutral-800/80 backdrop-blur-md rounded-xl shadow-2xl border border-neutral-700/60 relative z-10">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Login to Seen</h2>
        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                   className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1">Password</label>
            <div className="relative">
              <input id="password" name="password" type={isPasswordVisible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-4 py-3 rounded-lg border-0 bg-slate-700/50 text-neutral-100 placeholder-neutral-400 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm transition" placeholder="••••••••" />
              <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-neutral-400 hover:text-neutral-200">
                {isPasswordVisible ? <EyeIcon className="h-5 w-5"/> : <EyeSlashIcon className="h-5 w-5"/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading || oauthLoading}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {/* Forgot Password Link and Input */}
          <div className="text-sm text-center mt-3">
            <button 
              type="button"
              onClick={() => { 
                setShowPasswordResetInput(!showPasswordResetInput); 
                setError(null); 
                setPasswordResetMessage(null); 
              }}
              className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {showPasswordResetInput && (
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-300 mb-1">Enter your account email:</label>
                <input 
                  type="email" 
                  id="reset-email" 
                  value={resetEmail} 
                  onChange={(e) => setResetEmail(e.target.value)} 
                  placeholder="you@example.com"
                  className="w-full p-3 bg-neutral-700 text-neutral-100 rounded-lg border border-neutral-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
                />
              </div>
              <button 
                type="button"
                onClick={handlePasswordResetRequest}
                disabled={loading}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          )}
          {passwordResetMessage && <p className="text-green-400 bg-green-900/30 p-3 rounded-md text-sm mt-3 text-center">{passwordResetMessage}</p>}

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

        <button 
          onClick={handleRequestAnonymousSignIn} 
          disabled={authLoading} // Only disable if general auth is loading
          className="w-full flex items-center justify-center py-3 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed mt-4"
        >
          <UserIcon className="w-5 h-5 mr-3" />
          Sign in Anonymously (Explore)
        </button>

        {showCaptcha && (
          <div className="flex justify-center pt-4 pb-2"> {/* Centering and padding wrapper for hCaptcha */}
            <HCaptcha
              sitekey={HCAPTCHA_SITE_KEY} 
              onVerify={onHCaptchaVerify}
              onError={onHCaptchaError}
              onExpire={onHCaptchaExpire}
              ref={captchaRef}
              theme="dark" // Optional: Or "light"
            />
          </div>
        )}

        {authError && <p className="text-red-500 text-xs text-center mt-3">{authError}</p>} {/* Display auth errors */}

        <p className="text-center text-sm text-neutral-400 mt-8">
          Don't have an account? <Link to="/signup" className="text-cyan-400 hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}; 