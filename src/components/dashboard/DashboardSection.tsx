import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export function DashboardSection({
  title,
  note,
  action,
  children,
  className = '',
}: {
  title: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`txd-card ${className}`}>
      <div className="txd-card-head">
        <h3 className="txd-card-title">
          {title}
          {note ? <span className="txd-card-note">{note}</span> : null}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

type BoundaryProps = { children: ReactNode; height?: number; className?: string };
type BoundaryState = { error: Error | null };

/** Keeps one failing block from taking down the whole dashboard. */
export class SectionBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Dashboard section failed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={`txd-card ${this.props.className ?? ''}`} style={{ minHeight: this.props.height ?? 160 }}>
          <div className="txd-error-box">
            <AlertTriangle size={22} />
            <div className="txd-empty-title">خطا در بارگذاری این بخش</div>
            <button
              type="button"
              className="txd-link"
              onClick={() => this.setState({ error: null })}
            >
              <RotateCcw size={13} /> تلاش مجدد
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SectionSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div className="txd-card" style={{ minHeight: height }} aria-hidden="true">
      <div className="skeleton-box txd-skeleton-block" style={{ width: '35%', height: 16 }} />
      <div className="skeleton-box txd-skeleton-block" style={{ width: '100%', height: height - 60 }} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="txd-empty">
      <div className="txd-empty-icon">{icon}</div>
      <div className="txd-empty-title">{title}</div>
      {hint ? <p className="txd-empty-hint">{hint}</p> : null}
      {children}
    </div>
  );
}
