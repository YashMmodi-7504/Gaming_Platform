import { Injectable } from '@nestjs/common';

import { WalletReportingService } from '../../wallet-engine/services/wallet-reporting.service';
import { AlertService } from '../../operations/services/alert.service';
import { TournamentService } from '../../tournament/services/tournament.service';
import { PromptManager } from './prompt-manager.service';
import { LlmService } from './llm.service';
import { RiskService } from './risk.service';

export interface AiAnswer {
  question: string;
  topic: string;
  facts: string;
  answer: string;
  provider: string;
}

/**
 * The Admin AI assistant & report generator. It routes a question to the right
 * data source, assembles **grounded facts** from the real platform services,
 * renders them through the prompt manager, and narrates them via the LLM layer.
 * Because facts come from live data, answers never fabricate numbers.
 */
@Injectable()
export class AnalyticsAiService {
  constructor(
    private readonly reporting: WalletReportingService,
    private readonly tournaments: TournamentService,
    private readonly alerts: AlertService,
    private readonly risk: RiskService,
    private readonly prompts: PromptManager,
    private readonly llm: LlmService,
  ) {}

  /** Answer a free-text admin question from grounded data. */
  async ask(question: string, userId?: string): Promise<AiAnswer> {
    const q = question.toLowerCase();
    if (/(revenue|ggr|rtp|turnover|profit)/.test(q)) return this.answer(question, 'revenue', await this.revenueFacts());
    if (/tournament/.test(q)) return this.answer(question, 'tournament', await this.tournamentFacts());
    if (/(wallet|balance|treasury)/.test(q)) return this.answer(question, 'wallet', await this.walletFacts());
    if (/(alert|incident|health|ops)/.test(q)) return this.answer(question, 'alerts', this.alertFacts());
    if (/(player|user|churn|risk|segment)/.test(q) && userId) {
      return this.answer(question, 'player', await this.playerFacts(userId));
    }
    // Default: an executive overview.
    const facts = [await this.revenueFacts(), await this.tournamentFacts(), this.alertFacts()].join('\n');
    return this.answer(question, 'overview', facts);
  }

  async revenueInsight(hours = 24) {
    return this.answer(`Explain revenue over the last ${hours}h`, 'revenue', await this.revenueFacts(hours));
  }

  async tournamentInsight() {
    return this.answer('Tournament insights', 'tournament', await this.tournamentFacts());
  }

  async walletInsight() {
    return this.answer('Wallet insights', 'wallet', await this.walletFacts());
  }

  async playerInsight(userId: string) {
    return this.answer(`Insights for player ${userId}`, 'player', await this.playerFacts(userId));
  }

  alertSummary() {
    return this.answer('Summarise active incidents', 'alerts', this.alertFacts());
  }

  /** Generate a composite report covering revenue, tournaments and incidents. */
  async generateReport() {
    const facts = [
      await this.revenueFacts(),
      await this.tournamentFacts(),
      await this.walletFacts(),
      this.alertFacts(),
    ].join('\n');
    return this.answer('Generate the daily operations report', 'report', facts);
  }

  // ---- Fact builders (grounded in real data) -------------------------------

  private async revenueFacts(hours = 24): Promise<string> {
    const r = await this.reporting.overview(hours);
    return this.prompts.render('revenue-insight', {
      hours,
      bets: r.bets,
      wins: r.wins,
      ggr: r.houseProfit,
      rtp: r.rtp,
      deposits: r.deposits,
      withdrawals: r.withdrawals,
      cashFlow: r.cashFlow,
    });
  }

  private async tournamentFacts(): Promise<string> {
    const s = await this.tournaments.statistics();
    return this.prompts.render('tournament-insight', {
      total: s.total,
      live: s.live,
      registration: s.registration,
      completed: s.completed,
      participants: s.totalParticipants,
    });
  }

  private async walletFacts(): Promise<string> {
    const s = await this.reporting.walletStatistics();
    return this.prompts.render('wallet-insight', {
      wallets: s.wallets,
      total: s.total,
      available: s.available,
      locked: s.locked,
      pending: s.pending,
    });
  }

  private async playerFacts(userId: string): Promise<string> {
    const p = await this.risk.profile(userId);
    return this.prompts.render('player-insight', {
      userId,
      segment: p.segment,
      churn: `${Math.round(p.churnProbability * 100)}%`,
      risk: p.risk.score,
      riskBand: p.risk.band,
      sessions: p.rfm.frequency,
      action: p.retentionAction,
    });
  }

  private alertFacts(): string {
    const active = this.alerts.activeIncidents();
    return this.prompts.render('alert-summary', {
      count: active.length,
      incidents: active.length ? active.map((i) => `${i.rule.name} (${i.rule.severity})`).join(', ') : 'none',
    });
  }

  private async answer(question: string, topic: string, facts: string): Promise<AiAnswer> {
    const narrated = await this.llm.narrate(facts, question);
    return { question, topic, facts, answer: narrated, provider: this.llm.providerName };
  }
}
