import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

// Shared dashboard page header. Body-only redesign in Entry #30 — API
// (title / description / actions) unchanged so all 27 consumer pages pick
// up the new look with zero callsite changes.
//
//   - Bigger headline on desktop (text-2xl → sm:text-3xl) so /tasks,
//     /inbox, /settings etc. feel confident on a laptop / 4K monitor
//     instead of looking lost in whitespace.
//   - Subtle border-bottom + bottom padding creates a visible seam
//     between the header and the page content below, replacing the
//     floaty old version.
//   - Description capped at max-w-2xl so dense subtitles don't span the
//     full viewport on ultrawide displays — easier to scan.
//   - Action slot baselines to the title row at sm+ via sm:pt-1 and
//     shrink-0, so a long title can never push the CTA off screen.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-5 border-b border-border/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 sm:pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
