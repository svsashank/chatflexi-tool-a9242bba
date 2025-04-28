
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

const SupportCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          Need Help?
        </CardTitle>
        <CardDescription>
          For any questions or support, please email us at{' '}
          <a 
            href="mailto:support@krix.app" 
            className="text-primary hover:underline"
          >
            support@krix.app
          </a>
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default SupportCard;
