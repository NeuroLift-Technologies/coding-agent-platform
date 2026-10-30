import 'server-only'

import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db/client'
import { providerConnections } from '@/lib/db/schema'
import { decrypt, encrypt } from '@/lib/crypto'
import { getServerSession } from '@/lib/session/get-server-session'

export type InferenceProvider = 'huggingface' | 'openrouter' | 'cloudflare'

export async function getProviderCredential(provider: InferenceProvider) {
  const session = await getServerSession()
  if (!session?.user?.id) return null

  const [connection] = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.userId, session.user.id),
        eq(providerConnections.provider, provider),
        eq(providerConnections.status, 'connected'),
      ),
    )
    .limit(1)

  if (!connection) return null

  return {
    accessToken: decrypt(connection.accessToken),
    refreshToken: connection.refreshToken ? decrypt(connection.refreshToken) : null,
    expiresAt: connection.expiresAt,
    externalAccountId: connection.externalAccountId,
    displayName: connection.displayName,
    scope: connection.scope,
  }
}

export async function saveProviderConnection(input: {
  userId: string
  provider: InferenceProvider
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  scope?: string | null
  externalAccountId?: string | null
  displayName?: string | null
  metadata?: Record<string, unknown>
}) {
  const now = new Date()
  await db
    .insert(providerConnections)
    .values({
      id: nanoid(),
      userId: input.userId,
      provider: input.provider,
      accessToken: encrypt(input.accessToken),
      refreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
      expiresAt: input.expiresAt ?? null,
      scope: input.scope ?? null,
      externalAccountId: input.externalAccountId ?? null,
      displayName: input.displayName ?? null,
      metadata: input.metadata ?? null,
      status: 'connected',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [providerConnections.userId, providerConnections.provider],
      set: {
        accessToken: encrypt(input.accessToken),
        refreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
        expiresAt: input.expiresAt ?? null,
        scope: input.scope ?? null,
        externalAccountId: input.externalAccountId ?? null,
        displayName: input.displayName ?? null,
        metadata: input.metadata ?? null,
        status: 'connected',
        updatedAt: now,
      },
    })
}

export async function disconnectProvider(userId: string, provider: InferenceProvider) {
  await db
    .delete(providerConnections)
    .where(and(eq(providerConnections.userId, userId), eq(providerConnections.provider, provider)))
}
