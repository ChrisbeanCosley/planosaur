import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import './Toolbar.css';

// Multi-select filter behind the sliders icon. An empty selection means "show everything".
export default function FilterMenu({ title = 'Filter', options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div className="filter-menu" ref={ref}>
      <button
        type="button"
        className={`icon-button${selected.length ? ' icon-button--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={title}
        aria-expanded={open}
      >
        <SlidersHorizontal size={32} strokeWidth={1.4} />
      </button>
      {open && (
        <div className="popover card">
          <div className="popover__title">{title}</div>
          {options.map((option) => (
            <label key={option.value} className="popover__option">
              <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} />
              {option.color && <span className="popover__dot" style={{ background: option.color }} />}
              {option.label}
            </label>
          ))}
          {selected.length > 0 && (
            <button type="button" className="link-button popover__clear" onClick={() => onChange([])}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
