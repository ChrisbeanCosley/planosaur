import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import './Toolbar.css';

// A search icon that expands into a text input.
export default function SearchToggle({ value, onChange, placeholder = 'Search' }) {
  const [open, setOpen] = useState(Boolean(value));
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="search-toggle">
      {open && (
        <input
          ref={inputRef}
          className="field search-toggle__input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => !value && setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onChange('');
              setOpen(false);
            }
          }}
        />
      )}
      <button
        type="button"
        className={`icon-button${value ? ' icon-button--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Search"
      >
        <Search size={17} strokeWidth={1.8} />
      </button>
    </div>
  );
}
