
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { useChatStore } from '@/store';
import { Wand2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ImageGenerationButton: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { selectedModel, isImageGenerating, generateImage } = useChatStore();
  
  // Check if the model supports image generation
  const hasImageGenCapability = selectedModel.capabilities.includes('imageGeneration');
  
  // Special handling for Gemini models
  const isGeminiModel = selectedModel.provider === 'google' && selectedModel.id.includes('gemini');
  const modelWarning = isGeminiModel ? 
    "Gemini models don't directly support image generation. We'll use Google's Imagen model instead." : null;
  
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate an image');
      return;
    }
    
    setErrorDetails(null);
    
    try {
      console.log('Starting image generation with prompt:', prompt);
      console.log('Using model:', selectedModel.name, 'from provider:', selectedModel.provider);
      
      await generateImage(prompt.trim());
      toast.success('Image generation started');
      setIsDialogOpen(false);
      setPrompt('');
    } catch (error: any) {
      console.error('Image generation failed:', error);
      
      // Store error details for debugging
      setErrorDetails(error.message || 'Unknown error');
      
      toast.error(error.message || 'Failed to generate image');
    }
  };
  
  if (!hasImageGenCapability) {
    return null;
  }
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10"
          title="Generate an image"
        >
          <Wand2 size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate an Image</DialogTitle>
          <DialogDescription>
            Enter a detailed prompt to generate an image using {selectedModel.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {modelWarning && (
            <div className="mb-4 p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-md text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{modelWarning}</p>
            </div>
          )}
          
          <Input
            placeholder="Enter a detailed description of the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full"
            disabled={isImageGenerating}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Using {selectedModel.name} to generate an image. Be specific with your description for better results.
          </p>
          
          {/* Display error details if available */}
          {errorDetails && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md text-xs">
              <p className="font-semibold">Error details:</p>
              <p className="whitespace-pre-wrap">{errorDetails}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleGenerateImage}
            disabled={!prompt.trim() || isImageGenerating}
          >
            {isImageGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={16} className="mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageGenerationButton;
