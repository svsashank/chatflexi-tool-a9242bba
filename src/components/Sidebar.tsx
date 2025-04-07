
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConversationHistory from './ConversationHistory';
import ImageGeneration from './ImageGeneration';
import { MessageSquare, Image } from 'lucide-react';

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('conversations');

  return (
    <aside className="w-full md:w-80 lg:w-96 h-screen border-r border-border flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Conversations</span>
          </TabsTrigger>
          <TabsTrigger value="image-gen" className="flex items-center gap-2">
            <Image size={16} />
            <span>Image Gen</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="conversations" className="flex-1 overflow-hidden">
          <ConversationHistory />
        </TabsContent>
        <TabsContent value="image-gen" className="flex-1 p-4 overflow-y-auto">
          <ImageGeneration />
        </TabsContent>
      </Tabs>
    </aside>
  );
};

export default Sidebar;
