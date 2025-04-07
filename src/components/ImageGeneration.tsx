
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wand2, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useChatStore } from '@/store';
import { generateImage } from '@/services/imageGenerationService';
import { v4 as uuidv4 } from 'uuid';

interface ImageGenerationProps {
  onImageGenerated?: (imageUrl: string) => void;
}

const ImageGeneration: React.FC<ImageGenerationProps> = ({ onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const { selectedModel, currentConversationId, conversations, sendMessage } = useChatStore();
  
  const hasImageGenCapability = selectedModel.capabilities.includes('imageGeneration');

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate an image');
      return;
    }
    
    try {
      setIsGenerating(true);
      
      if (!hasImageGenCapability) {
        toast.error(`${selectedModel.name} doesn't support image generation. Please select a model with that capability.`);
        setIsGenerating(false);
        return;
      }
      
      console.log('Sending image generation request to:', selectedModel.provider);
      
      const result = await generateImage(prompt.trim(), selectedModel);
      
      console.log('Image generation result:', result);
      
      setGeneratedImage(result.imageUrl);
      if (result.revisedPrompt) {
        setRevisedPrompt(result.revisedPrompt);
      }
      
      toast.success('Image successfully generated');
      
      if (onImageGenerated) {
        onImageGenerated(result.imageUrl);
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToChat = () => {
    if (generatedImage && currentConversationId) {
      sendMessage(`Generated image from prompt: "${revisedPrompt || prompt}"`, [generatedImage]);
      toast.success('Image sent to chat');
      handleClearImage();
    }
  };
  
  const handleClearImage = () => {
    setGeneratedImage(null);
    setRevisedPrompt(null);
  };

  return (
    <div className="bg-background/50 backdrop-blur-sm p-4 border border-border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Generate Image</h3>
      
      {generatedImage ? (
        <div className="space-y-4">
          <div className="relative">
            <img 
              src={generatedImage} 
              alt="AI generated image" 
              className="max-w-full h-auto rounded-md"
            />
            <Button 
              variant="secondary" 
              size="icon"
              className="absolute top-2 right-2 bg-background/70 hover:bg-background/90"
              onClick={handleClearImage}
            >
              <X size={18} />
            </Button>
          </div>
          
          {revisedPrompt && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Revised prompt:</span> {revisedPrompt}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              variant="default"
              className="flex-1"
              onClick={handleSendToChat}
            >
              <ImageIcon size={16} className="mr-2" />
              Send to Chat
            </Button>
            <Button 
              variant="secondary"
              className="flex-1"
              onClick={handleClearImage}
            >
              Generate Another
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Input
            placeholder="Enter a prompt to generate an image..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full"
            disabled={isGenerating || !hasImageGenCapability}
          />
          
          <Button
            onClick={handleGenerateImage}
            disabled={!prompt.trim() || isGenerating || !hasImageGenCapability}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={16} className="mr-2" />
                Generate Image
              </>
            )}
          </Button>
          
          {!hasImageGenCapability && (
            <div className="text-xs text-muted-foreground text-center">
              The selected model doesn't support image generation. 
              Please select a model like GPT-4o or Gemini Pro to use this feature.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageGeneration;
