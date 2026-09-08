"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui";
import { PRODUCT_TOUR_STEPS } from "@/lib/tour-steps";

const STORAGE_KEY = "buildos_tour_completed";
export const START_TOUR_EVENT = "buildos:start-tour";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(selector: string): Rect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// A minimal spotlight tour: no library, just a fixed-position highlight
// box (a giant box-shadow doubles as the dimmed backdrop with a
// see-through cutout) plus a tooltip card positioned next to whichever
// element the current step targets. Runs automatically once per browser
// (localStorage-gated) and is restartable via the sidebar's "Take a
// Tour" link, which dispatches START_TOUR_EVENT — kept to a plain custom
// event rather than React context since only two components need it.
export function ProductTour() {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private browsing / storage blocked — treat as "not seen" rather
      // than crash; the tour will just reappear next visit, harmlessly.
    }
    if (!alreadySeen) setStepIndex(0);

    function handleStart() {
      setStepIndex(0);
    }
    window.addEventListener(START_TOUR_EVENT, handleStart);
    return () => window.removeEventListener(START_TOUR_EVENT, handleStart);
  }, []);

  useEffect(() => {
    if (stepIndex === null) return;
    const step = PRODUCT_TOUR_STEPS[stepIndex];
    if (!step) return;

    function reposition() {
      setRect(measure(step.selector));
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [stepIndex]);

  function finish() {
    setStepIndex(null);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to do if storage is blocked — the tour just replays.
    }
  }

  if (stepIndex === null) return null;
  const step = PRODUCT_TOUR_STEPS[stepIndex];
  if (!step || !rect) return null; // target not on screen (e.g. a different page) — skip silently rather than float in the void

  const isLast = stepIndex === PRODUCT_TOUR_STEPS.length - 1;
  const tooltipTop = rect.top + rect.height + 12;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      <div
        className="absolute rounded-md transition-all duration-150"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: "0 0 0 9999px rgba(10, 10, 10, 0.55)",
        }}
      />
      <div
        className="shadow-card absolute w-80 rounded-[var(--radius-cards)] bg-paper p-4"
        style={{ top: tooltipTop, left: Math.max(16, Math.min(rect.left, window.innerWidth - 336)) }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
          <button onClick={finish} aria-label="Close tour" className="text-mid-gray hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-mid-gray">{step.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-mid-gray">
            {stepIndex + 1} of {PRODUCT_TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {stepIndex > 0 ? (
              <Button variant="outline" onClick={() => setStepIndex((i) => (i ?? 1) - 1)}>
                Back
              </Button>
            ) : null}
            <Button onClick={() => (isLast ? finish() : setStepIndex((i) => (i ?? 0) + 1))}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
