/**
 * Sentry error tracking service
 * 
 * To enable Sentry:
 * 1. Run: npm install @sentry/react-native
 * 2. Add your DSN to .env: EXPO_PUBLIC_SENTRY_DSN=your-dsn
 * 3. Initialize in App.tsx: import { initSentry } from './src/services/sentry'; initSentry();
 */

interface SentryModule {
  init: (options: SentryOptions) => void;
  setUser: (user: SentryUser | null) => void;
  addBreadcrumb: (breadcrumb: SentryBreadcrumb) => void;
  captureException: (error: Error, options?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
  Severity: {
    Fatal: string;
    Error: string;
    Warning: string;
    Info: string;
    Debug: string;
  };
}

interface SentryOptions {
  dsn: string;
  enabled: boolean;
  tracesSampleRate: number;
  sampleRate: number;
  attachStacktrace: boolean;
  normalizeDepth: number;
}

interface SentryUser {
  id: string;
  email?: string;
  username?: string;
}

interface SentryBreadcrumb {
  category: string;
  message: string;
  level: string;
  data?: Record<string, unknown>;
}

let Sentry: SentryModule | null = null;

// Try to load Sentry module
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/react-native');
} catch {
  // Sentry not installed - will use no-op implementations
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured. Set EXPO_PUBLIC_SENTRY_DSN in .env');
    return;
  }

  if (!Sentry) {
    console.warn('Sentry not installed. Run: npm install @sentry/react-native');
    return;
  }

  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    sampleRate: 0.1,
    attachStacktrace: true,
    normalizeDepth: 10,
  });
};

/**
 * Set user context for Sentry
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  name?: string;
} | null) => {
  if (!Sentry) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add custom breadcrumb for navigation or events
 */
export const addSentryBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>
) => {
  if (!Sentry) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level: Sentry.Severity.Info,
    data,
  });
};

/**
 * Capture custom error with additional context
 */
export const captureSentryError = (
  error: Error,
  context?: Record<string, unknown>
) => {
  if (!Sentry) return;
  Sentry.captureException(error, { extra: context });
};

/**
 * Capture custom message with level
 */
export const captureSentryMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
) => {
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
};