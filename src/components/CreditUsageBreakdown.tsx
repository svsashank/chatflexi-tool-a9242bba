
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { COMPUTE_CREDITS_PER_TOKEN } from '@/utils/computeCredits';

interface UsageDataItem {
  model_id: string;
  compute_credits: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

interface CreditUsageBreakdownProps {
  usageData: UsageDataItem[];
}

const CreditUsageBreakdown: React.FC<CreditUsageBreakdownProps> = ({ usageData }) => {
  const modelUsageSummary = useMemo(() => {
    // Group usage by model
    const modelGroups: Record<string, { 
      totalCredits: number; 
      totalMessages: number;
      totalInputTokens: number;
      totalOutputTokens: number;
    }> = {};
    
    usageData.forEach(item => {
      if (!item.model_id) return;
      
      if (!modelGroups[item.model_id]) {
        modelGroups[item.model_id] = {
          totalCredits: 0,
          totalMessages: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0
        };
      }
      
      modelGroups[item.model_id].totalCredits += item.compute_credits || 0;
      modelGroups[item.model_id].totalMessages += 1;
      modelGroups[item.model_id].totalInputTokens += item.input_tokens || 0;
      modelGroups[item.model_id].totalOutputTokens += item.output_tokens || 0;
    });
    
    // Convert to array and sort by credits used (descending)
    return Object.entries(modelGroups)
      .map(([modelId, data]) => ({
        modelId,
        modelName: getModelDisplayName(modelId),
        creditsPerToken: COMPUTE_CREDITS_PER_TOKEN[modelId] || 1.0,
        ...data
      }))
      .sort((a, b) => b.totalCredits - a.totalCredits);
  }, [usageData]);
  
  // Helper to get a more user-friendly model name
  const getModelDisplayName = (modelId: string): string => {
    // Remove version numbers and format nicely
    const name = modelId
      .replace(/-\d+.*$/, '') // Remove version numbers
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
    return name;
  };

  if (!usageData.length) {
    return <p>No usage data available</p>;
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Credits Used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modelUsageSummary.map((model) => (
            <TableRow key={model.modelId}>
              <TableCell className="font-medium">{model.modelName}</TableCell>
              <TableCell className="text-right">{model.totalMessages.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {(model.totalInputTokens + model.totalOutputTokens).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {Math.round(model.totalCredits).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          {/* Total Row */}
          <TableRow className="bg-muted/50">
            <TableCell className="font-medium">Total</TableCell>
            <TableCell className="text-right">
              {modelUsageSummary.reduce((acc, model) => acc + model.totalMessages, 0).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {modelUsageSummary
                .reduce((acc, model) => acc + model.totalInputTokens + model.totalOutputTokens, 0)
                .toLocaleString()}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {Math.round(
                modelUsageSummary.reduce((acc, model) => acc + model.totalCredits, 0)
              ).toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
};

export default CreditUsageBreakdown;
