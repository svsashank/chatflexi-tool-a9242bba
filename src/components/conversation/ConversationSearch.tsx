
import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ConversationSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ConversationSearch = ({ searchQuery, setSearchQuery }: ConversationSearchProps) => {
  return (
    <div className="p-3 border-b border-border">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
};

export default ConversationSearch;
