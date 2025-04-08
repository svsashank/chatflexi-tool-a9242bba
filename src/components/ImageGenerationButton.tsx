
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
import { Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ImageGenerationButton: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { selectedModel, isImageGenerating, generateImage } = useChatStore();
  
  const hasImageGenCapability = selectedModel.capabilities.includes('imageGeneration');
  
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate an image');
      return;
    }
    
    try {
      console.log('Starting image generation with prompt:', prompt);
      await generateImage(prompt.trim());
      toast.success('Image generation started');
      setIsDialogOpen(false);
      setPrompt('');
    } catch (error: any) {
      console.error('Image generation failed:', error);
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
