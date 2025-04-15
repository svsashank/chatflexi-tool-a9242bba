
import React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SendButtonProps {
  isDisabled: boolean;
}

export const SendButton = ({ isDisabled }: SendButtonProps) => {
  return (
    <Button
      type="submit"
      disabled={isDisabled}
      variant={isDisabled ? "ghost" : "default"}
      size="icon"
      className={`h-9 w-9 rounded-full transition-all ${isDisabled ? 'opacity-50' : ''}`}
    >
      <Send size={18} className={isDisabled ? 'text-muted-foreground' : 'text-primary-foreground'} />
    </Button>
  );
};
