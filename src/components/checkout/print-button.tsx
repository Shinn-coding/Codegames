"use client";

import { Printer } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer size={15} weight="bold" aria-hidden="true" />
      Print receipt
    </Button>
  );
}
