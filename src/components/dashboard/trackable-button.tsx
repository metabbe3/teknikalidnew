"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/telemetry";

type ButtonProps = ComponentProps<typeof Button>;

interface TrackableButtonProps extends ButtonProps {
  trackingEvent: string;
  trackingMetadata?: Record<string, unknown>;
}

export function TrackableButton({
  trackingEvent,
  trackingMetadata,
  onClick,
  children,
  ...props
}: TrackableButtonProps) {
  return (
    <Button
      onClick={(e) => {
        trackEvent("feature_used", {
          feature: trackingEvent,
          ...trackingMetadata,
        });
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
