import React from 'react';
import { IconCheck } from './Icons';

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

          return (
            <li
              key={step.id}
              className={`sidebar-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <button
                type="button"
                className="sidebar-step-button"
                onClick={() => onStepSelect && onStepSelect(step.id)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step.id}: ${step.title}. ${isCompleted ? 'Completed' : ''}`}
              >
                <div className="step-badge" aria-hidden="true">
                  {isCompleted && !isActive ? (
                    <IconCheck size={14} color="#FFFFFF" />
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
