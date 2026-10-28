import React from 'react';
import { IconChevronLeft, IconChevronRight, IconCheck, IconAlertCircle } from './Icons';

export default function WorkflowNavigation({
  currentStep = 1,
  totalSteps = 9,
  onPrevious,
  onNext,
  canContinue = true,
  validationError = null,
  nextLabel = null,
  isFinalStep = false,
}) {
  const isFirstStep = currentStep === 1;
  const isLast = isFinalStep || currentStep === totalSteps;

  const defaultNextLabel = isLast ? 'Complete Analysis' : 'Save & Continue';
  const labelToUse = nextLabel || defaultNextLabel;

  return (
    <footer className="workflow-nav-bar" role="region" aria-label="Workflow Navigation Controls">
      <div className="workflow-nav-inner">
        <div className="workflow-nav-left">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onPrevious}
            disabled={isFirstStep}
            aria-label="Return to previous workflow step"
          >
            <IconChevronLeft size={18} />
            <span>Back</span>
          </button>
        </div>

        <div className="workflow-nav-right">
          {validationError && !canContinue && (
            <div className="workflow-validation-hint" role="alert">
              <IconAlertCircle size={14} />
              <span>{validationError}</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={!canContinue}
            aria-label={`${labelToUse} to next step`}
          >
            <span>{labelToUse}</span>
            {isLast ? <IconCheck size={18} /> : <IconChevronRight size={18} />}
          </button>
        </div>
      </div>
    </footer>
  );
}
