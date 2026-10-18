import type { Course, MaterialType } from "@/types/course";

export type MaterialMethod = "empty" | "upload" | "url" | "text";

export type MaterialDraft =
  | { method: "empty" }
  | {
      method: "upload";
      file: File | null;
      type: MaterialType | null;
      requiresConfirmation: boolean;
      confirmed: boolean;
      hint: string;
    }
  | { method: "url"; url: string; type: MaterialType | null; confirmed: boolean }
  | { method: "text"; text: string };

export type MaterialDrafts = Record<string, MaterialDraft>;

export const EMPTY_MATERIAL: MaterialDraft = { method: "empty" };
export const ACCEPTED_MATERIAL_FILES = ".mp4,.webm,.pdf,.ppt,.pptx,.doc,.docx";

const FILE_FORMATS: Record<string, { type: MaterialType; mime: string }> = {
  mp4: { type: "video", mime: "video/mp4" },
  webm: { type: "video", mime: "video/webm" },
  pdf: { type: "slide", mime: "application/pdf" },
  ppt: { type: "slide", mime: "application/vnd.ms-powerpoint" },
  pptx: { type: "slide", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  doc: { type: "file", mime: "application/msword" },
  docx: { type: "file", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
};

function getExtension(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

function getFileFormat(extension: string) {
  return Object.prototype.hasOwnProperty.call(FILE_FORMATS, extension) ? FILE_FORMATS[extension] : undefined;
}

function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url;
  } catch {
    // Invalid draft URLs remain editable; validation reports them before preview.
  }
  return undefined;
}

function detectUrlType(url: URL): MaterialType | null {
  const format = getFileFormat(getExtension(url.pathname));
  if (format) return format.type;
  const host = url.hostname.toLowerCase();
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if ((isHost("youtube.com") && ((url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) || /^\/(embed|shorts|live)\/[^/]+/.test(url.pathname))) ||
      (isHost("youtu.be") && /^\/[^/]+/.test(url.pathname)) ||
      (isHost("vimeo.com") && /^\/(?:video\/)?\d+(?:\/|$)/.test(url.pathname))) return "video";
  if (host === "docs.google.com" && /^\/presentation(?:\/|$)/.test(url.pathname)) return "slide";
  return null;
}

export function createMaterialDraft(method: MaterialMethod): MaterialDraft {
  switch (method) {
    case "upload":
      return { method, file: null, type: null, requiresConfirmation: false, confirmed: false, hint: "" };
    case "url":
      return { method, url: "", type: null, confirmed: false };
    case "text":
      return { method, text: "" };
    default:
      return { method: "empty" };
  }
}

export function createFileDraft(file: File): {
  draft?: Extract<MaterialDraft, { method: "upload" }>;
  error?: string;
} {
  if (file.size === 0) return { error: "Choose a file that is not empty." };
  const extension = getExtension(file.name);
  const format = getFileFormat(extension);
  if (!format) return { error: "Choose an MP4, WebM, PDF, PPT, PPTX, DOC, or DOCX file." };

  // Browser MIME metadata and extensions are hints, not verification of file bytes.
  const requiresConfirmation = file.type.trim().toLowerCase() !== format.mime;
  const hint = requiresConfirmation
    ? "The reported file type is missing, unrecognized, or does not match its extension. Confirm the material type."
    : extension === "pdf"
      ? "PDF is suggested as Slide. You can choose File instead."
      : "Suggested from the file extension and browser-reported MIME type.";
  return {
    draft: {
      method: "upload",
      file,
      type: format.type,
      requiresConfirmation,
      confirmed: !requiresConfirmation,
      hint,
    },
  };
}

export function createUrlDraft(value: string): Extract<MaterialDraft, { method: "url" }> {
  const url = parseHttpUrl(value);
  const type = url ? detectUrlType(url) : null;
  return { method: "url", url: value, type, confirmed: type !== null };
}

export function hasMaterialContent(draft: MaterialDraft): boolean {
  switch (draft.method) {
    case "upload": return draft.file !== null;
    case "url": return Boolean(draft.url.trim());
    case "text": return Boolean(draft.text.trim());
    default: return false;
  }
}

export function getAllowedMaterialTypes(draft: MaterialDraft): MaterialType[] {
  if (draft.method === "text") return ["text"];
  // URL suffixes and providers are hints; their remote content has not been read.
  if (draft.method === "url") return ["video", "text", "slide", "file"];
  if (draft.method !== "upload" || !draft.file) return [];
  const format = getFileFormat(getExtension(draft.file.name));
  if (!format) return [];
  if (format.type === "slide") return ["slide", "file"];
  return [format.type];
}

export function validateMaterial(draft: MaterialDraft): string | undefined {
  if (!hasMaterialContent(draft)) return undefined;
  if (draft.method === "upload") {
    if (draft.file) {
      const { error } = createFileDraft(draft.file);
      if (error) return error;
    }
    if (!draft.type) return "Select a material type.";
    if (!getAllowedMaterialTypes(draft).includes(draft.type)) return "Choose a material type supported by this file.";
    if (draft.requiresConfirmation && !draft.confirmed) return "Confirm the material type before reviewing this file.";
  }
  if (draft.method === "url") {
    if (!parseHttpUrl(draft.url)) return "Enter a valid HTTP or HTTPS URL.";
    if (!draft.type || !draft.confirmed) return "Select and confirm the material type for this URL.";
  }
  return undefined;
}

export function getMaterialType(draft: MaterialDraft): MaterialType | undefined {
  if (!hasMaterialContent(draft)) return undefined;
  if (draft.method === "text") return "text";
  if (draft.method === "upload" || draft.method === "url") return draft.type ?? undefined;
  return undefined;
}

export function getMaterialContentUrl(draft: MaterialDraft): string | undefined {
  return draft.method === "url" && parseHttpUrl(draft.url) ? draft.url.trim() : undefined;
}

export function hydrateMaterials(chapters: Course["chapters"]): MaterialDrafts {
  const drafts: MaterialDrafts = {};
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      if (lesson.contentUrl?.trim()) {
        // A linked text lesson is still a URL; never infer or fetch raw text.
        drafts[lesson.id] = { method: "url", url: lesson.contentUrl, type: lesson.type, confirmed: true };
      }
    }
  }
  return drafts;
}

export function pruneMaterials(drafts: MaterialDrafts, chapters: Course["chapters"]): MaterialDrafts {
  const lessonIds = new Set(chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id)));
  return Object.fromEntries(Object.entries(drafts).filter(([id]) => lessonIds.has(id)));
}

function draftsEqual(a: MaterialDraft, b: MaterialDraft): boolean {
  if (!hasMaterialContent(a) && !hasMaterialContent(b)) {
    const rawValue = (draft: MaterialDraft) => draft.method === "text" ? draft.text : draft.method === "url" ? draft.url : "";
    // Choosing an empty source is UI state; entered whitespace is still an edit.
    if (!rawValue(a) && !rawValue(b)) return true;
    return a.method === b.method && rawValue(a) === rawValue(b);
  }
  if (a.method !== b.method) return false;
  if (a.method === "upload" && b.method === "upload") {
    return a.file === b.file && a.type === b.type &&
      a.requiresConfirmation === b.requiresConfirmation && a.confirmed === b.confirmed;
  }
  if (a.method === "url" && b.method === "url") {
    return a.url === b.url && a.type === b.type && a.confirmed === b.confirmed;
  }
  if (a.method === "text" && b.method === "text") return a.text === b.text;
  return a.method === "empty" && b.method === "empty";
}

export function materialDraftsEqual(a: MaterialDrafts, b: MaterialDrafts): boolean {
  const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
  return Array.from(ids).every((id) => draftsEqual(a[id] ?? EMPTY_MATERIAL, b[id] ?? EMPTY_MATERIAL));
}

export async function isSameFileSelection(a: File, b: File, signal?: AbortSignal): Promise<boolean> {
  if (a === b) return true;
  if (a.name !== b.name || a.size !== b.size || a.lastModified !== b.lastModified || a.type !== b.type) return false;
  if (signal?.aborted) return false;
  const chunkSize = 1024 * 1024;
  try {
    // Metadata can collide. Compare bytes in bounded chunks without retaining the whole file.
    for (let offset = 0; offset < a.size; offset += chunkSize) {
      if (signal?.aborted) return false;
      const [aBuffer, bBuffer] = await Promise.all([
        a.slice(offset, offset + chunkSize).arrayBuffer(),
        b.slice(offset, offset + chunkSize).arrayBuffer(),
      ]);
      if (signal?.aborted) return false;
      const aBytes = new Uint8Array(aBuffer);
      const bBytes = new Uint8Array(bBuffer);
      if (aBytes.length !== bBytes.length) return false;
      for (let index = 0; index < aBytes.length; index += 1) {
        if (aBytes[index] !== bBytes[index]) return false;
      }
    }
    return !signal?.aborted;
  } catch {
    // An unreadable or changed device file is conservatively treated as a new selection.
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1))} ${units[index]}`;
}
