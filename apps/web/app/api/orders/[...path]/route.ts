import type { NextRequest } from 'next/server';
import { proxyRequest } from '../../_proxy';

export const runtime = 'nodejs';

const buildPath = (parts: string[] | undefined) =>
  `/orders/${parts?.join('/') ?? ''}`.replace(/\/+$/, '');

const handler = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxyRequest(request, buildPath(context.params.path));

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
