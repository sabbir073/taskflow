import type { ReactNode, ComponentType } from "react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui";

type LucideIcon = ComponentType<{ className?: string }>;

// Consistent tinted-icon section header used by the dashboard's long-form
// pages (/tasks/create, /groups/create, and any future form that wants
// the same chrome). Promoted out of task-form.tsx in Entry #35 so both
// forms render the same scaffolding from one definition.
//
// `children` is optional and renders BELOW the description — used by
// task-form.tsx for the "natural-flow" notice under Required Actions.
// `badge` is the small uppercase pill that sits inline with the title
// (e.g. "Optional" on the AI Prompt card).
export function SectionHeader({
  icon: Icon,
  tint,
  title,
  description,
  badge,
  children,
}: {
  icon: LucideIcon;
  tint: string;
  title: string;
  description?: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <CardHeader>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[10px] font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                {badge}
              </span>
            )}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          {children}
        </div>
      </div>
    </CardHeader>
  );
}
