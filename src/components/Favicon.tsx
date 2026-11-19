import { useEffect, useState } from 'react';
import { Compass, Shield } from 'lucide-react';
import { getDisplayHost, isInternalUrl } from '../browser/url';

interface FaviconProps {
  url: string;
  isPrivate?: boolean;
  size?: number;
  variant?: 'inline' | 'tile';
  className?: string;
}

export function Favicon({
  url,
  isPrivate = false,
  size = 16,
  variant = 'inline',
  className = '',
}: FaviconProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const tileBoxSize = Math.max(size + 10, 24);

  const wrapInTile = (node: React.ReactNode) => {
    if (variant !== 'tile') return node;
    return (
      <span
        style={{ width: tileBoxSize, height: tileBoxSize }}
        className={`inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-[#22252D] border border-zinc-200/90 dark:border-[#2F333E] select-none ${className}`}
        aria-hidden="true"
      >
        {node}
      </span>
    );
  };

  if (!url || isInternalUrl(url)) {
    const icon = isPrivate ? (
      <Shield
        size={size}
        className="shrink-0 text-[#8B7CF6]"
        aria-hidden="true"
      />
    ) : (
      <Compass
        size={size}
        className="shrink-0 text-zinc-600 dark:text-zinc-300"
        aria-hidden="true"
      />
    );
    return variant === 'tile' ? wrapInTile(icon) : <span className={`inline-flex shrink-0 ${className}`}>{icon}</span>;
  }

  const host = getDisplayHost(url);
  const initial = (host[0] || 'W').toUpperCase();
  const src = `/api/favicon?url=${encodeURIComponent(url)}`;

  if (failed) {
    if (variant === 'tile') {
      return wrapInTile(
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 leading-none">
          {initial}
        </span>
      );
    }
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-flex shrink-0 items-center justify-center rounded-[4px] bg-zinc-200 dark:bg-[#272B35] border border-zinc-300/70 dark:border-[#353A47] text-[10px] font-semibold text-zinc-700 dark:text-zinc-200 select-none ${className}`}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  const img = (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-[3px] object-contain ${variant === 'inline' ? className : ''}`}
    />
  );

  return wrapInTile(img);
}
