
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const creditPackages = [
  { credits: 1000, price: 100 },
  { credits: 5000, price: 450 },
  { credits: 10000, price: 800 }
];

const Upgrade = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handlePurchase = async (credits: number) => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to purchase credits",
          variant: "destructive",
        });
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
      toast({
        title: "Error",
        description: "Failed to create payment link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Upgrade Your Account</h1>
      <div className="grid gap-6 md:grid-cols-3">
        {creditPackages.map(({ credits, price }) => (
          <Card key={credits} className="relative overflow-hidden">
            <CardHeader>
              <CardTitle>{credits.toLocaleString()} Credits</CardTitle>
              <CardDescription>${price.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• No expiration date</p>
              <p>• Use across conversations</p>
              <p>• Access to all models</p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handlePurchase(credits)}
                disabled={isLoading}
              >
                Purchase
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Upgrade;
