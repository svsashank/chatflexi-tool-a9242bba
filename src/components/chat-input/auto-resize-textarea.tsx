
import React, { useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  disabled?: boolean;
}

export const AutoResizeTextarea = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  ...props
}: AutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className="min-h-[48px] max-h-[200px] resize-none bg-transparent border-0 py-3 px-2 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
      {...props}
    />
  );
};
