
import React, { useState, useRef } from "react";
import { useChatStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, ImageIcon, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

const ImageGenerationButton = () => {
  const { generateImage, currentConversationId, conversations, isImageGenerating, sendMessage } = useChatStore();
  const [showImageForm, setShowImageForm] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  const handleToggleForm = () => {
    setShowImageForm(!showImageForm);
    if (!showImageForm) {
      setPrompt("");
      setReferenceImage(null);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for the image");
      return;
    }
    
    try {
      const generatedImage = await generateImage(prompt.trim(), enhancePrompt);
      
      // Create a message with the generated image
      const messageContent = enhancePrompt && generatedImage.revisedPrompt
        ? `Generated image from prompt: "${prompt}"\nEnhanced prompt: "${generatedImage.revisedPrompt}"`
        : `Generated image from prompt: "${prompt}"`;
        
      // Send the message with the generated image
      sendMessage(messageContent, [generatedImage.imageUrl]);
      
      // Reset the form
      setPrompt("");
      setReferenceImage(null);
      setShowImageForm(false);
      
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
    currentConversation.messages[currentConversation.messages.length - 1].model.capabilities.includes('imageGeneration') : 
    false;

  if (!modelSupportsImageGeneration) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <Button
        onClick={handleToggleForm}
        variant="outline"
        className="w-full flex items-center gap-2"
      >
        {showImageForm ? (
          <>
            <X size={16} /> Cancel Image Generation
          </>
        ) : (
          <>
            <ImageIcon size={16} /> Generate Image
          </>
        )}
      </Button>

      {showImageForm && (
        <form onSubmit={handleGenerateImage} className="mt-4 space-y-4 p-4 border border-border rounded-md bg-muted/30">
          <div>
            <Label htmlFor="image-prompt">Image Prompt</Label>
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
            <Label htmlFor="reference-image" className="block mb-1">
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
            <Label htmlFor="enhance-prompt" className="cursor-pointer">
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
      )}
    </div>
  );
};

export default ImageGenerationButton;
