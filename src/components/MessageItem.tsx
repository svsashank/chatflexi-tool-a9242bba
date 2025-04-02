
// Since MessageItem.tsx is in the read-only files list, we'll need to create a new component
// that will display the usage information at the end of AI messages

import { Card, CardContent } from "@/components/ui/card";

interface UsageDisplayProps {
  usageText?: string;
}

const UsageDisplay = ({ usageText }: UsageDisplayProps) => {
  if (!usageText) return null;
  
  return (
    <Card className="mt-3 border border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <pre className="text-xs font-mono text-primary/90 whitespace-pre-wrap">
          {usageText}
        </pre>
      </CardContent>
    </Card>
  );
};

export default UsageDisplay;
