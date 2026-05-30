import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, description, icon: Icon, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-md shadow-blue-500/15">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
