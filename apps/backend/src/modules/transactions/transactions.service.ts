import { Injectable } from '@nestjs/common';

import { WalletTransactionService } from '../wallet-engine/services/wallet-transaction.service';
import type { PaginationQueryDto } from '../../common/dto/pagination.dto';

/**
 * Transaction ledger access. The ledger is append-only and written exclusively by
 * the Wallet Engine; this service exposes read-only, paginated history by
 * delegating to {@link WalletTransactionService}.
 */
@Injectable()
export class TransactionsService {
  constructor(private readonly transactions: WalletTransactionService) {}

  listForUser(userId: string, query: PaginationQueryDto) {
    return this.transactions.list(userId, { page: query.page, limit: query.limit });
  }

  findById(userId: string, id: string) {
    return this.transactions.findById(userId, id);
  }
}
