import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

// Bundle the real middleware. Astro's virtual helper is an identity wrapper;
// only its framework module is shimmed, keeping the routing implementation intact.
const { outputFiles } = await build({
  entryPoints: ['src/middleware.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm',
  plugins: [{ name: 'astro-middleware', setup(builder) {
    builder.onResolve({ filter: /^astro:middleware$/ }, () => ({ path: 'middleware', namespace: 'astro-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'astro-test' }, () => ({ contents: 'export const defineMiddleware = handler => handler;' }));
  } }]
});
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const request = (path, status = 200, method = 'GET') => {
  const url = new URL(path, 'https://newleafhearing.com');
  return onRequest({ url, request: new Request(url, { method }), locals: {},
    redirect: (target, code) => new Response(null, { status: code, headers: { Location: String(target) } })
  }, async () => new Response('page', { status, headers: { 'Content-Type': 'text/html' } }));
};

test('missing URLs stay direct 404s with or without slashes and file extensions', async () => {
  for (const path of ['/missing', '/missing/', '/ads.txt', '/apple-app-site-association', '/page-sitemap.html']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await request(path, 404, method);
      assert.equal(response.status, 404, `${method} ${path}`);
      assert.equal(response.headers.get('Location'), null);
    }
  }
});
test('existing HTML pages retain slash canonicalization and query strings', async () => {
  const response = await request('/about?source=test');
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('Location'), 'https://newleafhearing.com/about/?source=test');
  assert.equal((await request('/about/')).status, 200);
});
test('legacy redirects go directly to the current page, including slashless variants', async () => {
  for (const path of ['/home', '/home/', '/HOME/']) {
    const response = await request(path + '?old=1', 404);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), 'https://newleafhearing.com/');
  }
  assert.equal((await request('/hearing-services/lace-ai-pro-auditory-training', 404)).headers.get('Location'),
    'https://newleafhearing.com/audiology-services/lace-ai-pro-auditory-training/');
  assert.equal((await request('/category/hearing', 404)).headers.get('Location'), 'https://newleafhearing.com/hearing-loss/');
});
test('private endpoints, file assets, errors and POST responses do not acquire slash redirects', async () => {
  for (const path of ['/_emdash/api', '/api/contact', '/uploads/file', '/favicon.ico']) {
    assert.equal((await request(path)).status, 200, path);
  }
  assert.equal((await request('/failed', 500)).status, 500);
  const response = await request('/contact-us', 200, 'POST');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
});
test('production host canonicalization and HTML caching remain intact', async () => {
  assert.equal((await request('http://www.newleafhearing.com/about/')).headers.get('Location'), 'https://newleafhearing.com/about/');
  assert.match((await request('/about/')).headers.get('Cache-Control'), /s-maxage=3600/);
});
