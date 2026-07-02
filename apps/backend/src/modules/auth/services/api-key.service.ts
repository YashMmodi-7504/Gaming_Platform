import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import type { ApiKeyCreated, ApiKeySummary } from '@gaming-platform/types';

import { generateApiKey, sha256 } from '../../../common/security/crypto.util';
import { PrismaService } from '../../database/prisma.service';

export interface VerifiedApiKey {
  userId: string;
  scopes: string[];
  keyId: string;
}

/**
 * Personal API keys. The plaintext key is shown exactly once on creation; only
 * its SHA-256 digest is stored. Authentication is by digest lookup.
 */
@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    input: { name: string; scopes?: string[]; expiresAt?: Date },
  ): Promise<ApiKeyCreated> {
    const { prefix, key, keyHash } = generateApiKey();
    const record = await this.prisma.apiKey.create({
      data: {
        userId,
        name: input.name,
        keyHash,
        prefix,
        scopes: input.scopes ?? [],
        status: ApiKeyStatus.ACTIVE,
        expiresAt: input.expiresAt,
      },
    });
    return { ...this.toSummary(record), key };
  }

  async list(userId: string): Promise<ApiKeySummary[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => this.toSummary(k));
  }

  async revoke(userId: string, keyId: string): Promise<{ success: true }> {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: ApiKeyStatus.REVOKED, deletedAt: new Date() },
    });
    return { success: true };
  }

  /** Authenticate a raw API key, returning its owner and scopes (or null). */
  async verify(rawKey: string): Promise<VerifiedApiKey | null> {
    const keyHash = sha256(rawKey);
    const record = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!record || record.status !== ApiKeyStatus.ACTIVE) return null;
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      await this.prisma.apiKey.update({
        where: { id: record.id },
        data: { status: ApiKeyStatus.EXPIRED },
      });
      return null;
    }
    await this.prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });
    return { userId: record.userId, scopes: record.scopes, keyId: record.id };
  }

  private toSummary(record: {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    status: ApiKeyStatus;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): ApiKeySummary {
    return {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      scopes: record.scopes,
      status: record.status,
      lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
      expiresAt: record.expiresAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
