import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Cpu, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, fetchProfileData } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import RLSErrorAlert from '@/components/RLSErrorAlert';
import SupportCard from '@/components/SupportCard';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [purchasedCredits, setPurchasedCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedDate, setJoinedDate] = useState<string>('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isRLSError, setIsRLSError] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{code?: string, message?: string}>({});
  
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem('userId', user.id);
      console.log("User ID stored in localStorage:", user.id);
    }
  }, [user]);

  const getUserInitials = () => {
    if (!user) return '?';
    
    const name = user.user_metadata?.name || user.email || '';
    if (!name) return '?';
    
    if (name.includes('@') && !user.user_metadata?.name) {
      return name.charAt(0).toUpperCase();
    }
    
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setProfileError(null);
    setIsRLSError(false);
    setIsAuthError(false);
    setErrorDetails({});

    try {
      console.log("User authenticated, beginning profile data fetch", user.id);
      const createdAt = new Date(user.created_at);
      setJoinedDate(createdAt.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));

      // Get an active session to verify authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error("No active session found when fetching profile data");
        setProfileError("Authentication issue. Please sign in again.");
        setIsAuthError(true);
        setIsLoading(false);
        return;
      }

      console.log(`Session found. User ID: ${session.user.id}`);
      console.log(`Access token present: ${!!session.access_token}`);
      console.log(`Access token expires: ${new Date(session.expires_at! * 1000).toISOString()}`);
      
      // Get profile data using our new edge function approach
      const { data: profileData, error: profileError } = await fetchProfileData();
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        setProfileError(profileError.message);
        
        // Check for specific error messages that would indicate an RLS error
        if (profileError.message.includes('infinite recursion') || 
            profileError.message.includes('42P17')) {
          setIsRLSError(true);
          setErrorDetails({
            code: "42P17",
            message: "Infinite recursion detected in policy"
          });
          toast({
            title: "Database Permission Error",
            description: "There's an issue with the database security policies. Default values are being used.",
            variant: "destructive",
          });
        } else if (profileError.message.includes('Unauthorized') || 
                  profileError.message.includes('JWT') ||
                  profileError.message.includes('session')) {
          setIsAuthError(true);
          setErrorDetails({
            code: "401",
            message: "Authentication error"
          });
          toast({
            title: "Authentication Error",
            description: "Please sign in again to access your profile.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Profile Data Notice",
            description: "Some profile data couldn't be retrieved. Using default values.",
            variant: "default",
          });
        }
        setPurchasedCredits(10000); // Default value
      } else if (profileData && profileData.length > 0) {
        setPurchasedCredits(profileData[0].compute_points || 0);
        console.log("Purchased credits from profile:", profileData[0].compute_points);
      } else {
        console.log("No profile data returned, using default values");
        setPurchasedCredits(10000); // Default value
      }

      // User compute credits are in a separate table which should have normal RLS
      console.log("Fetching user compute credits");
      const { data: creditData, error: creditError } = await supabase
        .from('user_compute_credits')
        .select('total_credits')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (creditError) {
        console.error('Error fetching user compute credits:', creditError);
        toast({
          title: "Error",
          description: "Failed to load credits usage data",
          variant: "destructive",
        });
      } else if (creditData) {
        setTotalCredits(creditData.total_credits || 0);
        console.log("Used credits:", creditData.total_credits);
      } else {
        console.log("No credit data found, setting to 0");
        setTotalCredits(0);
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setProfileError(error.message || "Unknown error occurred");
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
      setPurchasedCredits(10000); // Default fallback
      setTotalCredits(0); // Default fallback
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user, fetchUserData]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Signed In</CardTitle>
            <CardDescription>
              Please sign in to view your profile
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const displayUsedCredits = totalCredits !== null 
    ? Math.round(totalCredits).toLocaleString() 
    : 'Loading...';

  const displayPurchasedCredits = purchasedCredits !== null
    ? purchasedCredits.toLocaleString()
    : 'Loading...';

  const usagePercentage = (totalCredits && purchasedCredits && purchasedCredits > 0)
    ? Math.min(Math.round((totalCredits / purchasedCredits) * 100), 100)
    : 0;

  const remainingCredits = (purchasedCredits !== null && totalCredits !== null)
    ? Math.max(0, purchasedCredits - totalCredits)
    : null;

  return (
    <div className="container max-w-4xl py-6 px-4 md:px-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft size={20} />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Your Profile</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
          <LogOut size={16} className="mr-2" />
          Sign Out
        </Button>
      </div>

      {isRLSError ? (
        <RLSErrorAlert 
          onRetry={fetchUserData} 
          errorCode={errorDetails.code}
          errorMessage={errorDetails.message}
        />
      ) : isAuthError ? (
        <RLSErrorAlert 
          onRetry={fetchUserData} 
          errorCode={errorDetails.code}
          errorMessage={errorDetails.message}
          isAuthError={true}
        />
      ) : profileError ? (
        <Alert variant="warning">
          <Info className="h-4 w-4" />
          <AlertTitle>Profile Data Notice</AlertTitle>
          <AlertDescription>
            There was an issue retrieving your complete profile data: {profileError}.
            Some information might be using default values.
            <Button variant="link" className="p-0 h-auto text-sm ml-2" onClick={fetchUserData}>Retry</Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-start space-x-4 pb-2">
            <Avatar className="h-16 w-16 flex-shrink-0">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl text-wrap break-words leading-tight mb-1">{user.user_metadata?.name || 'User'}</CardTitle>
              <CardDescription className="text-wrap break-words text-sm">{user.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Member since <span className="font-medium">{joinedDate}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu size={20} className="text-cyan-400" />
              <span>Compute Credits Usage</span>
            </CardTitle>
            <CardDescription>
              Track your computational resource usage across all conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Cpu size={24} className="text-cyan-400" />
                    <span className="text-3xl font-bold">{displayUsedCredits}</span>
                    <span className="text-muted-foreground text-sm">/ {displayPurchasedCredits}</span>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Credits used / available
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{usagePercentage}% used</span>
                    <span>{remainingCredits !== null 
                      ? remainingCredits.toLocaleString() 
                      : '...'} remaining</span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                </div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <h3 className="font-medium">About Compute Credits</h3>
              <p className="text-sm text-muted-foreground">
                Compute credits represent the computational resources used when interacting 
                with AI models. More complex models and longer conversations consume more credits.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-700 mb-2">Model Flexibility</h4>
                <p className="text-sm text-blue-600">
                  Different AI models have varying computational costs. 
                  More advanced models consume more credits than simpler ones.
                  You have the flexibility to choose which model to use based 
                  on your specific needs and credit availability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SupportCard />
      </div>
    </div>
  );
};

export default Profile;
