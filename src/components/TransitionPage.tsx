import { type ReactNode } from 'react';

export default function TransitionPage({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <div key={tab} className="page-transition">
      {children}
    </div>
  );
}
