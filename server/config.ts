export interface Config {
  appOrigin: string;
  appId: string;
  appSecret: string;
  configId: string;
  proxySecret: string;
  webhookVerifyToken: string;
  sessionSeconds: number;
  secureCookies: boolean;
}
export const GRAPH_VERSION = 'v27.0';
export const REQUIRED_SCOPES = ['instagram_basic', 'instagram_manage_insights'] as const;
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const appOrigin = new URL(env.APP_ORIGIN || '');
  const local = appOrigin.hostname === 'localhost' || appOrigin.hostname === '127.0.0.1';
  if (appOrigin.protocol !== 'https:' && !(local && env.NODE_ENV !== 'production'))
    throw new Error('Invalid server configuration');
  if (
    appOrigin.pathname !== '/' ||
    appOrigin.search ||
    appOrigin.hash ||
    appOrigin.username ||
    appOrigin.password
  )
    throw new Error('Invalid server configuration');
  const appId = env.META_APP_ID || '';
  const configId = env.META_CONFIG_ID || '';
  if (
    !/^\d+$/.test(appId) ||
    !/^\d+$/.test(configId) ||
    !env.META_APP_SECRET ||
    (env.AUTH_BACKEND_PROXY_SECRET?.length ?? 0) < 32 ||
    (env.META_WEBHOOK_VERIFY_TOKEN?.length ?? 0) < 32
  )
    throw new Error('Incomplete server configuration');
  const seconds = Number(env.SESSION_TTL_SECONDS || '2700');
  if (!Number.isInteger(seconds) || seconds < 300 || seconds > 3600)
    throw new Error('Invalid session duration');
  return {
    appOrigin: appOrigin.origin,
    appId,
    configId,
    appSecret: env.META_APP_SECRET,
    proxySecret: env.AUTH_BACKEND_PROXY_SECRET!,
    webhookVerifyToken: env.META_WEBHOOK_VERIFY_TOKEN!,
    sessionSeconds: seconds,
    secureCookies: appOrigin.protocol === 'https:',
  };
}
