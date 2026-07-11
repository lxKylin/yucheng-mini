import { useCallback, useEffect, useRef, useState } from 'react';

type SubmissionTask = () => Promise<void>;

export function useSubmissionGuard(
  onSubmittingChange?: (submitting: boolean) => void
) {
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const onSubmittingChangeRef = useRef(onSubmittingChange);

  useEffect(() => {
    onSubmittingChangeRef.current = onSubmittingChange;
  }, [onSubmittingChange]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      submittingRef.current = false;
      onSubmittingChangeRef.current?.(false);
    };
  }, []);

  const runSubmission = useCallback(async (task: SubmissionTask) => {
    if (submittingRef.current) {
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    onSubmittingChangeRef.current?.(true);

    try {
      await task();
      return true;
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) {
        setSubmitting(false);
      }
      onSubmittingChangeRef.current?.(false);
    }
  }, []);

  const isSubmitting = useCallback(() => submittingRef.current, []);

  return {
    submitting,
    runSubmission,
    isSubmitting
  };
}
