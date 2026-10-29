import React from 'react';
import { IconLock } from './Icons';

export default function Sidebar({
  steps = [],
  currentStep = 1,
  completedSteps = [],
  onStepSelect,
}) {
  return (
    <aside className="desktop-sidebar" aria-label="Workflow Navigation Sidebar">
      <div className="sidebar-title">Analysis Workflow</div>
      <ol className="sidebar-steps-list">
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
            <li
              key={step.id}
              className={`sidebar-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
            >
              <button
                type="button"
                className="sidebar-step-button"
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
                <div className="step-badge" aria-hidden="true">
                  {isLocked ? (
                    <IconLock size={12} color="#9CA3AF" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="step-info">
                  <span className="step-title">{step.title}</span>
                  <span className="step-desc">{step.desc}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
