import { Injectable } from '@nestjs/common';

/** Named prompt/answer templates rendered with `{{var}}` substitution. */
export const PROMPT_TEMPLATES: Record<string, string> = {
  'revenue-insight':
    'Revenue (last {{hours}}h): turnover {{bets}}, wins paid {{wins}}, gross gaming revenue {{ggr}}, RTP {{rtp}}. Deposits {{deposits}}, withdrawals {{withdrawals}}, net cash flow {{cashFlow}}.',
  'tournament-insight':
    'Tournaments: {{total}} total — {{live}} live, {{registration}} in registration, {{completed}} completed, with {{participants}} participants across all events.',
  'player-insight':
    'Player {{userId}}: segment {{segment}}, churn risk {{churn}}, risk score {{risk}} ({{riskBand}}). Lifetime sessions {{sessions}}. Recommended action: {{action}}.',
  'wallet-insight':
    'Wallets: {{wallets}} accounts holding {{total}} total ({{available}} available, {{locked}} locked, {{pending}} pending).',
  'alert-summary': '{{count}} active incident(s): {{incidents}}.',
};

/**
 * Prompt manager. Holds the platform's answer/report templates and renders them
 * with grounded variables. The {@link import('./llm.service').LlmService} then
 * narrates the result.
 */
@Injectable()
export class PromptManager {
  render(templateKey: string, vars: Record<string, string | number>): string {
    const template = PROMPT_TEMPLATES[templateKey] ?? '{{body}}';
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? '—'));
  }

  list(): string[] {
    return Object.keys(PROMPT_TEMPLATES);
  }
}
