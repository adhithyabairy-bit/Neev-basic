import React from 'react';
import { IconEdit, IconTrash } from './Icons';

export default function LessonCard({
  lesson,
  allLessons = [],
  onEdit,
  onDelete,
}) {
  // Resolve prerequisite names
  const prereqNames = (lesson.prerequisites || []).map((id) => {
    const matched = allLessons.find((l) => l.id === id);
    return matched ? matched.name : id;
  });

  return (
    <div className={`card ${lesson.isFoundational ? 'card-highlight' : ''}`} style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span className={`badge ${lesson.isFoundational ? 'badge-orange' : 'badge-neutral'}`}>
              {lesson.grade || 'General'}
            </span>
            {lesson.isFoundational && (
              <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                Foundational Concept
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--main-text)', lineHeight: 1.3 }}>
            {lesson.name}
          </h3>

          <div style={{ marginTop: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--secondary-text)', fontWeight: 'var(--font-weight-medium)' }}>
              Prerequisites:
            </span>{' '}
            {prereqNames.length > 0 ? (
              <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                {prereqNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="badge badge-neutral"
                    style={{ fontSize: '11px', backgroundColor: 'var(--light-orange-subtle)', borderColor: 'var(--border-color)', color: 'var(--dark-orange)' }}
                  >
                    {name}
                  </span>
                ))}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                None (Base Topic)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            className="btn-icon-only"
            onClick={() => onEdit(lesson)}
            aria-label={`Edit lesson ${lesson.name}`}
            title="Edit lesson"
          >
            <IconEdit size={16} />
          </button>
          <button
            type="button"
            className="btn-icon-only danger"
            onClick={() => onDelete(lesson)}
            aria-label={`Delete lesson ${lesson.name}`}
            title="Delete lesson"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
