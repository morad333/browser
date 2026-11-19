import { useCallback, useRef, useState, type ReactNode } from 'react';

interface TooltipProps {
  label: string;
  sublabel?: string;
  shortcut?: string;
  side?: 'right' | 'bottom' | 'bottom-end' | 'top';
  children: ReactNode;
}

interface Coords {
  top: number;
  left: number;
  transform: string;
}

export function Tooltip({
  label,
  sublabel,
  shortcut,
  side = 'right',
  children,
}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (side === 'right') {
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
        transform: 'translateY(-50%)',
      });
    } else if (side === 'bottom-end') {
      setCoords({
        top: rect.bottom + 8,
        left: Math.min(rect.right, window.innerWidth - 12),
        transform: 'translateX(-100%)',
      });
    } else if (side === 'bottom') {
      setCoords({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      });
    } else {
      setCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
      });
    }
  }, [side]);

  const hide = useCallback(() => {
    setCoords(null);
  }, []);

  return (
    <div
      ref={triggerRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      {coords && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: coords.transform,
          }}
          className="pointer-events-none z-[100] px-2.5 py-1.5 rounded-md bg-zinc-900 dark:bg-[#23262E] text-zinc-100 border border-zinc-700/80 dark:border-[#3A3F4D] shadow-lg whitespace-nowrap"
        >
          <div className="flex items-center gap-2 text-xs font-medium leading-tight">
            <span className="max-w-[230px] truncate">{label}</span>
            {shortcut && (
              <kbd className="font-mono text-[11px] text-zinc-300">
                {shortcut}
              </kbd>
            )}
          </div>
          {sublabel && (
            <div className="text-xs text-zinc-300 mt-0.5 max-w-[260px] truncate">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
