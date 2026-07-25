import { cn } from "@/lib/utils";

/**
 * SectionHeading — broadsheet section header: accent rule + optional eyebrow +
 * serif title. Gives the whole site a consistent editorial rhythm.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-5", className)}>
      <div className="min-w-0">
        {(eyebrow || title) && (
          <div className="flex items-center gap-2.5">
            <span className="h-6 w-1 rounded-full bg-accent shrink-0" aria-hidden />
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-0.5">
                  {eyebrow}
                </p>
              )}
              {title && (
                <Tag className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary leading-tight">
                  {title}
                </Tag>
              )}
            </div>
          </div>
        )}
        {description && (
          <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
