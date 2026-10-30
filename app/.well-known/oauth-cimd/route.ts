import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  return NextResponse.json({
    client_id: new URL('/.well-known/oauth-cimd', origin).toString(),
    client_name: 'NeuroLift Coding Agent Platform',
    redirect_uris: [new URL('/api/providers/oauth/huggingface/callback', origin).toString()],
    token_endpoint_auth_method: 'none',
    logo_uri: new URL('/icon.png', origin).toString(),
    client_uri: origin,
  })
}
