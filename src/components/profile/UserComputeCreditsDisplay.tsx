
import React from 'react';
import { Cpu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface UserComputeCreditsDisplayProps {
  totalCredits: number | null;
  isLoading: boolean;
}

const UserComputeCreditsDisplay: React.FC<UserComputeCreditsDisplayProps> = ({ 
  totalCredits, 
  isLoading 
}) => {
  // Format the credits for display
  const displayCredits = totalCredits !== null 
    ? Math.round(totalCredits).toLocaleString() 
    : 'Loading...';

  return (
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
              More advanced models consume more credits than simpler ones.
              You have the flexibility to choose which model to use based 
              on your specific needs and credit availability.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserComputeCreditsDisplay;
