"use client";

import { Plus } from "@phosphor-icons/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: readonly FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="border-y border-line">
      {items.map((item, index) => {
        const open = openIndex === index;

        return (
          <div key={item.question} className="border-b border-line last:border-b-0">
            <h3>
              <button
                type="button"
                id={`faq-trigger-${index}`}
                aria-expanded={open}
                aria-controls={`faq-panel-${index}`}
                onClick={() => setOpenIndex(open ? null : index)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left sm:py-6"
              >
                <span className="font-display text-[17px] leading-snug font-medium tracking-[-0.025em] text-ink transition-colors group-hover:text-forest sm:text-lg">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300",
                    open
                      ? "rotate-45 border-forest bg-forest text-bg"
                      : "border-line text-ink group-hover:border-ink/30",
                  )}
                >
                  <Plus size={14} weight="light" aria-hidden="true" />
                </span>
              </button>
            </h3>

            <div
              id={`faq-panel-${index}`}
              role="region"
              aria-labelledby={`faq-trigger-${index}`}
              aria-hidden={!open}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-xl pr-10 pb-6 text-[13px] leading-7 text-muted sm:text-sm">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
