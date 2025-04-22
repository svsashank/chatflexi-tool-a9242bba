
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { Hexagon } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const authAttemptedRef = React.useRef(false);

  // If user is already logged in and auth is not loading, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

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
      // Navigation will happen automatically through the redirect in the render function
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      authAttemptedRef.current = false;
      setAuthLoading(false);
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
      // Redirect will happen automatically once signed in
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
          <CardTitle className="text-2xl font-bold">Krix AI</CardTitle>
          <CardDescription>
            Login to your Krix AI account
          </CardDescription>
        </CardHeader>
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
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
