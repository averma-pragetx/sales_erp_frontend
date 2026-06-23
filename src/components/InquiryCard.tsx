import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Inquiry } from "../types";
import { CLUSTERS } from "../data";

const PRIORITY_STYLES: Record<string, string> = {
  P1: "bg-orange-500 text-white",
  P2: "bg-amber-400 text-white",
  P3: "bg-yellow-200 text-yellow-800",
};

function formatValue(inquiry: Inquiry): string {
  const sym = inquiry.currency === "USD" ? "$ " : "₹";
  return `${sym}${inquiry.value.toFixed(2)} ${inquiry.valueUnit}`;
}

interface Props {
  inquiry: Inquiry;
  onDelete: (id: string) => void;
}

export default function InquiryCard({ inquiry, onDelete }: Props) {
  const cluster = CLUSTERS.find((c) => c.key === inquiry.cluster)!;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleConfirmDelete(e: React.MouseEvent) {
    stop(e);
    setDeleting(true);
    onDelete(inquiry.id);
  }

  if (confirming) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-0.5">
          Delete inquiry?
        </p>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          <span className="font-medium text-gray-700">{inquiry.id}</span> —{" "}
          {inquiry.client} · {inquiry.project}
          <br />
          All documents, AI data, and stage progress will be permanently
          removed.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setConfirming(false);
              setMenuOpen(false);
            }}
            className="flex-1 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="flex-1 py-1.5 text-xs font-medium rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Link
        to={`/inquiry/${encodeURIComponent(inquiry.id)}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", inquiry.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="block bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing no-underline"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 font-mono tracking-wide">
            {inquiry.id}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_STYLES[inquiry.priority]}`}
          >
            {inquiry.priority}
          </span>
        </div>

        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {inquiry.client} · {inquiry.project}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 mb-2">{inquiry.scope}</p>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-800">
            {formatValue(inquiry)}
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#fee2e2", color: "#b91c1c" }}
          >
            {inquiry.daysToBid}d to bid
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: cluster.color }}
          >
            {inquiry.currentStage}
          </span>
          <span className="text-xs text-gray-600 leading-tight">
            {inquiry.currentStageName}
          </span>
        </div>
      </Link>

      {/* Kebab menu button — appears on card hover */}
      <div ref={menuRef} className="absolute bottom-3 right-3" onClick={stop}>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setMenuOpen((v) => !v);
          }}
          className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
            menuOpen
              ? "opacity-100 bg-gray-100 text-gray-600"
              : "opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
          title="More options"
        >
          <svg width="14" height="14" viewBox="0 0 4 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute bottom-full right-0 mb-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setMenuOpen(false);
                setConfirming(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 3h12M5 3V2a1 1 0 011-1h2a1 1 0 011 1v1M6 6v5M8 6v5M2 3l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" />
              </svg>
              Delete inquiry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
