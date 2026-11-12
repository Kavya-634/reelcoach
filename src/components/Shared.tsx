import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { Performance } from '../lib/analytics';

export function Badge({ status }: { status: Performance }) {
  return (
    <span className={`performance-badge ${status.toLowerCase()}`}>
      {status === 'Hit' ? (
        <TrendingUp size={11} />
      ) : status === 'Flop' ? (
        <TrendingDown size={11} />
      ) : (
        <span className="badge-line" />
      )}
      {status}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  );
}
export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <div className="demo-note">
      <Sparkles size={14} />
      <span>
        {children ??
          'A little inspiration, not a live AI prediction. All insights use fictional demo data.'}
      </span>
    </div>
  );
}
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state !== 'idle') {
      const id = setTimeout(() => setState('idle'), 2200);
      return () => clearTimeout(id);
    }
  }, [state]);
  return (
    <button
      className="button button-small button-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState('copied');
        } catch {
          setState('failed');
        }
      }}
      aria-label={state === 'copied' ? 'Copied to clipboard' : `Copy ${label}`}
    >
      <span aria-live="polite">
        {state === 'copied' ? (
          <>
            <Check size={13} />
            Copied
          </>
        ) : state === 'failed' ? (
          'Select text to copy'
        ) : (
          <>
            <Copy size={13} />
            {label}
          </>
        )}
      </span>
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const modal = document.querySelector('[role="dialog"]');
        const items = modal?.querySelectorAll<HTMLElement>(
          'button, a, input, select, textarea, [tabindex="0"]',
        );
        if (items?.length) {
          const first = items[0],
            last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    document.querySelector<HTMLElement>('[role="dialog"] button')?.focus();
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="modal-symbol">
          <Sparkles size={26} />
        </div>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
