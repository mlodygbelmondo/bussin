"use client";

import { CreditCard, Link2, Settings } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function AccountMenuExtras() {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link data-testid="menu-channels" href="/dashboard/channels">
          <Link2 className="size-4" />
          Channels
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link data-testid="menu-billing" href="/dashboard/billing">
          <CreditCard className="size-4" />
          Billing
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link data-testid="menu-settings" href="/dashboard/settings">
          <Settings className="size-4" />
          Settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
}
