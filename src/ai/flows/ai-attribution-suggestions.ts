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
    eventDetails: z.record(z.any()).optional().describe('Additional details for the event (e.g., page_path, button_text).'),
    utmSource: z.string().optional().describe('UTM source from the event.'),
    utmMedium: z.string().optional().describe('UTM medium from the event.'),
    utmCampaign: z.string().optional().describe('UTM campaign from the event.'),
    gclid: z.string().optional().describe('Google Click ID from the event.'),
    fbclid: z.string().optional().describe('Facebook Click ID from the event.'),
    fbp: z.string().optional().describe('Facebook Browser ID from the event.'),
    fbc: z.string().optional().describe('Facebook Click ID from the event.'),
    ipAddress: z.string().optional().describe('IP address associated with the event (for geo-targeting hints).'),
  })).describe('Chronological list of user behavioral events leading up to or around the conversion.'),
  availableCampaigns: z.array(z.object({
    campaignId: z.string().describe('Unique ID of the marketing campaign.'),
    campaignName: z.string().describe('Name of the marketing campaign.'),
    platform: z.string().describe('Advertising platform (e.g., "Meta Ads", "Google Ads").'),
    description: z.string().optional().describe('Brief description or objective of the campaign.'),
    keywords: z.array(z.string()).optional().describe('Keywords associated with the campaign (for search campaigns).'),
    targeting: z.string().optional().describe('Description of the target audience or geography for the campaign.'),
  })).describe('List of currently active or recently active marketing campaigns.'),
});
export type AttributionSuggestionsInput = z.infer<typeof AttributionSuggestionsInputSchema>;

// Output Schema
const AttributionSuggestionsOutputSchema = z.object({
  suggestedAttributions: z.array(z.object({
    campaignId: z.string().describe('The ID of the suggested marketing campaign for attribution.'),
    campaignName: z.string().describe('The name of the suggested marketing campaign.'),
    confidenceScore: z.number().min(0).max(100).describe('Confidence score (0-100) for this attribution suggestion.'),
    reasoning: z.string().describe('Detailed explanation of why this attribution is suggested, referencing specific behavioral events or campaign characteristics.'),
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
  prompt: `You are an expert marketing attribution specialist. Your task is to analyze user behavioral data and available marketing campaign information to suggest potential attribution paths for a conversion that currently lacks a direct source.\n\nThe goal is to map "orphan" sales or conversions to the most likely originating marketing campaign based on the provided historical user interaction data and campaign details.\n\nHere is the orphan conversion that needs attribution:\nConversion ID: {{{orphanConversion.conversionId}}}\nTimestamp: {{{orphanConversion.timestamp}}}\nEvent Type: {{{orphanConversion.eventType}}}\nValue: {{{orphanConversion.value}}}\nDetails: {{json orphanConversion.conversionDetails}}\n\nHere is the chronological list of user behavioral events leading up to or around the conversion. These events might contain clues like UTMs, GCLIDs, FBCLIDs, or details that align with campaign objectives.\n\nUser Behavioral Events:\n{{#each userBehaviorEvents}}\n- Event ID: {{{eventId}}}\n  Timestamp: {{{timestamp}}}\n  Type: {{{eventType}}}\n  UTM Source: {{{utmSource}}}\n  UTM Medium: {{{utmMedium}}}\n  UTM Campaign: {{{utmCampaign}}}\n  GCLID: {{{gclid}}}\n  FBCLID: {{{fbclid}}}\n  FBP: {{{fbp}}}\n  FBC: {{{fbc}}}\n  IP Address: {{{ipAddress}}}\n  Details: {{json eventDetails}}\n{{/each}}\n\nHere are the active or recently active marketing campaigns. Use these to identify potential matches.\nAvailable Campaigns:\n{{#each availableCampaigns}}\n- Campaign ID: {{{campaignId}}}\n  Name: {{{campaignName}}}\n  Platform: {{{platform}}}\n  Description: {{{description}}}\n  Keywords: {{#each keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}\n  Targeting: {{{targeting}}}\n{{/each}}\n\nBased on this information, provide a ranked list of the most likely marketing campaign attributions for the orphan conversion. For each suggestion, include the campaign ID, campaign name, a confidence score (0-100), a detailed reasoning explaining your choice (linking specific user events or their attributes to campaign details), and optionally the ID of the specific user event that most strongly supports this attribution. If no strong attribution can be made, explain why.`
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
