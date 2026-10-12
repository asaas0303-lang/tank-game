const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'production',
  });
}

module.exports = { Sentry };
