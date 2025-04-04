
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Cpu, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedDate, setJoinedDate] = useState<string>('');

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

      // Fetch user's compute credits
      const fetchUserCredits = async () => {
        try {
          // Get compute credits from the database
          const { data, error } = await supabase
            .from('user_compute_credits')
            .select('total_credits')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching user compute credits:', error);
            toast({
              title: "Error",
              description: "Failed to load credits data",
              variant: "destructive",
            });
          } else if (data) {
            setTotalCredits(data.total_credits || 0);
          } else {
            setTotalCredits(0);
          }
        } catch (error) {
          console.error('Error fetching user credits:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserCredits();
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
  const displayCredits = totalCredits !== null 
    ? Math.round(totalCredits).toLocaleString() 
    : 'Loading...';

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
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{user.user_metadata?.name || 'User'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
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
              <Cpu size={20} className="text-cyan-400" />
              <span>Compute Credits Usage</span>
            </CardTitle>
            <CardDescription>
              Track your computational resource usage across all conversations
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-lg bg-muted p-6 flex flex-col items-center justify-center">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu size={24} className="text-cyan-400" />
                <span className="text-3xl font-bold">{displayCredits}</span>
              </div>
              <p className="text-center text-muted-foreground">
                Total compute credits used
              </p>
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
                  Advanced models like GPT-4 and Claude Opus consume more credits 
                  than simpler models like GPT-3.5. You have the flexibility to choose 
                  which model to use based on your needs and credit availability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
