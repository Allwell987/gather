import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Sentry DSN not configured in production. Set EXPO_PUBLIC_SENTRY_DSN in .env');
    } else {
      console.warn('Sentry DSN not configured. Set EXPO_PUBLIC_SENTRY_DSN in .env');
    }
    return;
  }

  Sentry.init({
    dsn,
    // debug: __DEV__, // Set to true to see Sentry logs in development
    enabled: true,
    tracesSampleRate: 0.1,
    // sampleRate: 0.1, // Overall sample rate for errors, usually keep at 1.0 unless you have high volume
    attachStacktrace: true,
    _experiments: {
      // profilesSampleRate: 0.1,
    },
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
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
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
  Sentry.captureException(error, { extra: context });
};

/**
 * Capture custom message with level
 */
export const captureSentryMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'
) => {
  Sentry.captureMessage(message, level);
};
