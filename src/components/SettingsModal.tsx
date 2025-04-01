
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore } from "@/store/settingsStore";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SettingsModal = () => {
  const { isOpen, closeSettings } = useSettingsStore();
  const { toast } = useToast();
  const [isTestingKey, setIsTestingKey] = useState<string | null>(null);

  // Function to open Supabase Functions Secrets page
  const openFunctionsSecrets = () => {
    window.open("https://supabase.com/dashboard/project/dftrmjnlbmnadggavtxs/settings/functions", "_blank");
  };

  // Test connection to verify if the API key is working
  const testConnection = async (provider: string) => {
    setIsTestingKey(provider);
    
    try {
      // Use the exact model IDs that match the provider's API requirements
      const modelId = provider === 'openai' ? 'gpt-4o-mini' : 
                      provider === 'anthropic' ? 'claude-3-haiku-20240307' :
                      provider === 'google' ? 'gemini-1.5-flash' : 'grok-1';
      
      console.log(`Testing ${provider} with model ID: ${modelId}`);
      
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          content: "Hi there, just testing the connection!",
          model: {
            provider,
            id: modelId
          },
          messages: []
        }
      });
      
      if (error) throw new Error(error.message);
      
      toast({
        title: "Connection successful!",
        description: `Successfully connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        variant: "default",
      });
    } catch (error: any) {
      // Check for specific authentication errors for xAI
      if (provider === 'xai' && error.message && error.message.includes('authentication failed')) {
        toast({
          title: "xAI Authentication Failed",
          description: "Your xAI API key appears to be invalid or doesn't have the right permissions. Please update it in the Supabase Functions settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection failed",
          description: error.message || `Failed to connect to ${provider}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsTestingKey(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys for different language models.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="api-keys" className="mt-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api-keys" className="space-y-4 mt-4">
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Server-side API Keys</AlertTitle>
              <AlertDescription>
                API keys are now securely stored on the server. Click the button below to add or update your API keys in Supabase Functions settings.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => testConnection('openai')} 
                  variant="outline"
                  disabled={isTestingKey !== null}
                >
                  {isTestingKey === 'openai' ? 'Testing...' : 'Test OpenAI'}
                </Button>
                
                <Button 
                  onClick={() => testConnection('anthropic')} 
                  variant="outline"
                  disabled={isTestingKey !== null}
                >
                  {isTestingKey === 'anthropic' ? 'Testing...' : 'Test Anthropic'}
                </Button>
                
                <Button 
                  onClick={() => testConnection('google')} 
                  variant="outline"
                  disabled={isTestingKey !== null}
                >
                  {isTestingKey === 'google' ? 'Testing...' : 'Test Google'}
                </Button>
                
                <Button 
                  onClick={() => testConnection('xai')} 
                  variant="outline"
                  disabled={isTestingKey !== null}
                >
                  {isTestingKey === 'xai' ? 'Testing...' : 'Test xAI'}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center mt-4">
              <Button onClick={openFunctionsSecrets}>
                Manage API Keys in Supabase
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
