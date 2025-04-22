
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
  const [tokenChecked, setTokenChecked] = useState(false);

  // Use this ref to track if we've already processed the password recovery event
  const passwordRecoveryProcessedRef = React.useRef(false);

  useEffect(() => {
    console.log("ResetPassword component mounted");
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth event in ResetPassword: ${event}`);
      
      if (event === 'PASSWORD_RECOVERY' && !passwordRecoveryProcessedRef.current) {
        console.log("PASSWORD_RECOVERY event detected");
        passwordRecoveryProcessedRef.current = true;
        setValidResetToken(true);
        setTokenChecked(true);
        
        // If the user is automatically signed in by Supabase during recovery process,
        // we don't need to do anything special here - we'll handle the reset based on the token
      }
    });

    // Check URL parameters for reset token
    const checkForResetToken = async () => {
      // We check both for query params and hash fragments as Supabase uses both
      const queryString = window.location.search;
      const hashFragment = window.location.hash;
      
      console.log("URL query string:", queryString);
      console.log("URL hash fragment:", hashFragment);
      
      // If we have a hash fragment with 'access_token' or 'type=recovery', it's likely a valid reset token
      const hasResetToken = (hashFragment && 
        (hashFragment.includes('type=recovery') || hashFragment.includes('access_token'))) ||
        (queryString && queryString.includes('token='));
      
      if (hasResetToken) {
        console.log("Reset token found in URL");
        setValidResetToken(true);
      } else {
        console.log("No reset token found in URL");
        setValidResetToken(false);
      }
      
      setTokenChecked(true);
    };
    
    checkForResetToken();
    
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
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      if (!data || !data.user) {
        throw new Error("Failed to update password");
      }

      console.log("Password updated successfully");
      toast.success('Password updated successfully');
      
      // Sign out the user to ensure a clean state and make them log in with new password
      await supabase.auth.signOut();
      console.log("User signed out after password reset");
      
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

  // Show loading state while checking for token
  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
        <span>Verifying reset token...</span>
      </div>
    );
  }

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
