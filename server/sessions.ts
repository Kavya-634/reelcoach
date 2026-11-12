import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomId = () => randomBytes(32).toString('base64url');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function equalSecret(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return Boolean(a && b) && timingSafeEqual(left, right);
}
export interface Session {
  token: string;
  accountIds: string[];
  selectedId: string;
  csrf: string;
  oauthBindingHash?: string;
  expiresAt: number;
  controller: AbortController;
  calls: { start: number; count: number };
}
interface Transaction {
  bindingHash: string;
  expiresAt: number;
}
// Deliberately one process. No adapter, disk fallback, cluster, database, or replica-local sessions.
export class MemorySessions {
  private sessions = new Map<string, Session>();
  private transactions = new Map<string, Transaction>();
  private exchanges = new Map<string, number>();
  constructor(private now = Date.now) {}
  begin(binding: string): string {
    this.sweep();
    if (this.transactions.size >= 5000) throw new Error('Capacity reached');
    const state = randomId();
    this.transactions.set(digest(state), {
      bindingHash: digest(binding),
      expiresAt: this.now() + 300_000,
    });
    return state;
  }
  consume(state: string, binding: string): boolean {
    const key = digest(state);
    const tx = this.transactions.get(key);
    // Single-use state, including rejected attempts. Bound to an HttpOnly browser cookie.
    this.transactions.delete(key);
    if (!tx || tx.expiresAt <= this.now() || !equalSecret(tx.bindingHash, digest(binding)))
      return false;
    this.exchanges.set(tx.bindingHash, tx.expiresAt);
    return true;
  }
  finishExchange(binding: string): boolean {
    const key = digest(binding),
      expiry = this.exchanges.get(key);
    this.exchanges.delete(key);
    return Boolean(expiry && expiry > this.now());
  }
  cancelAuthorization(binding: string): void {
    if (!binding) return;
    const hash = digest(binding);
    this.exchanges.delete(hash);
    for (const [key, tx] of this.transactions)
      if (tx.bindingHash === hash) this.transactions.delete(key);
    for (const [key, session] of this.sessions)
      if (session.oauthBindingHash === hash) {
        this.sessions.delete(key);
        session.controller.abort();
        session.token = '';
        session.accountIds = [];
        session.csrf = '';
      }
  }
  create(token: string, accountIds: string[], seconds: number, binding?: string): string {
    this.sweep();
    if (!accountIds.length || this.sessions.size >= 5000) throw new Error('Capacity reached');
    const id = randomId();
    this.sessions.set(digest(id), {
      token,
      accountIds,
      selectedId: accountIds[0],
      csrf: randomId(),
      oauthBindingHash: binding ? digest(binding) : undefined,
      expiresAt: this.now() + seconds * 1000,
      controller: new AbortController(),
      calls: { start: this.now(), count: 0 },
    });
    return id;
  }
  get(id: string): Session | undefined {
    const session = this.sessions.get(digest(id));
    if (session && session.expiresAt <= this.now()) {
      this.remove(id);
      return;
    }
    return session;
  }
  remove(id: string): void {
    const key = digest(id);
    const session = this.sessions.get(key);
    this.sessions.delete(key);
    if (session) {
      session.controller.abort();
      session.token = '';
      session.accountIds = [];
      session.csrf = '';
    }
  }
  sweep(): void {
    for (const [key, session] of this.sessions)
      if (session.expiresAt <= this.now()) {
        this.sessions.delete(key);
        session.controller.abort();
        session.token = '';
        session.accountIds = [];
        session.csrf = '';
      }
    for (const [key, tx] of this.transactions)
      if (tx.expiresAt <= this.now()) this.transactions.delete(key);
    for (const [key, expiry] of this.exchanges)
      if (expiry <= this.now()) this.exchanges.delete(key);
  }
  close(): void {
    for (const session of this.sessions.values()) {
      session.controller.abort();
      session.token = '';
      session.accountIds = [];
      session.csrf = '';
    }
    this.sessions.clear();
    this.transactions.clear();
    this.exchanges.clear();
  }
}
