
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Import our new components
import ProfileHeader from '@/components/profile/ProfileHeader';
import UserInfo from '@/components/profile/UserInfo';
import UserComputeCreditsDisplay from '@/components/profile/UserComputeCreditsDisplay';

const Profile = () => {
  const { user } = useAuth();
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedDate, setJoinedDate] = useState<string>('');

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

  return (
    <div className="container max-w-4xl py-6 px-4 md:px-6 space-y-8">
      <ProfileHeader />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserInfo user={user} joinedDate={joinedDate} />
        <UserComputeCreditsDisplay totalCredits={totalCredits} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Profile;
