import { Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import type { Logger } from 'winston';

export interface LlmProvider {
  readonly name: string;
  narrate(facts: string, question: string): Promise<string>;
}

/**
 * Deterministic, offline provider. It returns the grounded facts the caller
 * assembled from real platform data — never inventing numbers — so insights are
 * accurate and the platform works with no external dependency or API key.
 */
class LocalProvider implements LlmProvider {
  readonly name = 'local';
  async narrate(facts: string, question: string): Promise<string> {
    const header = question ? `Answer to: "${question}"\n\n` : '';
    return `${header}${facts}`.trim();
  }
}

/**
 * Claude provider. Used only when `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`
 * are set; it rephrases the grounded facts into a natural narrative via the
 * Messages API. The facts are passed as authoritative context so the model
 * summarises rather than fabricates.
 */
class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: Logger,
  ) {}

  async narrate(facts: string, question: string): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 700,
          system:
            'You are the gaming platform operations analyst. Answer ONLY from the provided facts; never invent numbers. Be concise and professional.',
          messages: [{ role: 'user', content: `Question: ${question}\n\nFacts:\n${facts}` }],
        }),
      });
      if (!response.ok) throw new Error(`Anthropic API ${response.status}`);
      const data = (await response.json()) as { content?: Array<{ text?: string }> };
      return data.content?.map((c) => c.text ?? '').join('') || facts;
    } catch (error) {
      this.logger.warn('LLM narration fell back to local', {
        context: 'AnthropicProvider',
        error: error instanceof Error ? error.message : String(error),
      });
      return facts;
    }
  }
}

/**
 * The LLM integration layer. Provider-agnostic: a deterministic local provider
 * by default; Claude when configured. All narrative AI (admin assistant, report
 * generator, insights) flows through here over grounded facts.
 */
@Injectable()
export class LlmService {
  private readonly provider: LlmProvider;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    const key = process.env.ANTHROPIC_API_KEY;
    const model = process.env.AI_MODEL ?? 'claude-sonnet-4-6';
    if (process.env.AI_PROVIDER === 'anthropic' && key) {
      this.provider = new AnthropicProvider(key, model, logger);
    } else {
      this.provider = new LocalProvider();
    }
  }

  get providerName(): string {
    return this.provider.name;
  }

  narrate(facts: string, question = ''): Promise<string> {
    return this.provider.narrate(facts, question);
  }
}
