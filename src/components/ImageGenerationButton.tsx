
import React, { useState, useRef } from "react";
import { useChatStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, ImageIcon, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const ImageGenerationButton = () => {
  const { generateImage, currentConversationId, conversations, isImageGenerating, sendMessage } = useChatStore();
  const [prompt, setPrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for the image");
      return;
    }
    
    try {
      const generatedImage = await generateImage(prompt.trim(), enhancePrompt, referenceImage || undefined);
      
      // Create a message with the generated image
      const messageContent = enhancePrompt && generatedImage.revisedPrompt
        ? `Generated image from prompt: "${prompt}"\nEnhanced prompt: "${generatedImage.revisedPrompt}"`
        : `Generated image from prompt: "${prompt}"`;
        
      // Send the message with the generated image
      sendMessage(messageContent, [generatedImage.imageUrl]);
      
      // Reset the form
      setPrompt("");
      setReferenceImage(null);
      
      toast.success("Image generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate image");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error(`File ${file.name} is not an image.`);
      return;
    }

    // Check file size (limit to 4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.error(`Image ${file.name} exceeds 4MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setReferenceImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
  };

  // Check if current model supports image generation
  const modelSupportsImageGeneration = currentConversation?.messages.length ? 
    currentConversation.messages[0]?.model?.capabilities?.includes('imageGeneration') || false : 
    true; // Default to true if no messages yet

  // If we don't have the current model's info from messages, check from the selected model
  const { selectedModel } = useChatStore();
  const canGenerateImages = modelSupportsImageGeneration || selectedModel.capabilities.includes('imageGeneration');

  if (!canGenerateImages) {
    return (
      <div className="w-full max-w-md mx-auto mt-2 p-4 border border-yellow-200 bg-yellow-50 rounded-md text-center">
        <p className="text-sm text-yellow-700">
          Current model doesn't support image generation. Please select a model with image generation capability.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto mb-4">
      <form onSubmit={handleGenerateImage} className="space-y-4 p-4 border border-primary/20 rounded-md bg-background">
        <div className="flex items-center mb-2">
          <ImageIcon size={16} className="mr-2 text-primary" />
          <h3 className="text-sm font-medium">Image Generation</h3>
        </div>
        
        <div>
          <Label htmlFor="image-prompt" className="text-sm">Image Prompt</Label>
          <Input
            id="image-prompt"
            placeholder="Describe the image you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isImageGenerating}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="reference-image" className="block mb-1 text-sm">
            Reference Image (optional)
          </Label>
          <input
            type="file"
            id="reference-image"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImageGenerating || !!referenceImage}
            className="w-full"
          >
            <Upload size={16} className="mr-2" /> Upload Reference Image
          </Button>
        </div>

        {referenceImage && (
          <div className="relative w-full h-40 mt-2">
            <img
              src={referenceImage}
              alt="Reference"
              className="w-full h-full object-contain rounded-md border border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={removeReferenceImage}
              className="absolute top-2 right-2 h-8 w-8"
            >
              <X size={16} />
            </Button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="enhance-prompt"
            checked={enhancePrompt}
            onCheckedChange={setEnhancePrompt}
            disabled={isImageGenerating}
          />
          <Label htmlFor="enhance-prompt" className="cursor-pointer text-sm">
            Enhance prompt (AI will add details to improve the result)
          </Label>
        </div>

        <Button
          type="submit"
          disabled={!prompt.trim() || isImageGenerating}
          className="w-full"
        >
          {isImageGenerating ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} className="mr-2" /> Generate Image
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ImageGenerationButton;
