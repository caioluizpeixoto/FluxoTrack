
'use server';
/**
 * @fileOverview This file defines a Genkit flow for the AI Path Mapping Tool.
 *
 * - aiAttributionSuggestions - A function that suggests attribution paths for orphan conversions.
 * - AttributionSuggestionsInput - The input type for the aiAttributionSuggestions function.
 * - AttributionSuggestionsOutput - The return type for the aiAttributionSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const AttributionSuggestionsInputSchema = z.object({
  orphanConversion: z.object({
    conversionId: z.string().describe('Unique ID of the conversion lacking attribution.'),
    timestamp: z.string().datetime().describe('ISO timestamp of when the conversion occurred.'),
    value: z.number().optional().describe('Monetary value of the conversion, if available.'),
    eventType: z.string().describe('Type of conversion event (e.g., "purchase", "lead").'),
    conversionDetails: z.record(z.any()).optional().describe('Additional details about the conversion.'),
  }).describe('Details of the conversion event that needs attribution.'),
  userBehaviorEvents: z.array(z.object({
    eventId: z.string().describe('Unique ID of the behavioral event.'),
    timestamp: z.string().datetime().describe('ISO timestamp of when the event occurred.'),
    eventType: z.string().describe('Type of behavioral event (e.g., "page_view", "button_click", "checkout_start", "pix_generated").'),
    eventDetails: z.record(z.any()).optional().describe('Additional details for the event.'),
    utmSource: z.string().optional().describe('UTM source from the event.'),
    utmMedium: z.string().optional().describe('UTM medium from the event.'),
    utmCampaign: z.string().optional().describe('UTM campaign from the event.'),
    ipAddress: z.string().optional().describe('IP address associated with the event.'),
  })).describe('Chronological list of user behavioral events leading up to or around the conversion.'),
  availableCampaigns: z.array(z.object({
    campaignId: z.string().describe('Unique ID of the marketing campaign.'),
    campaignName: z.string().describe('Name of the marketing campaign.'),
    platform: z.string().describe('Advertising platform (e.g., "Meta Ads", "Google Ads").'),
    description: z.string().optional().describe('Brief description or objective of the campaign.'),
  })).describe('List of currently active or recently active marketing campaigns.'),
});
export type AttributionSuggestionsInput = z.infer<typeof AttributionSuggestionsInputSchema>;

// Output Schema
const AttributionSuggestionsOutputSchema = z.object({
  suggestedAttributions: z.array(z.object({
    campaignId: z.string().describe('The ID of the suggested marketing campaign for attribution.'),
    campaignName: z.string().describe('The name of the suggested marketing campaign.'),
    confidenceScore: z.number().min(0).max(100).describe('Confidence score (0-100) for this attribution suggestion.'),
    reasoning: z.string().describe('Detailed explanation of why this attribution is suggested, referencing specific behavioral events.'),
    attributingEventId: z.string().optional().describe('The ID of the specific user behavioral event that most strongly suggests this attribution.'),
  })).describe('A ranked list of potential attribution suggestions for the orphan conversion.'),
  analysisSummary: z.string().optional().describe('A general summary of the analysis and findings.'),
});
export type AttributionSuggestionsOutput = z.infer<typeof AttributionSuggestionsOutputSchema>;

export async function aiAttributionSuggestions(input: AttributionSuggestionsInput): Promise<AttributionSuggestionsOutput> {
  return aiAttributionSuggestionsFlow(input);
}

const attributionPrompt = ai.definePrompt({
  name: 'attributionSuggestionsPrompt',
  input: { schema: AttributionSuggestionsInputSchema },
  output: { schema: AttributionSuggestionsOutputSchema },
  prompt: `You are an expert marketing attribution specialist for AdPulse. Your task is to analyze user behavioral data and marketing campaign information to suggest attribution paths for "orphan" conversions (sales without direct source data).

STRATEGY:
1. Look for behavioral events (page_view, click) that occurred shortly before the conversion timestamp ({{{orphanConversion.timestamp}}}).
2. Check for UTMs, IP address matches, or event types that align with the objectives of available campaigns.
3. If an event like 'pix_generated' or 'checkout_start' happened right before the purchase and has UTM data, that's a very strong indicator.
4. Provide a clear reasoning in Portuguese (PT-BR) for why you are suggesting each attribution.

ORPHAN CONVERSION:
- ID: {{{orphanConversion.conversionId}}}
- Time: {{{orphanConversion.timestamp}}}
- Value: R$ {{{orphanConversion.value}}}

RECENT EVENTS (CHRONOLOGICAL):
{{#each userBehaviorEvents}}
- [{{{timestamp}}}] {{{eventType}}} | UTMs: {{{utmSource}}}/{{{utmMedium}}}/{{{utmCampaign}}} | IP: {{{ipAddress}}}
{{/each}}

AVAILABLE CAMPAIGNS:
{{#each availableCampaigns}}
- {{{campaignName}}} ({{{platform}}}) | ID: {{{campaignId}}}
{{/each}}

Provide your suggestions ranked by confidence. Ensure reasoning is in Portuguese.`
});

const aiAttributionSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiAttributionSuggestionsFlow',
    inputSchema: AttributionSuggestionsInputSchema,
    outputSchema: AttributionSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await attributionPrompt(input);
    return output!;
  }
);
