"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCEPTED_MATERIAL_FILES,
  EMPTY_MATERIAL,
  createFileDraft,
  createMaterialDraft,
  createUrlDraft,
  formatFileSize,
  getAllowedMaterialTypes,
  hasMaterialContent,
  isSameFileSelection,
  validateMaterial,
  type MaterialDraft,
  type MaterialMethod,
} from "@/lib/instructor-material";
import { cn } from "@/lib/utils";
import type { MaterialType } from "@/types/course";

interface MaterialUploaderProps {
  lessonId: string;
  value: MaterialDraft;
  onChange: (draft: MaterialDraft) => void;
  error?: string;
  disabled?: boolean;
}

const METHODS: { value: Exclude<MaterialMethod, "empty">; label: string }[] = [
  { value: "upload", label: "Upload File" },
  { value: "url", label: "Paste URL" },
  { value: "text", label: "Write Text" },
];
const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "slide", label: "Slide / PDF" },
  { value: "text", label: "Text" },
  { value: "file", label: "File" },
];
type UploadDraft = Extract<MaterialDraft, { method: "upload" }>;
type PendingAction =
  | { kind: "methodSwitch"; method: Exclude<MaterialMethod, "empty"> }
  | { kind: "removeMaterial" }
  | { kind: "replaceFile"; candidate: UploadDraft };

export function MaterialUploader({ lessonId, value, onChange, error, disabled = false }: MaterialUploaderProps) {
  const [fileError, setFileError] = React.useState("");
  const [isDragging, setIsDragging] = React.useState(false);
  const [isCheckingFile, setIsCheckingFile] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const comparisonRef = React.useRef<AbortController | null>(null);
  const requestTokenRef = React.useRef(0);
  const valueRef = React.useRef(value);
  const pendingValueRef = React.useRef(value);
  const disabledRef = React.useRef(disabled);
  valueRef.current = value;
  disabledRef.current = disabled;
  const id = `material-${lessonId}`;
  const message = fileError || error || validateMaterial(value);
  const controlsDisabled = disabled || isCheckingFile;
  const typedMaterial = value.method === "upload" || value.method === "url" ? value : null;
  const showType = typedMaterial && (typedMaterial.method === "upload" ? Boolean(typedMaterial.file) : Boolean(typedMaterial.url.trim()));
  const allowedTypes = getAllowedMaterialTypes(value);
  const unavailableType = typedMaterial?.type && !allowedTypes.includes(typedMaterial.type) ? typedMaterial.type : null;
  const actionCopy = pendingAction?.kind === "removeMaterial"
    ? { title: "Remove this material?", message: "This removes the material from this lesson. Cancel to keep it unchanged.", action: "Remove Material" }
    : pendingAction?.kind === "replaceFile"
      ? { title: "Replace this file?", message: `The current file will be replaced by “${pendingAction.candidate.file?.name}”. Cancel to keep the current file and type unchanged.`, action: "Replace File" }
      : { title: "Replace this material source?", message: "Switching sources discards the current material from this lesson. Cancel to keep it unchanged.", action: "Discard and Switch" };

  const cancelFileCheck = React.useCallback(() => {
    comparisonRef.current?.abort();
    comparisonRef.current = null;
    requestTokenRef.current += 1;
  }, []);

  React.useEffect(() => {
    cancelFileCheck();
    setIsCheckingFile(false);
    setPendingAction(null);
    setFileError("");
    if (fileRef.current) fileRef.current.value = "";
  }, [value, cancelFileCheck]);

  React.useEffect(() => () => cancelFileCheck(), [cancelFileCheck]);

  React.useEffect(() => {
    if (pendingAction) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      cancelRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [pendingAction]);

  const requestConfirmation = (action: PendingAction, trigger: HTMLButtonElement | null) => {
    triggerRef.current = trigger;
    pendingValueRef.current = valueRef.current;
    setPendingAction(action);
  };

  const chooseMethod = (method: Exclude<MaterialMethod, "empty">, trigger: HTMLButtonElement) => {
    if (controlsDisabled || value.method === method) return;
    if (hasMaterialContent(value)) requestConfirmation({ kind: "methodSwitch", method }, trigger);
    else onChange(createMaterialDraft(method));
  };
  const selectFiles = async (files: FileList, trigger: HTMLButtonElement | null) => {
    if (disabledRef.current || files.length === 0) return;
    cancelFileCheck();
    setIsCheckingFile(false);
    if (files.length !== 1) {
      setFileError("Choose one file per lesson. The current material has been kept.");
      return;
    }
    const result = createFileDraft(files[0]);
    if (result.error || !result.draft?.file) {
      setFileError(result.error || "This file cannot be selected.");
      return;
    }
    setFileError("");
    const candidate = result.draft;
    const candidateFile = result.draft.file;
    const current = valueRef.current;
    if (current.method !== "upload" || !current.file) {
      onChange(candidate);
      return;
    }
    const controller = new AbortController();
    const token = ++requestTokenRef.current;
    comparisonRef.current = controller;
    setIsCheckingFile(true);
    try {
      const sameFile = await isSameFileSelection(current.file, candidateFile, controller.signal);
      if (controller.signal.aborted || token !== requestTokenRef.current || valueRef.current !== current || disabledRef.current) return;
      if (!sameFile) requestConfirmation({ kind: "replaceFile", candidate }, trigger);
    } catch {
      if (controller.signal.aborted || token !== requestTokenRef.current || valueRef.current !== current || disabledRef.current) return;
      setFileError("Unable to compare the selected files. The current material has been kept. Please try again.");
    } finally {
      if (token === requestTokenRef.current) {
        comparisonRef.current = null;
        setIsCheckingFile(false);
      }
    }
  };

  return (
    <div ref={rootRef} id={id} tabIndex={-1} data-component="MaterialUploader" role="group" aria-label="Learning material"
      aria-describedby={message ? `${id}-error` : undefined}
      className="material-uploader__container_01 space-y-3 rounded-[15px] border border-border bg-card p-3 focus:outline-none focus:ring-2 focus:ring-ring sm:p-4">
      <div className="material-uploader__methods_01 flex flex-wrap gap-2" role="group" aria-label="Material source">
        {METHODS.map((method) => (
          <Button key={method.value} type="button" size="sm" disabled={controlsDisabled}
            variant={value.method === method.value ? "default" : "outline"}
            aria-pressed={value.method === method.value}
            onClick={(event) => chooseMethod(method.value, event.currentTarget)}
            className="material-uploader__method_01 grow sm:grow-0">{method.label}</Button>
        ))}
      </div>

      {value.method === "empty" && (
        <p className="material-uploader__empty_01 text-xs text-muted-foreground">Optional. Add one file, a URL, or plain text to this lesson.</p>
      )}

      {value.method === "upload" && (
        <div className="material-uploader__upload_01 space-y-3">
          <input ref={fileRef} id={`${id}-file`} type="file" accept={ACCEPTED_MATERIAL_FILES} disabled={controlsDisabled}
            aria-label="Choose a learning material file" aria-describedby={`${id}-file-help${message ? ` ${id}-error` : ""}`}
            aria-invalid={Boolean(message)} tabIndex={-1}
            onChange={(event) => {
              if (event.target.files) void selectFiles(event.target.files, triggerRef.current);
              event.target.value = "";
            }} className="material-uploader__file-input_01 sr-only" />
          <div aria-disabled={controlsDisabled} aria-busy={isCheckingFile} onDragOver={(event) => { event.preventDefault(); if (!controlsDisabled) setIsDragging(true); }}
            onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setIsDragging(false); }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsDragging(false);
              if (!controlsDisabled) void selectFiles(event.dataTransfer.files, null);
            }}
            className={cn("material-uploader__drop-zone_01 space-y-2 rounded-lg border border-dashed border-border p-3", isDragging && !controlsDisabled && "border-primary bg-primary/5")}>
            <p id={`${id}-file-help`} className="material-uploader__file-help_01 text-xs text-muted-foreground">
              MP4, WebM, PDF, PPT, PPTX, DOC or DOCX. Drop one file here, or choose it from your device.
            </p>
            <Button type="button" variant="outline" size="sm" disabled={controlsDisabled} onClick={(event) => {
              triggerRef.current = event.currentTarget;
              fileRef.current?.click();
            }}
              className="material-uploader__choose-file_01">{value.file ? "Replace File" : "Choose from Device"}</Button>
          </div>
          {value.file && (
            <div className="material-uploader__selected-file_01 space-y-1 text-sm">
              <p className="material-uploader__file-name_01 break-all font-medium">{value.file.name}</p>
              <p className="material-uploader__file-size_01 text-xs text-muted-foreground">{formatFileSize(value.file.size)} ({value.file.size} bytes)</p>
              <p className="material-uploader__local-notice_01 font-semibold text-primary">Selected locally — not uploaded</p>
              {value.hint && <p className="material-uploader__type-hint_01 text-xs text-muted-foreground">{value.hint}</p>}
            </div>
          )}
        </div>
      )}

      {value.method === "url" && (
        <div className="material-uploader__url_01 space-y-2">
          <label htmlFor={`${id}-url`} className="material-uploader__label_01 block text-sm font-medium">Material URL</label>
          <Input id={`${id}-url`} type="url" value={value.url} disabled={controlsDisabled} placeholder="https://example.com/lesson.pdf"
            onChange={(event) => onChange(createUrlDraft(event.target.value))} aria-invalid={Boolean(message)}
            aria-describedby={`${id}-url-help${message ? ` ${id}-error` : ""}`} className="material-uploader__url-input_01" />
          <p id={`${id}-url-help`} className="material-uploader__url-help_01 text-xs text-muted-foreground">
            Use an HTTP or HTTPS URL. The remote URL is not verified; no content is fetched.
          </p>
        </div>
      )}

      {showType && typedMaterial && (
        <div className="material-uploader__type_01 space-y-2">
          <div className="material-uploader__type-heading_01 flex flex-wrap items-center gap-2">
            <label htmlFor={`${id}-type`} className="material-uploader__label_01 text-sm font-medium">Material Type</label>
            <Badge variant={typedMaterial.confirmed && !unavailableType ? "secondary" : "outline"} className="material-uploader__type-status_01">
              {unavailableType ? "Choose a supported type" : typedMaterial.confirmed ? "Type selected" : "Confirm material type"}
            </Badge>
          </div>
          <select id={`${id}-type`} value={typedMaterial.type || ""} disabled={controlsDisabled}
            aria-invalid={Boolean(message)} aria-describedby={message ? `${id}-error` : undefined}
            onChange={(event) => {
              const type = event.target.value as MaterialType | "";
              if (type && !allowedTypes.includes(type)) return;
              onChange({ ...typedMaterial, type: type || null, confirmed: Boolean(type) });
            }}
            className="material-uploader__type-select_01 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
            <option value="">Select material type</option>
            {unavailableType && <option value={unavailableType} disabled>{MATERIAL_TYPES.find((type) => type.value === unavailableType)?.label} (not supported for this file)</option>}
            {MATERIAL_TYPES.filter((type) => allowedTypes.includes(type.value)).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <p className="material-uploader__type-help_01 text-xs text-muted-foreground">Check the detected type or choose the correct type for this material.</p>
          {typedMaterial.method === "upload" && typedMaterial.requiresConfirmation && !typedMaterial.confirmed && typedMaterial.type && !unavailableType && (
            <Button type="button" variant="outline" size="sm" disabled={controlsDisabled}
              onClick={() => onChange({ ...typedMaterial, confirmed: true })}
              className="material-uploader__confirm-type_01">Confirm Type</Button>
          )}
        </div>
      )}

      {value.method === "text" && (
        <div className="material-uploader__text_01 space-y-2">
          <label htmlFor={`${id}-text`} className="material-uploader__label_01 block text-sm font-medium">Learning Text</label>
          <textarea id={`${id}-text`} value={value.text} disabled={controlsDisabled} rows={4}
            onChange={(event) => onChange({ method: "text", text: event.target.value })}
            aria-invalid={Boolean(error)} aria-describedby={message ? `${id}-error` : undefined}
            className="material-uploader__textarea_01 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50" />
        </div>
      )}

      {isCheckingFile && <p role="status" aria-live="polite" className="material-uploader__checking_01 text-xs text-muted-foreground">Checking selected file…</p>}
      {message && <p id={`${id}-error`} role="alert" className="material-uploader__error_01 text-sm text-destructive">{message}</p>}
      {value.method !== "empty" && (
        <Button type="button" variant="ghost" size="sm" disabled={controlsDisabled} onClick={(event) => {
          if (hasMaterialContent(value)) requestConfirmation({ kind: "removeMaterial" }, event.currentTarget);
          else onChange(EMPTY_MATERIAL);
        }}
          className="material-uploader__remove_01 text-destructive hover:text-destructive">Remove Material</Button>
      )}

      <dialog ref={dialogRef} aria-labelledby={`${id}-switch-title`} aria-describedby={`${id}-switch-description`}
        onCancel={(event) => { event.preventDefault(); setPendingAction(null); }}
        onClose={() => {
          setPendingAction(null);
          if (triggerRef.current?.isConnected && !triggerRef.current.disabled) triggerRef.current.focus();
          else rootRef.current?.focus();
        }}
        className="material-uploader__dialog_01 w-[calc(100%_-_2rem)] max-w-md rounded-[15px] border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50">
        <h2 id={`${id}-switch-title`} className="material-uploader__dialog-title_01 font-display text-xl font-bold">{actionCopy.title}</h2>
        <p id={`${id}-switch-description`} className="material-uploader__dialog-description_01 mt-3 break-words text-sm text-muted-foreground">{actionCopy.message}</p>
        <div className="material-uploader__dialog-actions_01 mt-6 flex flex-col gap-3 sm:flex-row">
          <Button ref={cancelRef} type="button" variant="outline" onClick={() => setPendingAction(null)}
            className="material-uploader__cancel_01">Cancel</Button>
          <Button type="button" variant="destructive" disabled={disabled} onClick={() => {
            if (!pendingAction || pendingValueRef.current !== valueRef.current) return;
            const next = pendingAction.kind === "methodSwitch" ? createMaterialDraft(pendingAction.method)
              : pendingAction.kind === "replaceFile" ? pendingAction.candidate : EMPTY_MATERIAL;
            setPendingAction(null);
            onChange(next);
          }} className="material-uploader__switch_01">{actionCopy.action}</Button>
        </div>
      </dialog>
    </div>
  );
}
