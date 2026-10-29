import React, { useEffect, useRef } from 'react';
import { IconLock } from './Icons';

export default function MobileNavigation({
  steps = [],
  currentStep = 1,
  completedSteps = [],
  onStepSelect,
}) {
  const activePillRef = useRef(null);

  // Auto scroll to active step when it changes
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentStep]);

  return (
    <nav className="mobile-nav-container" aria-label="Mobile Step Navigation">
      <div className="mobile-step-track">
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isUnlocked =
            step.id === 1 ||
            isCompleted ||
            completedSteps.includes(step.id - 1) ||
            isActive;
          const isLocked = !isUnlocked;

          return (
            <button
              key={step.id}
              ref={isActive ? activePillRef : null}
              type="button"
              className={`mobile-step-pill ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => {
                if (!isLocked && onStepSelect) {
                  onStepSelect(step.id);
                }
              }}
              disabled={isLocked}
              aria-disabled={isLocked}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${step.id}: ${step.title}. ${isCompleted ? 'Completed' : isLocked ? 'Locked' : ''}`}
            >
              <span className="mobile-step-num" aria-hidden="true">
                {isLocked ? (
                  <IconLock size={10} color="#9CA3AF" />
                ) : (
                  step.id
                )}
              </span>
              <span>{step.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
