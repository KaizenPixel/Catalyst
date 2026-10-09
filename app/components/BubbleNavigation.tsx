"use client";

import { useId, useState } from 'react';
import { Menu, X, type LucideIcon } from 'lucide-react';

type Item<T extends string> = { id: T; label: string; icon: LucideIcon; disabled?: boolean; count?: number };

export function BubbleNavigation<T extends string>({ items, current, onSelect }: {
  items: Item<T>[]; current: T; onSelect: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={'bubble-navigation' + (open ? ' is-open' : '')} onKeyDown={event => {
    if (event.key === 'Escape') {
      setOpen(false);
      event.currentTarget.querySelector<HTMLButtonElement>('.bubble-toggle')?.focus();
    }
  }}>
    <button className="bubble-toggle" aria-label={open ? 'Close workspace menu' : 'Open workspace menu'} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      {open ? <X size={18}/> : <Menu size={18}/>}<span>Menu</span>
    </button>
    <nav id={id} className="bubble-menu" aria-label="Workspace navigation">
      {items.map(({ id: itemId, label, icon: Icon, disabled, count }, index) => <button
        key={itemId} className={'bubble-item' + (current === itemId ? ' is-active' : '')}
        disabled={disabled} aria-current={current === itemId ? 'page' : undefined}
        style={{ animationDelay: `${index * 55}ms` }}
        onClick={() => { onSelect(itemId); setOpen(false); }}>
        <span className="bubble-icon"><Icon size={15}/></span><span className="bubble-label">{label}</span>
        {count != null && count > 0 && <span className="bubble-count">{count}</span>}
      </button>)}
    </nav>
  </div>;
}
