"use client";

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { defaultHistoryRange, getHistoryRange, historyRanges } from "@/lib/history-range";

export function HistoryRangeMenu({ selectedRange }: { selectedRange: string }) {
  const range = getHistoryRange(selectedRange);

  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
      {range.label} terakhir
      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} data-icon="inline-end" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuGroup>
        {historyRanges.map((option) => <DropdownMenuLinkItem
          key={option.key}
          render={<Link href={option.key === defaultHistoryRange.key ? "/" : `/?range=${option.key}`} />}
          aria-current={range.key === option.key ? "page" : undefined}
          closeOnClick
        >
          {option.label}
          {range.key === option.key && <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="ml-auto" />}
        </DropdownMenuLinkItem>)}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
