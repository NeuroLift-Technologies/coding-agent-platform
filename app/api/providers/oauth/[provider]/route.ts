import { randomBytes, createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/session/get-server-session'

export const runtime = 'nodejs'

type Provider = 'huggingface' | 'openrouter'

function base64url(value: Buffer) {
  return value.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/?error=sign_in_required', request.url))
  }

  const { provider } = await params
  if (provider !== 'huggingface' && provider !== 'openrouter') {
    return NextResponse.json({ error: 'Unsupported OAuth provider' }, { status: 404 })
  }

  const state = base64url(randomBytes(32))
  const verifier = base64url(randomBytes(48))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const callbackUrl = new URL(`/api/providers/oauth/${provider}/callback`, request.nextUrl.origin)
  const cookieStore = await cookies()

  cookieStore.set(`provider_oauth_${provider}`, JSON.stringify({
    state,
    verifier,
    userId: session.user.id,
  }), {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  let authorizationUrl: URL
  if (provider === 'huggingface') {
    authorizationUrl = new URL('https://huggingface.co/oauth/authorize')
    authorizationUrl.searchParams.set('client_id', new URL('/.well-known/oauth-cimd', request.nextUrl.origin).toString())
    authorizationUrl.searchParams.set('redirect_uri', callbackUrl.toString())
    authorizationUrl.searchParams.set('response_type', 'code')
    authorizationUrl.searchParams.set('scope', 'openid profile inference-api')
    authorizationUrl.searchParams.set('state', state)
    authorizationUrl.searchParams.set('code_challenge', challenge)
    authorizationUrl.searchParams.set('code_challenge_method', 'S256')
  } else {
    authorizationUrl = new URL('https://openrouter.ai/auth')
    authorizationUrl.searchParams.set('callback_url', callbackUrl.toString())
    authorizationUrl.searchParams.set('state', state)
    authorizationUrl.searchParams.set('code_challenge', challenge)
    authorizationUrl.searchParams.set('code_challenge_method', 'S256')
    authorizationUrl.searchParams.set('key_label', 'NeuroLift Coding Agent Platform')
  }

  return NextResponse.redirect(authorizationUrl)
}

export type { Provider }
