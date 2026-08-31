import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div>
            <p className="font-display text-lg font-semibold mb-2">Something went wrong</p>
            <p className="text-ink-muted text-sm mb-4">Try reloading the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent text-white text-sm font-medium px-4 py-2 hover:opacity-90 transition"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
