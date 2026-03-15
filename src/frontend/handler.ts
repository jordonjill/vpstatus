import { getIndexHtml } from './pages/index.html.ts';
import { getLoginHtml } from './pages/login.html.ts';
import { getAdminHtml } from './pages/admin.html.ts';
import { getStyleCss } from './assets/style';
import { getMainJs } from './js/main';
import { getLoginJs } from './js/login';
import { getAdminJs } from './js/admin';
import { getFaviconSvg } from './assets/favicon';

type RouteHandler = () => Response;

export function handleFrontendRequest(request: Request, path: string): Response {
  const routes: Record<string, RouteHandler> = {
    '/': () => new Response(getIndexHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    '': () => new Response(getIndexHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    '/login': () => new Response(getLoginHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    '/login.html': () => new Response(getLoginHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    '/admin': () => new Response(getAdminHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    '/admin.html': () => new Response(getAdminHtml(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    '/css/style.css': () => new Response(getStyleCss(), { headers: { 'Content-Type': 'text/css; charset=utf-8' } }),
    '/js/main.js': () => new Response(getMainJs(), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }),
    '/js/login.js': () => new Response(getLoginJs(), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }),
    '/js/admin.js': () => new Response(getAdminJs(), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }),
    '/favicon.svg': () => new Response(getFaviconSvg(), { headers: { 'Content-Type': 'image/svg+xml' } }),
  };

  const handler = routes[path];
  if (handler) {
    return handler();
  }

  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' },
  });
}
