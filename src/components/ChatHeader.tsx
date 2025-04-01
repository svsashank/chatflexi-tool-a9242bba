
import { useState } from "react";
import { AIModel } from "../types";
import { AI_MODELS } from "../constants";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import useChatStore from "@/store/chatStore";
import { PlusCircle } from "lucide-react";

const ChatHeader = () => {
  const { selectedModel, selectModel, createConversation } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectModel = (model: AIModel) => {
    selectModel(model);
    setIsOpen(false);
  };

  return (
    <header className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10 p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gradient-primary">ChatFlexi</h1>
        
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger className="inline-flex items-center px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: selectedModel.avatarColor }}
            />
            {selectedModel.name}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {AI_MODELS.map((model) => (
              <DropdownMenuItem 
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className="flex flex-col items-start py-2 cursor-pointer"
              >
                <div className="flex items-center w-full">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: model.avatarColor }}
                  />
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{model.provider}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <button 
        onClick={createConversation}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
        title="New conversation"
      >
        <PlusCircle size={20} />
      </button>
    </header>
  );
};

export default ChatHeader;
