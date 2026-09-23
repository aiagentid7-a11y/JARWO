import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200">
            {/* Visual Header Indicator */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>

            {/* Error Message Header */}
            <div className="space-y-2">
              <h1 className="text-lg font-bold tracking-tight text-white uppercase tracking-wider">
                Terjadi Kesalahan Sistem
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi mengalami kendala yang tidak terduga saat memuat atau memproses data. Jangan khawatir, data Anda di server tetap aman.
              </p>
            </div>

            {/* Detailed Error Box */}
            {this.state.error && (
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-left">
                <span className="text-[9px] uppercase font-bold text-rose-400 block mb-1 tracking-wider font-mono">
                  Detail Teknis:
                </span>
                <p className="text-xs font-mono text-slate-300 break-words leading-normal max-h-[120px] overflow-y-auto">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* Refresh / Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Muat Ulang Halaman</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
