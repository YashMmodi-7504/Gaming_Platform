import { Module } from '@nestjs/common';

import { TournamentModule } from '../tournament/tournament.module';
import { AdminAiController } from './admin-ai.controller';
import { AiController } from './ai.controller';
import { AnalyticsAiService } from './services/analytics-ai.service';
import { FraudService } from './services/fraud.service';
import { LlmService } from './services/llm.service';
import { PromptManager } from './services/prompt-manager.service';
import { RecommendationService } from './services/recommendation.service';
import { RiskService } from './services/risk.service';
import { SearchService } from './services/search.service';

/**
 * Enterprise AI platform. A pure, deterministic core (`ai-core`) powers
 * recommendations, fraud detection, risk/responsible-gaming, segmentation and
 * natural-language search; a provider-agnostic LLM layer (Claude when configured,
 * deterministic local otherwise) narrates grounded insights for the admin AI
 * assistant. Reads catalog/session/wallet/ops data; writes nothing.
 */
@Module({
  imports: [TournamentModule],
  controllers: [AiController, AdminAiController],
  providers: [
    LlmService,
    PromptManager,
    RecommendationService,
    FraudService,
    RiskService,
    SearchService,
    AnalyticsAiService,
  ],
  exports: [RecommendationService, FraudService, RiskService, SearchService, AnalyticsAiService],
})
export class AiModule {}
