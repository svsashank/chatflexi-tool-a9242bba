
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore } from "@/store/settingsStore";

const SettingsModal = () => {
  const { isOpen, closeSettings, apiKeys, updateApiKey } = useSettingsStore();
  const [localApiKeys, setLocalApiKeys] = useState(apiKeys);

  useEffect(() => {
    setLocalApiKeys(apiKeys);
  }, [apiKeys, isOpen]);

  const handleSave = () => {
    Object.entries(localApiKeys).forEach(([provider, key]) => {
      updateApiKey(provider, key);
    });
    closeSettings();
  };

  const handleChange = (provider: string, value: string) => {
    setLocalApiKeys((prev) => ({
      ...prev,
      [provider]: value,
    }));
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input 
                  id="openai-key" 
                  type="password" 
                  placeholder="sk-..." 
                  value={localApiKeys.openai || ""} 
                  onChange={(e) => handleChange("openai", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anthropic-key">Anthropic (Claude) API Key</Label>
                <Input 
                  id="anthropic-key" 
                  type="password" 
                  placeholder="sk-ant-..." 
                  value={localApiKeys.anthropic || ""}
                  onChange={(e) => handleChange("anthropic", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gemini-key">Google (Gemini) API Key</Label>
                <Input 
                  id="gemini-key" 
                  type="password" 
                  placeholder="..." 
                  value={localApiKeys.google || ""}
                  onChange={(e) => handleChange("google", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grok-key">xAI (Grok) API Key</Label>
                <Input 
                  id="grok-key" 
                  type="password" 
                  placeholder="..." 
                  value={localApiKeys.xai || ""}
                  onChange={(e) => handleChange("xai", e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Settings</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
