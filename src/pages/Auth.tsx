
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { Hexagon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const authAttemptedRef = React.useRef(false);
  
  const redirectedRef = React.useRef(false);
  
  useEffect(() => {
    if (user && !redirectedRef.current && !loading) {
      console.log("User is authenticated, redirecting to home page");
      redirectedRef.current = true;
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authLoading || authAttemptedRef.current) {
      console.log("Auth already in progress, ignoring duplicate request");
      return;
    }
    
    setAuthLoading(true);
    authAttemptedRef.current = true;
    
    try {
      console.log("Starting sign in attempt...");
      await signIn(email, password);
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setTimeout(() => {
        authAttemptedRef.current = false;
        setAuthLoading(false);
      }, 2000);
    }
  };

  const handleGoogleSignIn = () => {
    if (authLoading || authAttemptedRef.current) {
      console.log("Auth already in progress, ignoring duplicate request");
      return;
    }
    
    authAttemptedRef.current = true;
    setAuthLoading(true);
    
    try {
      signInWithGoogle();
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      setAuthLoading(false);
      authAttemptedRef.current = false;
    }
  };

  const handleRedirectToSignup = () => {
    window.location.href = 'https://krix.app';
  };

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setResetLoading(true);

    try {
      // Construct the full URL for the reset password page - ensure the path exactly matches the route
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      
      // Call our custom edge function instead of the built-in resetPasswordForEmail
      const response = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: resetEmail,
          redirectUrl
        }
      });
      
      if (response.error) throw new Error(response.error.message || 'Failed to send reset instructions');

      toast.success('Password reset instructions have been sent to your email');
      setIsResetMode(false);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to send reset instructions');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="relative mb-2">
            <Hexagon size={32} className="text-primary" fill="#9b87f5" stroke="#7E69AB" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-base font-bold text-white">K</div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isResetMode ? 'Reset Password' : 'Krix AI'}
          </CardTitle>
          <CardDescription>
            {isResetMode 
              ? 'Enter your email to receive reset instructions'
              : 'Login to your Krix AI account'
            }
          </CardDescription>
        </CardHeader>

        {isResetMode ? (
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={resetLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={resetLoading}
              >
                {resetLoading ? 'Sending Instructions...' : 'Send Reset Instructions'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsResetMode(false)}
                disabled={resetLoading}
              >
                Back to Login
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={authLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={authLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={authLoading}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignIn}
                disabled={authLoading}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">Don't have an account?</p>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary"
                  onClick={handleRedirectToSignup}
                  disabled={authLoading}
                >
                  Get started at krix.app
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary"
                  onClick={() => setIsResetMode(true)}
                  disabled={authLoading}
                >
                  Forgot password?
                </Button>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Auth;
