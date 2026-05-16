/**
 * ChunkErrorBoundary
 *
 * Wraps the Suspense block in App.tsx so that lazy chunk fetch failures
 * (network drops, CDN hiccups, service worker cache mismatches) show a
 * recoverable UI instead of a blank white crash.
 *
 * Why a class component: React error boundaries MUST be class components
 * because they require componentDidCatch / getDerivedStateFromError
 * lifecycle methods that have no function-component equivalent.
 *
 * Error classification
 * ────────────────────
 * isChunk   — JS/CSS chunk failed to load from the CDN.
 *             Cause: new deploy changed chunk filenames; old HTML cached.
 *             Fix: hard reload fetches fresh chunk URLs.
 *
 * isNetwork — Generic fetch failure unrelated to chunk loading.
 *             Cause: device is offline, Supabase unreachable, DNS failure.
 *             Fix: wait for connection, then retry.
 *
 * isRender  — React render error (bad hook order, null dereference, etc.)
 *             Cause: code bug. Reloading may loop; navigate to /feed instead.
 *
 * Retry strategy
 * ──────────────
 * - retryCount is stored in component state (survives soft retries).
 * - Hard reload (window.location.reload) is correct ONLY for chunk errors.
 * - For render errors, hard-navigate to /feed — reloading replays the crash.
 * - After 3 retries without success, show extended help copy.
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError:   boolean;
  errorKind:  'chunk' | 'network' | 'render';
  errorMsg:   string;
  retryCount: number;
}

// ── Error classification ──────────────────────────────────────────────────────

/**
 * Chunk errors come from Vite/Rollup dynamic import failures.
 * The message MUST mention the import mechanism — not just "Failed to fetch"
 * which is shared with ordinary network request failures.
 */
const CHUNK_PATTERN =
  /dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i;

/**
 * Network errors where there is no mention of a dynamic import.
 * Supabase, fetch(), XHR all produce "Failed to fetch" or "NetworkError".
 */
const NETWORK_PATTERN = /Failed to fetch|NetworkError|network error|net::ERR/i;

function classifyError(error: Error): 'chunk' | 'network' | 'render' {
  const msg = error?.message ?? '';
  if (CHUNK_PATTERN.test(msg))  return 'chunk';
  if (NETWORK_PATTERN.test(msg)) return 'network';
  return 'render';
}

// ── Copy per error kind ───────────────────────────────────────────────────────

const KIND_CONFIG = {
  chunk: {
    icon:    '📡',
    heading: 'Connection hiccup',
    body:    "A page section didn't load — probably a network blip or a recent update. Tap Retry to reload.",
    retry:   'Retry',
  },
  network: {
    icon:    '🌐',
    heading: 'No connection',
    body:    "Kayaa can't reach the server right now. Check your connection and try again.",
    retry:   'Try again',
  },
  render: {
    icon:    '⚠️',
    heading: 'Something went wrong',
    body:    'An unexpected error occurred in the app. Go to Home to start fresh.',
    retry:   'Go to Home',
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorKind: 'render', errorMsg: '', retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError:  true,
      errorKind: classifyError(error),
      errorMsg:  error?.message ?? 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const kind = classifyError(error);

    // Structured log — easier to search in Supabase logs / Sentry later
    console.error('[ChunkErrorBoundary]', {
      kind,
      message:        error?.message,
      componentStack: info.componentStack,
      route:          window.location.pathname,
      retryCount:     this.state.retryCount,
    });
  }

  handleRetry = () => {
    const { errorKind } = this.state;

    // Render errors: reloading replays the crash — navigate away instead
    if (errorKind === 'render') {
      window.location.href = '/feed';
      return;
    }

    // Chunk / network errors: hard reload re-fetches chunks & re-checks network
    this.setState(s => ({ retryCount: s.retryCount + 1 }), () => {
      window.location.reload();
    });
  };

  handleHome = () => {
    window.location.href = '/feed';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { errorKind, retryCount } = this.state;
    const cfg = KIND_CONFIG[errorKind];
    const repeatedFailure = retryCount >= 2;

    return (
      <div style={{
        minHeight: '100dvh',
        background: '#0D1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
      }}>

        {/* Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', marginBottom: '24px', flexShrink: 0,
        }}>
          {cfg.icon}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#F0F6FC',
          margin: '0 0 10px', lineHeight: 1.2,
        }}>
          {cfg.heading}
        </h1>

        {/* Body */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.65, margin: '0 0 8px',
          maxWidth: '280px',
        }}>
          {cfg.body}
        </p>

        {/* Extra help after repeated retries */}
        {repeatedFailure && errorKind !== 'render' && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px', color: 'rgba(255,255,255,0.28)',
            lineHeight: 1.6, margin: '0 0 24px',
            maxWidth: '280px',
          }}>
            Still not loading? Try opening Kayaa in a new browser tab, or clear your browser cache.
          </p>
        )}

        <div style={{ height: repeatedFailure ? 0 : '24px' }} />

        {/* Primary action */}
        <button
          onClick={this.handleRetry}
          style={{
            width: '100%', maxWidth: '300px', minHeight: '52px',
            background: '#39D98A', color: '#0D1117',
            border: 'none', borderRadius: '14px',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px',
            cursor: 'pointer', marginBottom: '10px',
          }}
        >
          {errorKind === 'render' ? 'Go to Home' : cfg.retry}
        </button>

        {/* Secondary: go home (only shown for non-render errors) */}
        {errorKind !== 'render' && (
          <button
            onClick={this.handleHome}
            style={{
              width: '100%', maxWidth: '300px', minHeight: '48px',
              background: 'transparent', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Go to Home
          </button>
        )}

        {/* Retry count hint — shown after first retry, hidden on render errors */}
        {retryCount > 0 && errorKind !== 'render' && (
          <p style={{
            marginTop: '16px',
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: 'rgba(255,255,255,0.2)',
          }}>
            Retried {retryCount} time{retryCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Brand */}
        <div style={{
          position: 'fixed', bottom: '32px',
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '18px', color: '#39D98A',
          letterSpacing: '-0.5px',
        }}>
          kayaa
        </div>
      </div>
    );
  }
}
