
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Zap, Info } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useComputeCredits } from '@/hooks/useComputeCredits';

const creditPackages = [
  { credits: 1000, price: 100, popular: true },
  { credits: 5000, price: 450 },
  { credits: 10000, price: 800 }
];

const Upgrade = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { creditStatus, refreshCredits } = useComputeCredits(user?.id);

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!user) {
      toast.info("Please sign in to purchase credits");
      navigate('/auth');
    }
  }, [user, navigate]);

  const handlePurchase = async (credits: number) => {
    try {
      setIsLoading(true);

      if (!user) {
        toast.error("Authentication required. Please sign in to purchase credits");
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: { credits }
      });

      if (error) throw error;

      // Redirect to payment link
      if (data.link_url) {
        window.location.href = data.link_url;
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error("Failed to create payment link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-3">Upgrade Your Account</h1>
      
      {creditStatus && (
        <div className="mb-6 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Current Balance
              </h3>
              <p className="text-2xl font-bold mt-1">
                {Math.round(creditStatus.balance).toLocaleString()} Credits
              </p>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-muted-foreground hover:text-foreground cursor-help">
                    <Info size={16} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>Credits are used to pay for AI processing. Different models consume credits at different rates.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {creditStatus.isLow && (
            <div className="mt-2 text-sm text-amber-600">
              Your credit balance is running low. Consider purchasing more credits.
            </div>
          )}
          
          {creditStatus.isDepletedOrOverdraft && (
            <div className="mt-2 text-sm text-red-600">
              Your account has {creditStatus.balance <= 0 ? "no" : "very few"} credits remaining. Please purchase more to continue using the service.
            </div>
          )}
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-3">
        {creditPackages.map(({ credits, price, popular }) => (
          <Card key={credits} className={`relative overflow-hidden ${popular ? 'ring-2 ring-primary' : ''}`}>
            {popular && (
              <div className="absolute -right-12 top-6 rotate-45">
                <Badge variant="default" className="px-8 py-1">
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{credits.toLocaleString()} Credits</CardTitle>
              <CardDescription className="flex items-baseline gap-1">
                <span className="text-lg font-medium">${price.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  (${(price / credits * 1000).toFixed(2)} per 1000 credits)
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                No expiration date
              </p>
              <p className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Use across all models
              </p>
              <p className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Access premium features
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handlePurchase(credits)}
                disabled={isLoading}
                variant={popular ? "default" : "outline"}
              >
                {isLoading ? "Processing..." : "Purchase"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Upgrade;
