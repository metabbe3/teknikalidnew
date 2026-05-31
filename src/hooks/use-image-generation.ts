"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface GenerationResult {
  jobId: string;
}

interface JobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const pollStatus = useCallback(
    (jobId: string) => {
      stopPolling();

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/image-gen/status/${jobId}`);
          if (!res.ok) throw new Error("Poll failed");

          const json: { data: JobStatus } = await res.json();
          const { status, imageUrl: url, error: err } = json.data;

          if (status === "completed" && url) {
            setImageUrl(url);
            setIsGenerating(false);
            stopPolling();
          } else if (status === "failed") {
            setError(err || "Generation failed");
            setIsGenerating(false);
            stopPolling();
          }
        } catch {
          // Keep polling on transient errors
        }
      }, 2000);
    },
    [stopPolling]
  );

  const generate = useCallback(
    async (params: {
      prompt?: string;
      auto?: boolean;
      content?: string;
      tickerTag?: string | null;
    }) => {
      setIsGenerating(true);
      setError(null);
      setImageUrl(null);

      try {
        const res = await fetch("/api/image-gen/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to start generation");
        }

        const json: { data: GenerationResult } = await res.json();
        pollStatus(json.data.jobId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        setIsGenerating(false);
      }
    },
    [pollStatus]
  );

  const reset = useCallback(() => {
    stopPolling();
    setIsGenerating(false);
    setImageUrl(null);
    setError(null);
  }, [stopPolling]);

  return { generate, reset, isGenerating, imageUrl, error };
}
