"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "cn";

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return <CheckboxPrimitive.Root
    data-slot="checkbox"
    className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded border border-input bg-background text-primary-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50", className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="size-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
}
