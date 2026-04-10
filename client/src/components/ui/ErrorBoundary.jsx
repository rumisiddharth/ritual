import { Component } from "react";

/**
 * ErrorBoundary
 *
 * Wraps the entire app to catch uncaught React render errors.
 * Without this, a single component crash takes down the whole UI.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production, send to your error tracking service here
    // e.g. Sentry.captureException(error, { extra: info })
    console.error("React error boundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          fontFamily: "DM Mono, monospace",
          padding: "3rem 2rem",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}
        >
          something went wrong
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            marginBottom: "1.5rem",
          }}
        >
          an unexpected error occurred. try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "transparent",
            border: "0.5px solid var(--border-mid)",
            borderRadius: "6px",
            color: "var(--text-muted)",
            fontFamily: "DM Mono, monospace",
            fontSize: "12px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          reload
        </button>
        {process.env.NODE_ENV === "development" && (
          <pre
            style={{
              marginTop: "2rem",
              fontSize: "11px",
              color: "#993c1d",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.error?.toString()}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
