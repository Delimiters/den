import { supabase } from "../lib/supabase";
import type { Attachment } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadResult =
  | { ok: true; attachment: Omit<Attachment, "id" | "message_id"> }
  | { ok: false; error: string };

/**
 * Upload a file to storage.
 * Currently uses Supabase Storage — swap this function body to use R2 when ready.
 * Returns the public URL and file metadata.
 */
export async function uploadFile(file: File, userId: string): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);

  return {
    ok: true,
    attachment: {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
    },
  };
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
