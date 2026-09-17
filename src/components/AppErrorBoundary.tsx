import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('WorkSphere runtime error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-red-300">WorkSphere encountered an error</h1>
          <p className="mt-2 text-sm text-slate-300">
            The application stopped rendering instead of showing a blank screen. This error is captured so it can be fixed safely.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-red-200 whitespace-pre-wrap">
            {this.state.error.message || String(this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
          >
            Reload WorkSphere
          </button>
        </div>
      </div>
    );
  }
}
