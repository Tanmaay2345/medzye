/**
 * Client-side OCR. Nothing leaves the browser.
 *
 * tesseract.js runs as WebAssembly in a worker, so the photo is read locally
 * and never uploaded — no Storage write, no RLS policy, no server, no API key.
 * The module is imported dynamically so its ~4MB of wasm and language data are
 * only fetched when someone actually opens the upload page.
 */

export type OcrProgress = {
  /** tesseract's stage, e.g. "loading language traineddata", "recognizing text". */
  stage: string;
  /** 0-1 within the current stage. */
  progress: number;
};

export async function recognizeMedicineText(
  image: File | Blob,
  onProgress?: (progress: OcrProgress) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: (message: { status: string; progress: number }) => {
      onProgress?.({ stage: message.status, progress: message.progress });
    },
  });

  try {
    const { data } = await worker.recognize(image);
    return data.text ?? "";
  } finally {
    // Always tear the worker down — otherwise its wasm heap and the spawned
    // web worker leak for the lifetime of the tab across repeated uploads.
    await worker.terminate();
  }
}
