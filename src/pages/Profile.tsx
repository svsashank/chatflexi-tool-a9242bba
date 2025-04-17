
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Cpu, ArrowLeft, LogOut, Wallet, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreditUsageBreakdown from '@/components/CreditUsageBreakdown';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [purchasedCredits, setPurchasedCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedDate, setJoinedDate] = useState<string>('');
  const [usageData, setUsageData] = useState<any[]>([]);

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return '?';
    
    const name = user.user_metadata?.name || user.email || '';
    if (!name) return '?';
    
    // If it's an email and no name is available, use first letter of email
    if (name.includes('@') && !user.user_metadata?.name) {
      return name.charAt(0).toUpperCase();
    }
    
    // Otherwise get initials from name
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

  useEffect(() => {
    if (user) {
      // Format the date when user was created
      const createdAt = new Date(user.created_at);
      setJoinedDate(createdAt.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));

      // Fetch user's compute credits and usage data
      const fetchUserData = async () => {
        try {
          setIsLoading(true);
          
          // Get used compute credits from the database
          const { data: usedCreditsData, error: usedCreditsError } = await supabase
            .from('user_compute_credits')
            .select('total_credits')
            .eq('user_id', user.id)
            .maybeSingle();
          
          // Get purchased compute credits from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('compute_points')
            .eq('id', user.id)
            .maybeSingle();
            
          // Fetch usage breakdown by model
          const { data: usageData, error: usageError } = await supabase
            .from('conversation_messages')
            .select('model_id, compute_credits, input_tokens, output_tokens')
            .eq('role', 'assistant')
            .order('created_at', { ascending: false })
            .limit(50);  // Limit to recent messages
          
          if (usedCreditsError) {
            console.error('Error fetching user compute credits:', usedCreditsError);
          } else {
            setTotalCredits(usedCreditsData?.total_credits || 0);
          }
          
          if (profileError) {
            console.error('Error fetching profile data:', profileError);
          } else {
            setPurchasedCredits(profileData?.compute_points || 0);
          }
          
          if (usageError) {
            console.error('Error fetching usage data:', usageError);
          } else if (usageData) {
            // Process usage data to group by model
            setUsageData(usageData);
          }
          
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast({
            title: "Error",
            description: "Failed to load credit data",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserData();
    }
  }, [user]);

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

  // Format the credits for display
  const displayUsedCredits = totalCredits !== null 
    ? Math.round(totalCredits).toLocaleString() 
    : 'Loading...';
    
  const displayPurchasedCredits = purchasedCredits !== null
    ? Math.round(purchasedCredits).toLocaleString()
    : 'Loading...';
    
  const remainingCredits = purchasedCredits !== null && totalCredits !== null
    ? Math.max(0, purchasedCredits - totalCredits)
    : null;
    
  const displayRemainingCredits = remainingCredits !== null
    ? Math.round(remainingCredits).toLocaleString()
    : 'Calculating...';

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Info Card */}
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

        {/* Compute Credits Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet size={20} className="text-cyan-400" />
              <span>Compute Credits</span>
            </CardTitle>
            <CardDescription>
              Track your computational resource availability and usage
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Purchased Credits */}
              <div className="rounded-lg bg-muted p-6 flex flex-col items-center justify-center">
                <div className="flex items-center space-x-2 mb-2">
                  <Wallet size={18} className="text-green-500" />
                  <span className="text-2xl font-bold">{displayPurchasedCredits}</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Total purchased credits
                </p>
              </div>
              
              {/* Used Credits */}
              <div className="rounded-lg bg-muted p-6 flex flex-col items-center justify-center">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity size={18} className="text-amber-500" />
                  <span className="text-2xl font-bold">{displayUsedCredits}</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Total credits used
                </p>
              </div>
              
              {/* Remaining Credits */}
              <div className="rounded-lg bg-muted p-6 flex flex-col items-center justify-center">
                <div className="flex items-center space-x-2 mb-2">
                  <Cpu size={18} className="text-blue-500" />
                  <span className="text-2xl font-bold">{displayRemainingCredits}</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Remaining credits
                </p>
              </div>
            </div>
            
            <Separator />
            
            {/* Credit Usage Breakdown */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Cpu size={16} className="text-cyan-400" />
                Credit Usage Breakdown
              </h3>
              
              {isLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading usage data...</p>
                </div>
              ) : usageData.length > 0 ? (
                <CreditUsageBreakdown usageData={usageData} />
              ) : (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-muted-foreground">No usage data available yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
