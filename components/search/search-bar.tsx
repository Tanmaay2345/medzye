"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchMedicines } from "@/lib/queries/medicines";
import type { MedicineWithPrice } from "@/types/database";
import { formatCurrency } from "@/utils/format-currency";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicineWithPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    searchMedicines(debouncedQuery)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setHasSearched(true);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setHasSearched(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && debouncedQuery.length >= 2;

  return (
    <div
      ref={containerRef}
      className="flex w-full flex-col gap-3 rounded-[16px] border border-brand-border bg-white p-4 shadow-[0_4px_2px_rgba(201,201,201,0.05)] transition-shadow focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4"
    >
      <div className="relative flex flex-1 items-center gap-2">
        <Search className="size-6 shrink-0 text-brand-gray-500" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-results-listbox"
          aria-autocomplete="list"
          placeholder="Search medicines and healthcare products"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full border-none bg-transparent text-lg text-brand-gray-900 outline-none placeholder:text-brand-gray-500"
        />
        {showDropdown && (
          <div
            id="search-results-listbox"
            role="listbox"
            className="absolute left-0 top-[calc(100%+16px)] z-40 max-h-96 w-full min-w-[320px] overflow-y-auto rounded-xl border border-brand-border bg-white p-2 shadow-lg"
          >
            {isLoading && (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-brand-gray-500">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Searching…
              </div>
            )}
            {!isLoading && hasSearched && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-brand-gray-500">
                No medicines found for &ldquo;{debouncedQuery}&rdquo;
              </p>
            )}
            {!isLoading &&
              results.map((medicine) => (
                <Link
                  key={medicine.id}
                  href={`/medicine/${medicine.id}`}
                  role="option"
                  aria-selected={false}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-brand-tint-icon focus-visible:bg-brand-tint-icon focus-visible:outline-none"
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-brand-border-image bg-white">
                    {medicine.image ? (
                      <Image
                        src={medicine.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    ) : null}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-brand-navy">
                      {medicine.name}
                    </span>
                    {medicine.lowest_price != null && (
                      <span className="text-xs text-brand-gray-500">
                        From {formatCurrency(medicine.lowest_price)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
          </div>
        )}
      </div>
      <Link
        href="/upload-medicine"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] border border-brand-primary bg-brand-tint-light px-4 font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
      >
        <FileUp className="size-5" aria-hidden />
        Upload Medicine
      </Link>
    </div>
  );
}
