import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

const AMOUNT = /^\d+(\.\d{1,18})?$/;
const WALLET_TYPES = ['MAIN', 'BONUS', 'REWARD', 'LOCKED', 'TOURNAMENT', 'PROMOTIONAL', 'CASH', 'VIRTUAL'];

export class TransferDto {
  @ApiProperty()
  @IsString()
  currencyId!: string;

  @ApiProperty({ enum: WALLET_TYPES })
  @IsIn(WALLET_TYPES)
  fromType!: string;

  @ApiProperty({ enum: WALLET_TYPES })
  @IsIn(WALLET_TYPES)
  toType!: string;

  @ApiProperty({ example: '50.00' })
  @Matches(AMOUNT)
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class GrantBonusDto {
  @ApiProperty()
  @IsString()
  currencyId!: string;

  @ApiProperty({ example: '25.00' })
  @Matches(AMOUNT)
  amount!: string;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @Matches(AMOUNT)
  wageringRequirement?: string;
}

export class RewardPointsDto {
  @ApiProperty({ example: '100' })
  @Matches(AMOUNT)
  points!: string;
}

// ---- Admin DTOs ------------------------------------------------------------

export class AdminAdjustDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsString()
  currencyId!: string;

  @ApiProperty({ example: '100.00' })
  @Matches(AMOUNT)
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class WalletStatusDto {
  @ApiProperty()
  @IsString()
  walletId!: string;
}

export class RollbackDto {
  @ApiProperty()
  @IsString()
  transactionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
