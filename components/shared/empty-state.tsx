import { Btn } from "@/components/ui";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (action.href ? (
        <a href={action.href}><Btn>{action.label}</Btn></a>
      ) : (
        <Btn onClick={action.onClick}>{action.label}</Btn>
      ))}
      {children}
    </div>
  );
}
