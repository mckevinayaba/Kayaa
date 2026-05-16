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
 * Recovery strategy: hard reload via window.location.reload().
 * This is the only reliable way to re-trigger a chunk fetch — a soft
 * re-render won't re-request a module that already failed to load.
 *
 * The boundary also catches React render errors in any child, not just
 * chunk failures, which gives us full error containment at the app root.
 */

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError:  boolean;
  isChunk:   boolean;   // true when the error is a chunk/network failure
  errorMsg:  string;
}

export default class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunk: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    // Detect chunk-load failures by their error message.
    // Vite/Rollup chunk errors look like "Failed to fetch dynamically imported module"
    // or "Loading chunk … failed" (webpack), or "Importing a module script failed".
    const msg   = error?.message ?? '';
    const isChunk = /dynamically imported|Loading chunk|Failed to fetch|Importing a module/i.test(msg);
    return { hasError: true, isChunk, errorMsg: msg };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you would pipe this to Sentry / Supabase logs.
    console.error('[ChunkErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    // Hard reload: browser will re-fetch any failed chunks from the network.
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/feed';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { isChunk } = this.state;

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
          {isChunk ? '📡' : '⚠️'}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '22px', color: '#F0F6FC',
          margin: '0 0 10px', lineHeight: 1.2,
        }}>
          {isChunk ? 'Connection hiccup' : 'Something went wrong'}
        </h1>

        {/* Body */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.65, margin: '0 0 32px',
          maxWidth: '280px',
        }}>
          {isChunk
            ? "Kayaa couldn't load this section — probably a network blip. Tap Retry and it'll come back."
            : 'An unexpected error occurred. Retrying usually fixes it.'}
        </p>

        {/* Retry — primary */}
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
          Retry
        </button>

        {/* Go Home — secondary */}
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
