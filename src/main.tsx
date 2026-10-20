import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled app error caught by RootErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    // Clear potentially corrupted local state and reload cleanly
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleResetCart = () => {
    try {
      localStorage.removeItem('sri_balaji_cart');
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#2D241E] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-[#7F1D1D]/10 text-[#7F1D1D] flex items-center justify-center mx-auto mb-4 border border-[#D4AF37]/40 shadow-md">
            <span className="font-serif text-2xl font-bold">ॐ</span>
          </div>

          <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest block mb-1">
            Sri Balaji Perfumery
          </span>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D241E] mb-2">
            Storefront Resumed
          </h1>

          <p className="text-xs sm:text-sm text-[#6B5A4D] max-w-md mx-auto mb-6 leading-relaxed">
            A temporary view error occurred while rendering the page. You can restore the storefront instantly below.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-[#7F1D1D] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
            >
              Reload Store
            </button>
            <button
              onClick={this.handleResetCart}
              className="px-4 py-2.5 bg-[#EAE2D5] hover:bg-[#DDD3C5] text-[#45362B] text-xs font-semibold rounded-xl cursor-pointer transition-colors"
            >
              Reset Session & Continue
            </button>
          </div>

          {this.state.error && (
            <div className="mt-8 p-3 bg-red-50 border border-red-200 rounded-lg max-w-lg text-[11px] text-red-800 text-left font-mono overflow-auto max-h-32">
              {this.state.error.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}
