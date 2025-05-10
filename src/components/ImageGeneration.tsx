import React, { useState } from "react";
import { useImageGenerationStore } from "@/store/imageGeneration";
import { IMAGE_PROVIDERS, DEFAULT_IMAGE_PROVIDER, DEFAULT_PROMPT } from "@/constants/imageGeneration";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageGenerationRequest } from "@/types";
import { Download, Copy, Trash2, Share } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/store";
import { toast } from "sonner";

const ImageGeneration = () => {
  // Get the current conversation to potentially share images
  const { currentConversationId } = useChatStore();
  
  // Get image generation state and actions
  const { 
    isGenerating, 
    generatedImages, 
    generateImage: generateImageAction,
    removeImage
  } = useImageGenerationStore();
  
  // Form state
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_IMAGE_PROVIDER);
  const [formState, setFormState] = useState<{
    prompt: string;
    model: string;
    size: string;
    quality: string;
    style: string;
  }>({
    prompt: DEFAULT_PROMPT,
    model: selectedProvider.defaultModel,
    size: selectedProvider.models[0]?.sizes?.[0] || "1024x1024",
    quality: selectedProvider.models[0]?.qualities?.[0] || "standard",
    style: selectedProvider.models[0]?.styles?.[0] || "vivid",
  });
  
  // Handle provider change
  const handleProviderChange = (providerId: string) => {
    const provider = IMAGE_PROVIDERS.find(p => p.id === providerId) || DEFAULT_IMAGE_PROVIDER;
    setSelectedProvider(provider);
    
    // Update model and other options based on the new provider
    setFormState(prev => ({
      ...prev,
      model: provider.defaultModel,
      size: provider.models[0]?.sizes?.[0] || prev.size,
      quality: provider.models[0]?.qualities?.[0] || prev.quality,
      style: provider.models[0]?.styles?.[0] || prev.style,
    }));
  };
  
  // Handle model change
  const handleModelChange = (modelId: string) => {
    const model = selectedProvider.models.find(m => m.id === modelId);
    if (model) {
      setFormState(prev => ({
        ...prev,
        model: modelId,
        size: model.sizes?.[0] || prev.size,
        quality: model.qualities?.[0] || prev.quality,
        style: model.styles?.[0] || prev.style,
      }));
    }
  };
  
  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Submit form to generate image
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: ImageGenerationRequest = {
      prompt: formState.prompt,
      provider: selectedProvider.id,
      model: formState.model,
      size: formState.size,
      quality: formState.quality,
      style: formState.style,
      numberOfImages: 1
    };
    
    await generateImageAction(request);
  };
  
  // Copy image URL to clipboard
  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Image URL copied to clipboard");
  };
  
  // Download image
  const downloadImage = (url: string, prompt: string) => {
    // Create a sanitized filename from the prompt
    const filename = `${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Share image to current conversation
  const shareToConversation = (image: any) => {
    if (!currentConversationId) {
      toast.error("No active conversation to share with");
      return;
    }
    
    // This would integrate with your chat system
    // For now, just show a toast message
    toast.success("Image shared to conversation");
  };
  
  // Get the currently selected model
  const selectedModel = selectedProvider.models.find(m => m.id === formState.model);

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">AI Image Generation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6 bg-card rounded-lg p-6 border shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select 
                value={selectedProvider.id} 
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
            </div>
            
            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={formState.model} 
                onValueChange={(value) => handleModelChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedModel?.description || "Select a model"}
              </p>
            </div>
            
            {/* Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe the image you want to generate..."
                value={formState.prompt}
                onChange={(e) => handleInputChange("prompt", e.target.value)}
                className="min-h-20 resize-y"
                maxLength={selectedProvider.maxPromptLength}
              />
              <p className="text-xs text-muted-foreground">
                {formState.prompt.length}/{selectedProvider.maxPromptLength} characters
              </p>
            </div>
            
            {/* Additional Options - only show if the model supports them */}
            {selectedModel?.sizes && selectedModel.sizes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select 
                  value={formState.size} 
                  onValueChange={(value) => handleInputChange("size", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.sizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedModel?.qualities && selectedModel.qualities.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="quality">Quality</Label>
                <Select 
                  value={formState.quality} 
                  onValueChange={(value) => handleInputChange("quality", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.qualities.map((quality) => (
                      <SelectItem key={quality} value={quality}>
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedModel?.styles && selectedModel.styles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="style">Style</Label>
                <Select 
                  value={formState.style} 
                  onValueChange={(value) => handleInputChange("style", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedModel.styles.map((style) => (
                      <SelectItem key={style} value={style}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isGenerating || !formState.prompt.trim()}
            >
              {isGenerating ? "Generating..." : "Generate Image"}
            </Button>
          </form>
          
          <div className="text-sm text-muted-foreground mt-4">
            <p>Note: Image generation costs vary by provider and model.</p>
            <p className="mt-1">For best results, provide detailed descriptions.</p>
          </div>
        </div>
        
        {/* Generated Images Section */}
        <div className="bg-card rounded-lg p-6 border shadow-sm">
          <h2 className="text-xl font-medium mb-4">Generated Images</h2>
          
          {generatedImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {isGenerating 
                ? "Generating your image..."
                : "No images generated yet. Fill out the form and click generate."}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {generatedImages.map((image) => (
                  <div key={image.id} className="border rounded-md overflow-hidden bg-background">
                    <div className="relative">
                      <img 
                        src={image.url} 
                        alt={image.prompt} 
                        className="w-full h-auto object-cover"
                      />
                      
                      {/* Image Actions */}
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          onClick={() => copyImageUrl(image.url)}
                        >
                          <Copy size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          onClick={() => downloadImage(image.url, image.prompt)}
                        >
                          <Download size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          onClick={() => shareToConversation(image)}
                        >
                          <Share size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          onClick={() => removeImage(image.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <p className="font-medium text-sm">
                        {image.provider} / {image.model}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {image.prompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGeneration;
