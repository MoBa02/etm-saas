import { useState, useEffect, useCallback } from "react";
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [currentStep, setCurrentStep] = useState<PipelineStep | null>(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [completedSteps, setCompletedSteps] = useState<PipelineStep[]>([]);
  const [structure, setStructure] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setJobId(null);
    setStreamToken(null);
    setStatus("idle");
    setCurrentStep(null);
    setCurrentMessage("");
    setCompletedSteps([]);
    setStructure(null);
    setError(null);
  }, []);

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

  useEffect(() => {
    if (!jobId || !streamToken) return;

    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/stream/${jobId}?token=${streamToken}`
    );

    es.onmessage = (e) => {
      const event: StreamEvent = JSON.parse(e.data);

      if (event.status === "connected") return;

      setCurrentStep(event.step);
      setCurrentMessage(event.message);

      if (event.status === "failed") {
        setStatus("failed");
        setError(event.message);
        es.close();
        return;
      }

      if (event.status === "completed" && event.step === "structure_builder") {
        setCompletedSteps((prev) =>
          prev.includes(event.step) ? prev : [...prev, event.step]
        );
        setStructure(event.payload); // ← pipeline returns correct shape directly
        setStatus("completed");
        es.close();
        return;
      }

      setCompletedSteps((prev) =>
        prev.includes(event.step) ? prev : [...prev, event.step]
      );
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [jobId, streamToken]);

  return {
    jobId, status, currentStep, currentMessage,
    completedSteps, structure, error,
    submitJob, reset,
  };
}
