"use client";

import { ONBOARDING_STEPS, type OnboardingStepId } from "@/lib/product/onboarding-steps";

export function StepRail({
  step,
  onJump,
}: {
  step: OnboardingStepId;
  onJump?: (id: OnboardingStepId) => void;
}) {
  return (
    <ol className="mb-8 flex flex-wrap gap-2">
      {ONBOARDING_STEPS.map((s) => {
        const active = s.id === step;
        const done = s.id < step;
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!onJump || s.id > step}
              onClick={() => onJump?.(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-brand text-white"
                  : done
                    ? "border border-brand/40 bg-brand/10 text-brand"
                    : "border border-line bg-white/60 text-muted"
              } disabled:cursor-default`}
            >
              {s.id}. {s.labelHe}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
