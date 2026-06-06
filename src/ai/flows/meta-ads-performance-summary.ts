'use server';
/**
 * @fileOverview An AI agent that analyzes Meta Ads performance data and generates a summary with key trends, anomalies, and actionable insights.
 *
 * - metaAdsPerformanceSummary - A function that handles the Meta Ads performance summary generation process.
 * - MetaAdsPerformanceSummaryInput - The input type for the metaAdsPerformanceSummary function.
 * - MetaAdsPerformanceSummaryOutput - The return type for the metaAdsPerformanceSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AdPerformanceSchema = z.object({
  id: z.string().describe('Unique identifier for the ad.'),
  name: z.string().describe('Name of the ad.'),
  spend: z.number().describe('Total money spent on this ad.'),
  impressions: z.number().describe('Number of times the ad was shown.'),
  clicks: z.number().describe('Number of clicks on the ad.'),
  ctr: z.number().describe('Click-through rate of the ad (percentage).'),
  cpc: z.number().describe('Cost per click of the ad.'),
  cpm: z.number().describe('Cost per thousand impressions of the ad.'),
  conversions: z.number().describe('Number of conversions attributed to the ad.'),
  cpa: z.number().optional().describe('Cost per acquisition (conversion) of the ad. Can be undefined if no conversions.'),
});

const AdSetPerformanceSchema = z.object({
  id: z.string().describe('Unique identifier for the ad set.'),
  name: z.string().describe('Name of the ad set.'),
  spend: z.number().describe('Total money spent on this ad set.'),
  impressions: z.number().describe('Number of times the ad set ads were shown.'),
  clicks: z.number().describe('Number of clicks on the ad set ads.'),
  ctr: z.number().describe('Click-through rate of the ad set (percentage).'),
  cpc: z.number().describe('Cost per click of the ad set.'),
  cpm: z.number().describe('Cost per thousand impressions of the ad set.'),
  conversions: z.number().describe('Number of conversions attributed to the ad set.'),
  cpa: z.number().optional().describe('Cost per acquisition (conversion) of the ad set. Can be undefined if no conversions.'),
  ads: z.array(AdPerformanceSchema).describe('List of ads within this ad set.'),
});

const CampaignPerformanceSchema = z.object({
  id: z.string().describe('Unique identifier for the campaign.'),
  name: z.string().describe('Name of the campaign.'),
  spend: z.number().describe('Total money spent on this campaign.'),
  impressions: z.number().describe('Number of times the campaign ads were shown.'),
  clicks: z.number().describe('Number of clicks on the campaign ads.'),
  ctr: z.number().describe('Click-through rate of the campaign (percentage).'),
  cpc: z.number().describe('Cost per click of the campaign.'),
  cpm: z.number().describe('Cost per thousand impressions of the campaign.'),
  conversions: z.number().describe('Number of conversions attributed to the campaign.'),
  cpa: z.number().optional().describe('Cost per acquisition (conversion) of the campaign. Can be undefined if no conversions.'),
  adSets: z.array(AdSetPerformanceSchema).describe('List of ad sets within this campaign.'),
});

export const MetaAdsPerformanceSummaryInputSchema = z.object({
  campaigns: z.array(CampaignPerformanceSchema).describe('List of Meta Ads campaigns with their performance data.'),
  dateRange: z.string().describe('The date range for which this data is provided (e.g., "Last 7 days", "October 2023").'),
});
export type MetaAdsPerformanceSummaryInput = z.infer<typeof MetaAdsPerformanceSummaryInputSchema>;

const AnomalySchema = z.object({
  type: z.enum(['declining_ctr', 'high_cpa', 'low_conversions', 'other']).describe('The type of anomaly detected.'),
  entityType: z.enum(['campaign', 'adset', 'ad']).describe('The type of entity (campaign, ad set, or ad) where the anomaly was found.'),
  entityName: z.string().describe('Name of the campaign, ad set, or ad.'),
  metric: z.string().describe('The metric affected by the anomaly.'),
  value: z.number().describe('The value of the metric at the time of anomaly.'),
  change: z.string().describe('Description of the change (e.g., "decreased by 15%", "increased by 20%").'),
  insight: z.string().describe('Potential reason or impact of this anomaly.'),
});

const InsightSchema = z.object({
  category: z.string().describe('Category of the insight (e.g., "Optimization", "Budget", "Audience").'),
  description: z.string().describe('Detailed description of the actionable insight.'),
  recommendation: z.string().describe('Specific recommendation based on the insight.'),
});

export const MetaAdsPerformanceSummaryOutputSchema = z.object({
  overallSummary: z.string().describe('A high-level summary of the Meta Ads performance for the given date range.'),
  keyTrends: z.array(z.string()).describe('List of significant trends observed in the data (e.g., "Overall spend increased by X%", "Conversions are up across the board").'),
  anomalies: z.array(AnomalySchema).describe('List of identified anomalies that require attention.'),
  actionableInsights: z.array(InsightSchema).describe('List of actionable insights and recommendations for optimization.'),
});
export type MetaAdsPerformanceSummaryOutput = z.infer<typeof MetaAdsPerformanceSummaryOutputSchema>;

export async function metaAdsPerformanceSummary(input: MetaAdsPerformanceSummaryInput): Promise<MetaAdsPerformanceSummaryOutput> {
  return metaAdsPerformanceSummaryFlow(input);
}

const metaAdsPerformanceSummaryPrompt = ai.definePrompt({
  name: 'metaAdsPerformanceSummaryPrompt',
  input: { schema: MetaAdsPerformanceSummaryInputSchema },
  output: { schema: MetaAdsPerformanceSummaryOutputSchema },
  prompt: `You are an expert Meta Ads analyst. Your task is to analyze the provided Meta Ads performance data for the {{dateRange}} and generate a comprehensive summary, highlighting key trends, anomalies, and actionable insights.

The data includes performance metrics for various campaigns, ad sets, and individual ads.

Analyze the data for:
- Overall performance summary.
- Significant positive and negative trends over time (if comparable data points are available, otherwise focus on current performance relative to benchmarks or implicit expectations).
- Anomalies such as:
    - Campaigns, ad sets, or ads with significantly declining Click-Through Rate (CTR).
    - Campaigns, ad sets, or ads with unacceptably high Cost Per Acquisition (CPA) or Cost Per Click (CPC).
    - Campaigns, ad sets, or ads with low conversion rates despite high spend or impressions.
    - Any other unusual patterns or deviations from expected performance.
- Actionable insights and specific recommendations for optimization based on your analysis.

Pay close attention to campaigns or ads that are underperforming or overperforming and provide specific reasons or areas to investigate.

Meta Ads Performance Data (JSON format):
{{{JSON campaigns}}}`,
});

const metaAdsPerformanceSummaryFlow = ai.defineFlow(
  {
    name: 'metaAdsPerformanceSummaryFlow',
    inputSchema: MetaAdsPerformanceSummaryInputSchema,
    outputSchema: MetaAdsPerformanceSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await metaAdsPerformanceSummaryPrompt(input);
    return output!;
  },
);
