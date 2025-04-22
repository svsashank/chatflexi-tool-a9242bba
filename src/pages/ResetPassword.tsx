
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Hexagon } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validResetToken, setValidResetToken] = useState(false);

  useEffect(() => {
    console.log("ResetPassword component mounted");
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth event in ResetPassword: ${event}`);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("PASSWORD_RECOVERY event detected");
        setValidResetToken(true);
      }
      
      // When the user is signed in during the recovery process
      if (event === 'SIGNED_IN') {
        console.log("User is signed in during password recovery process");
        // We'll let the update password flow handle the navigation
      }
    });

    // Look for the recovery token in the URL
    // We're not actually extracting the token, Supabase will do that automatically
    const queryString = window.location.search;
    const hashFragment = window.location.hash;
    
    console.log("URL query string:", queryString);
    console.log("URL hash fragment:", hashFragment);
    
    if (!queryString && !hashFragment) {
      console.log("No recovery token found in URL, checking for PASSWORD_RECOVERY event");
      // We'll rely on the auth event listener to determine if valid
    }
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting to update password");
      // The Supabase client will automatically use the token from the URL
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      if (!data || !data.user) {
        throw new Error("Failed to update password");
      }

      toast.success('Password updated successfully');
      
      // Sign out the user to ensure a clean state
      await supabase.auth.signOut();
      
      // Add a short delay before navigating
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // If we don't have a valid reset token and no recovery event was detected
  if (!validResetToken) {
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
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="button"
              onClick={() => navigate('/auth')}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
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
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/auth')}
              disabled={loading}
            >
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
