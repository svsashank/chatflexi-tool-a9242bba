
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SupportCard = () => {
  const [message, setMessage] = useState('');

  const handleSendSupport = () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message before sending",
        variant: "destructive",
      });
      return;
    }

    // Open default email client with pre-filled email
    const subject = encodeURIComponent('Support Request');
    const body = encodeURIComponent(message);
    window.location.href = `mailto:support@krix.app?subject=${subject}&body=${body}`;
    
    // Clear the message after sending
    setMessage('');
    
    toast({
      title: "Email Client Opened",
      description: "Your default email client has been opened with your message",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          Contact Support
        </CardTitle>
        <CardDescription>
          Need help? Send us a message and we'll get back to you as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Describe what you need help with..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[100px]"
        />
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSendSupport}
          className="w-full"
        >
          Send Message
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SupportCard;
