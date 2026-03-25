"use client";

import { useState, useEffect, useRef } from "react";
import { fetchGeocode } from "@/lib/api";
import type { GeoLocation } from "@/types/weather";

interface Props {
  onSelect: (city: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchAutocomplete({ onSelect, placeholder = "Search cities...", className = "" }: Props) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef                = useRef<HTMLDivElement>(null);

  // Debounced geocode
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const raw: GeoLocation[] = await fetchGeocode(query);
        const seen = new Set<string>();
        const results = raw.filter((loc) => {
          const key = `${loc.name}|${loc.country}|${loc.state ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSelect(loc: GeoLocation) {
    onSelect(loc.name);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0) handleSelect(suggestions[activeIdx]);
      else if (suggestions.length > 0) handleSelect(suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl select-none z-10">
        search
      </span>
      {loading && (
        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg animate-spin select-none">
          progress_activity
        </span>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-surface-container/60 border-none rounded-full py-2.5 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface-container/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl z-50">
          {suggestions.map((loc, i) => (
            <button
              key={`${loc.lat}-${loc.lon}`}
              onMouseDown={() => handleSelect(loc)}
              className={[
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                i === activeIdx ? "bg-primary/20" : "hover:bg-white/5",
                i !== 0 ? "border-t border-white/5" : "",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-primary text-base">location_on</span>
              <div>
                <span className="font-semibold text-sm text-on-surface">{loc.name}</span>
                <span className="text-xs text-on-surface-variant ml-2">
                  {[loc.state, loc.country].filter(Boolean).join(", ")}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
