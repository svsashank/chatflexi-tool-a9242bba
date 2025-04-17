
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ModelTier {
  name: string;
  examples: string;
  creditsRange: string;
  description: string;
}

const modelTiers: ModelTier[] = [
  {
    name: 'Basic Models',
    examples: 'Claude Haiku, Gemini Flash, Grok-3-mini',
    creditsRange: '0.2 - 2.7',
    description: 'Efficient for everyday tasks and simple queries',
  },
  {
    name: 'Standard Models',
    examples: 'GPT-4o, Gemini Pro, Claude Sonnet',
    creditsRange: '3.4 - 10.1',
    description: 'Better for complex reasoning and content generation',
  },
  {
    name: 'Advanced Models',
    examples: 'Claude Opus, GPT-4.5, o1-pro',
    creditsRange: '40.5 - 405.0',
    description: 'For specialized tasks requiring deep expertise',
  },
];

interface CreditUsageBreakdownProps {
  className?: string;
}

const CreditUsageBreakdown: React.FC<CreditUsageBreakdownProps> = ({ className }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">Credits Usage Breakdown</CardTitle>
        <CardDescription>Understand how your compute credits are being used</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead className="text-right">Credits per Token</TableHead>
              <TableHead className="text-right">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelTiers.map((tier) => (
              <TableRow key={tier.name}>
                <TableCell>
                  {tier.name}
                  <div className="text-xs text-muted-foreground">({tier.examples})</div>
                </TableCell>
                <TableCell className="text-right">{tier.creditsRange}</TableCell>
                <TableCell className="text-right">{tier.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CreditUsageBreakdown;
