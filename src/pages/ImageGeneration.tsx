
import React from 'react';
import ImageGeneration from '@/components/ImageGeneration';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ImageGenerationPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto pt-4 pb-16">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Chat
            </Link>
          </Button>
        </div>
        
        <ImageGeneration />
      </div>
    </div>
  );
};

export default ImageGenerationPage;
