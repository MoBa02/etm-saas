// src/hooks/useJobStream.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export type PipelineStep =
  | "clarifier"
  | "researcher"
  | "copywriter"
  | "structure_builder";

export type JobStatus =
  | "idle"
  | "processing"
  | "completed"
  | "failed";

export interface StreamEvent {
  status: string;
  step: PipelineStep;
  message: string;
  payload: any;
}

export interface UseJobStreamReturn {
  jobId: string | null;
  status: JobStatus;
  currentStep: PipelineStep | null;
  currentMessage: string;
  completedSteps: PipelineStep[];
  structure: any | null;
  error: string | null;
  isPolling: boolean; // ✅ NEW: lets Dashboard show "Still working..." banner
  submitJob: (formData: JobFormData) => Promise<void>;
  reset: () => void;
}

export interface JobFormData {
  business_name: string;
  business_type: string;
  target_city: string;
  locale: string;
  direction: "rtl" | "ltr";
}

export function useJobStream(): UseJobStreamReturn {
  const [jobId, setJobId]                   = useState<string | null>(null);
  const [streamToken, setStreamToken]       = useState<string | null>(null);
  const [status, setStatus]                 = useState<JobStatus>("idle");
  const [currentStep, setCurrentStep]       = useState<PipelineStep | null>(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [completedSteps, setCompletedSteps] = useState<PipelineStep[]>([]);
  const [structure, setStructure]           = useState<any | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [isPolling, setIsPolling]           = useState(false);

  // ✅ useRef so the interval handle survives re-renders without triggering effects
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup helper ─────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStreamToken(null);
    setStatus("idle");
    setCurrentStep(null);
    setCurrentMessage("");
    setCompletedSteps([]);
    setStructure(null);
    setError(null);
    setIsPolling(false);
  }, [stopPolling]);

  // ── Job submission ─────────────────────────────────────────────
  const submitJob = useCallback(async (formData: JobFormData) => {
    reset();
    setStatus("processing");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus("failed");
      setError("غير مسجل الدخول");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      setStatus("failed");
      setError("Failed to create job");
      return;
    }

    const data = await res.json();
    setJobId(data.job_id);
    setStreamToken(data.stream_token);
  }, [reset]);

  // ── SSE + Polling fallback ─────────────────────────────────────
  useEffect(() => {
    if (!jobId || !streamToken) return;

    // ✅ Polling fallback — called when SSE dies before job completes
    const startPolling = () => {
      // Guard: don't start a second loop if one is already running
      if (pollingRef.current) return;

      setIsPolling(true);
      setCurrentMessage("جاري التحقق من اكتمال العمل..."); // "Checking job status..."

      pollingRef.current = setInterval(async () => {
        try {
          const { data, error: dbError } = await supabase
            .from("landing_pages")
            .select("id, structure")
            .eq("job_id", jobId)
            .single();

          if (data && !dbError) {
            // ✅ Row found — job completed while SSE was dead
            stopPolling();
            setCompletedSteps(["clarifier", "researcher", "copywriter", "structure_builder"]);
            setCurrentStep("structure_builder");
            setCurrentMessage("اكتملت الصفحة بنجاح! ✅");
            setStructure(data.structure);
            setStatus("completed");

            window.location.href = `/p/${data.id}`;
          }
          // If no row yet, do nothing — interval will fire again in 5s
        } catch (e) {
          console.error("[Polling] Unexpected error:", e);
          // Don't stop polling on a transient error — keep retrying
        }
      }, 5000); // ✅ Poll every 5 seconds
    };

    // ── Primary SSE connection ──────────────────────────────────
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/stream/${jobId}?token=${streamToken}`
    );

    es.onmessage = (e) => {
      const event: StreamEvent = JSON.parse(e.data);

      if (event.status === "connected") return;

      setCurrentStep(event.step);
      setCurrentMessage(event.message);

      if (event.status === "failed") {
        es.close();
        stopPolling();
        setStatus("failed");
        setError(event.message);
        return;
      }

      if (event.status === "completed" && event.step === "structure_builder") {
        es.close();
        stopPolling(); // ✅ Kill polling if SSE recovers before it triggers
        setCompletedSteps((prev) =>
          prev.includes(event.step) ? prev : [...prev, event.step]
        );
        setStructure(event.payload);
        setStatus("completed");
        return;
      }

      setCompletedSteps((prev) =>
        prev.includes(event.step) ? prev : [...prev, event.step]
      );
    };

    es.onerror = () => {
      es.close();        // ✅ Close the dead SSE connection
      startPolling();    // ✅ Immediately start polling — no more infinite spinner
    };

    return () => {
      es.close();
      stopPolling(); // ✅ Cleanup on unmount
    };
  }, [jobId, streamToken, stopPolling]);

  return {
    jobId, status, currentStep, currentMessage,
    completedSteps, structure, error,
    isPolling,
    submitJob, reset,
  };
}
