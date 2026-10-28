import React, { useEffect, useRef } from 'react';
import { IconCheck } from './Icons';

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

          return (
            <button
              key={step.id}
              ref={isActive ? activePillRef : null}
              type="button"
              className={`mobile-step-pill ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => onStepSelect && onStepSelect(step.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="mobile-step-num" aria-hidden="true">
                {isCompleted && !isActive ? <IconCheck size={10} color="#FFFFFF" /> : step.id}
              </span>
              <span>{step.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
