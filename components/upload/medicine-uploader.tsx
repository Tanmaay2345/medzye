"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, Loader2, RotateCw, Search, X } from "lucide-react";
import { MedicineGrid } from "@/components/cards/medicine-grid";
import { EmptyState } from "@/components/common/empty-state";
import { recognizeMedicineText, type OcrProgress } from "@/lib/ocr/recognize-medicine-text";
import {
  getMedicineNameIndex,
  getMedicinesByIds,
  searchMedicines,
} from "@/lib/queries/medicines";
import { matchMedicines } from "@/utils/match-medicine-text";
import type { MedicineWithPrice } from "@/types/database";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

/** Phone photos are routinely 3-6MB; 10MB is generous without inviting a tab freeze. */
const MAX_BYTES = 10 * 1024 * 1024;

const UNIDENTIFIED_MESSAGE =
  "Couldn't identify this medicine. Try uploading a clearer image.";

type Stage = "idle" | "ready" | "processing" | "matched" | "unidentified" | "error";

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MedicineUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<MedicineWithPrice[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs are a manual allocation: without revoking, every reselect
  // leaks the previous image for the lifetime of the tab.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = useCallback(() => {
    setFile(null);
    setStage("idle");
    setProgress(null);
    setErrorMessage(null);
    setResults([]);
    setManualQuery("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const acceptFile = useCallback((candidate: File | undefined) => {
    if (!candidate) return;

    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setFile(null);
      setStage("error");
      setErrorMessage(
        `${candidate.type || "That file"} isn't a supported image. Use a JPG, PNG or WEBP.`
      );
      return;
    }

    if (candidate.size > MAX_BYTES) {
      setFile(null);
      setStage("error");
      setErrorMessage(
        `That image is ${formatBytes(candidate.size)}. Please choose one under ${formatBytes(MAX_BYTES)}.`
      );
      return;
    }

    setFile(candidate);
    setStage("ready");
    setErrorMessage(null);
    setResults([]);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;

    setStage("processing");
    setProgress(null);
    setErrorMessage(null);

    try {
      // The catalogue fetch runs alongside OCR rather than after it — OCR is
      // by far the slower half, so this costs nothing on the clock.
      const [text, catalogue] = await Promise.all([
        recognizeMedicineText(file, setProgress),
        getMedicineNameIndex(),
      ]);

      const matches = matchMedicines(text, catalogue);

      if (matches.length === 0) {
        setStage("unidentified");
        return;
      }

      const medicines = await getMedicinesByIds(matches.map((match) => match.id));

      if (medicines.length === 0) {
        setStage("unidentified");
        return;
      }

      setResults(medicines);
      setStage("matched");
    } catch (error) {
      console.error("[upload-medicine] processing failed", error);
      setStage("error");
      setErrorMessage(
        "Something went wrong while reading that image. Please try again."
      );
    }
  }, [file]);

  const handleManualSearch = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const query = manualQuery.trim();
    if (query.length < 2) return;

    setIsSearching(true);
    try {
      const found = await searchMedicines(query);
      setResults(found);
      setStage(found.length > 0 ? "matched" : "unidentified");
    } catch {
      setStage("error");
      setErrorMessage("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [manualQuery]);

  const manualSearchForm = (
    <form onSubmit={handleManualSearch} className="flex w-full max-w-md gap-2">
      <label htmlFor="manual-medicine-search" className="sr-only">
        Search for the medicine by name
      </label>
      <input
        id="manual-medicine-search"
        type="search"
        value={manualQuery}
        onChange={(event) => setManualQuery(event.target.value)}
        placeholder="Search by medicine name"
        className="h-11 flex-1 rounded-lg border border-brand-border-card px-4 text-sm outline-none focus-visible:border-brand-primary"
      />
      <button
        type="submit"
        disabled={manualQuery.trim().length < 2 || isSearching}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-primary px-5 font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSearching ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Search className="size-4" aria-hidden />
        )}
        Search
      </button>
    </form>
  );

  return (
    <div className="flex w-full flex-col gap-8">
      {/* ---------------------------------------------------------------- picker */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      {!previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brand-border-card bg-white px-6 py-16 text-center transition-colors hover:border-brand-primary hover:bg-brand-tint-icon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          <ImageUp className="size-10 text-brand-primary" aria-hidden />
          <span className="font-semibold text-brand-navy">
            Select a photo of your medicine
          </span>
          <span className="max-w-sm text-sm text-brand-gray-500">
            Show the front of the pack so the brand name is readable. JPG, PNG or
            WEBP, up to {formatBytes(MAX_BYTES)}.
          </span>
        </button>
      )}

      {/* --------------------------------------------------------------- preview */}
      {previewUrl && (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-brand-border-image bg-white sm:w-[280px]">
            {/* unoptimized: this is a local blob: URL, so there is nothing for
                the Next image optimizer to fetch or cache. */}
            <Image
              src={previewUrl}
              alt="Selected medicine photo"
              fill
              sizes="280px"
              unoptimized
              className="object-contain"
            />
            {stage !== "processing" && (
              <button
                type="button"
                onClick={reset}
                aria-label="Remove image"
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-brand-gray-900 shadow-sm transition-colors hover:bg-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-4">
            {file && (
              <div className="flex flex-col gap-1">
                <p className="font-medium text-brand-gray-900">{file.name}</p>
                <p className="text-sm text-brand-gray-500">{formatBytes(file.size)}</p>
              </div>
            )}

            {stage === "processing" ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col gap-2 rounded-lg bg-brand-tint-icon px-4 py-3"
              >
                <span className="flex items-center gap-2 font-medium text-brand-navy">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Reading the packaging…
                </span>
                <span className="text-sm capitalize text-brand-gray-500">
                  {progress?.stage ?? "starting"}
                  {progress ? ` — ${Math.round(progress.progress * 100)}%` : ""}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-primary px-6 font-medium text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                >
                  {stage === "matched" || stage === "unidentified"
                    ? "Scan again"
                    : "Confirm and identify"}
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-border-card px-5 font-medium text-brand-gray-900 transition-colors hover:bg-brand-gray-50"
                >
                  <RotateCw className="size-4" aria-hidden />
                  Choose a different photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- error */}
      {stage === "error" && errorMessage && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {/* --------------------------------------------------------- not identified */}
      {stage === "unidentified" && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-brand-border-card bg-white px-6 py-10 text-center">
          <p className="font-semibold text-brand-gray-900">{UNIDENTIFIED_MESSAGE}</p>
          <p className="max-w-md text-sm text-brand-gray-500">
            Photos work best when the brand name is in focus and the pack fills the
            frame. You can also search for it by name.
          </p>
          {manualSearchForm}
        </div>
      )}

      {/* --------------------------------------------------------------- results */}
      {stage === "matched" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-brand-navy">
              {results.length === 1 ? "We found this medicine" : "Matching medicines"}
            </h2>
            <p className="text-sm text-brand-gray-500">
              Select one to compare prices across pharmacies.
            </p>
          </div>
          {/* MedicineGrid + MedicineCard unchanged: selecting a card opens the
              existing comparison modal, so this drops straight into the
              current flow rather than duplicating it. */}
          <MedicineGrid medicines={results} />
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm text-brand-gray-500">Not the right medicine?</p>
            {manualSearchForm}
          </div>
        </div>
      )}

      {stage === "idle" && (
        <EmptyState
          title="No medicine scanned yet"
          description="Upload a photo of the pack and we'll look it up in the Medyze catalogue."
        />
      )}
    </div>
  );
}
