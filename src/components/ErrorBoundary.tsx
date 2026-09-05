import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort availability guard (ISO 5055 reliability): if any render path
 * throws — e.g., a malformed localStorage session — the app shows a recovery
 * screen instead of a white screen. "Clear saved data" wipes quiz-session,
 * seen-prompts and player name so a bad record can never trap the user.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Client-side only app — console is the only trace we keep, by design.
    console.error('Render error caught by boundary:', error, info.componentStack);
  }

  private reset = () => {
    try {
      localStorage.removeItem('quiz-session');
      localStorage.removeItem('quiz-seen-prompts');
      localStorage.removeItem('quiz-player-name');
      localStorage.removeItem('quiz-currency');
    } catch {
      // storage may be unavailable — the reload still recovers the session
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>
            A saved record from an earlier version is likely incompatible with
            this build. Clearing the saved data and reloading fixes it.
          </p>
          <button type="button" onClick={this.reset}>
            Clear saved data and reload
          </button>
          <button type="button" className="error-boundary__secondary" onClick={() => window.location.reload()}>
            Just reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
