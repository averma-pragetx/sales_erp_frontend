import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ApiScrapedTender } from '../lib/api';

interface Props {
  tender: ApiScrapedTender;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onPushToSales: () => void;
}

const MENU_WIDTH = 176;
const MENU_HEIGHT = 116;

export default function LeadActionMenu({ tender, busy, onApprove, onReject, onPushToSales }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = rect.bottom + MENU_HEIGHT > window.innerHeight;
    setPos({
      top: openUp ? rect.top - MENU_HEIGHT : rect.bottom + 4,
      left: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScrollOrResize() { setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const isTerminal = tender.status === 'pushed' || tender.status === 'rejected';

  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="z-50 rounded-lg border border-gray-200 bg-white shadow-lg py-1"
        >
          <button
            type="button"
            disabled={isTerminal}
            onClick={() => run(onPushToSales)}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-700"
          >
            → Push to Sales
          </button>
          <button
            type="button"
            disabled={isTerminal || tender.status === 'approved'}
            onClick={() => run(onApprove)}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-700"
          >
            ✓ Approve
          </button>
          <button
            type="button"
            disabled={isTerminal}
            onClick={() => run(onReject)}
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            ✕ Reject
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
