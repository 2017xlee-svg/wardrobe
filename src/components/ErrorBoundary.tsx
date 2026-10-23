import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              {this.props.onReset && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                {this.props.fallbackTitle || 'Unable to display view'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected error occurred while rendering this component. You can close or reset the view to continue.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 break-all select-text">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Dismiss &amp; Recover</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
