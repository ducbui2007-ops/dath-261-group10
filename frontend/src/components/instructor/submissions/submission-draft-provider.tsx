"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createGradingDraft, editGradingDraft, reviewGradingDraft, sameGradingDraftValues,
  type GradingDraft, type GradingDraftValues, type GradingDraftChanges, type ManualGradingSubmission,
} from "@/lib/instructor-grading-draft";

interface SubmissionDraftContextValue {
  drafts: Record<string, GradingDraft>;
  updateDraft: (submission: ManualGradingSubmission, changes: GradingDraftChanges) => void;
  confirmDraft: (submission: ManualGradingSubmission, expected: GradingDraftValues) => void;
  resetDraft: (id: string) => void;
}

const SubmissionDraftContext = createContext<SubmissionDraftContextValue | null>(null);
const LEAVE_MESSAGE = "Leaving the submissions workspace discards all temporary grading drafts, including drafts confirmed locally. Leave this workspace?";

export function SubmissionDraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, GradingDraft>>({});
  const hasDrafts = Object.keys(drafts).length > 0;

  useEffect(() => {
    if (!hasDrafts) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const beforeLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, window.location.href);
      // External full-page navigation is covered by beforeunload. Internal Studio links retain drafts.
      if (target.origin !== window.location.origin || target.protocol !== window.location.protocol ||
          target.pathname === "/instructor/submissions" || target.pathname.startsWith("/instructor/submissions/")) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [hasDrafts]);

  const updateDraft = (submission: ManualGradingSubmission, changes: GradingDraftChanges) => {
    setDrafts((previous) => {
      const draft = editGradingDraft(submission, previous[submission.id], changes);
      const next = { ...previous };
      if (draft) next[submission.id] = draft;
      else delete next[submission.id];
      return next;
    });
  };

  const confirmDraft = (submission: ManualGradingSubmission, expected: GradingDraftValues) => {
    setDrafts((previous) => {
      const current = previous[submission.id] ?? createGradingDraft(submission);
      if (!sameGradingDraftValues(current, expected)) return previous;
      const reviewed = reviewGradingDraft(submission, current);
      return reviewed ? { ...previous, [submission.id]: reviewed } : previous;
    });
  };

  const resetDraft = (id: string) => {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  return (
    <SubmissionDraftContext.Provider value={{ drafts, updateDraft, confirmDraft, resetDraft }}>
      {children}
    </SubmissionDraftContext.Provider>
  );
}

export function useSubmissionDrafts(): SubmissionDraftContextValue {
  const context = useContext(SubmissionDraftContext);
  if (!context) throw new Error("Submission drafts require the submissions workspace provider.");
  return context;
}
