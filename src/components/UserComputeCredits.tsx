
import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

const UserComputeCredits = () => {
  const [totalCredits, setTotalCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserCredits = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Use a raw query since the types don't recognize our new table yet
          const { data, error } = await supabase
            .from('user_compute_credits')
            .select('total_credits')
            .eq('user_id', session.user.id)
            .single();
          
          if (error && error.code !== 'PGRST116') { // Not found is OK for new users
            console.error('Error fetching user compute credits:', error);
            toast({
              title: "Error",
              description: "Failed to load credits data",
              variant: "destructive",
            });
          } else {
            setTotalCredits(data?.total_credits || 0);
            console.log("Fetched total credits:", data?.total_credits || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching user credits:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCredits();

    // Set up a subscription to listen for credit updates
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserCredits();
    });

    // Also set up a subscription to listen for changes on the user_compute_credits table
    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_compute_credits'
        },
        (payload) => {
          console.log('Credits updated:', payload);
          fetchUserCredits();
        }
      )
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Zap size={14} className="text-amber-500" />
      <span>Loading...</span>
    </div>;
  }

  if (totalCredits === null) {
    return null;
  }

  // Round total credits to nearest integer
  const roundedCredits = Math.round(totalCredits);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Zap size={14} className="text-amber-500" />
            <span>Total: {roundedCredits.toLocaleString()} CR</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              {roundedCredits.toLocaleString()} Total Compute Credits Used
            </p>
            <p className="text-xs">
              This represents your total compute usage across all conversations.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UserComputeCredits;
