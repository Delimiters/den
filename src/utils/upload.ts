import { supabase } from "../lib/supabase";
import type { Attachment } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadResult =
  | { ok: true; attachment: Omit<Attachment, "id" | "message_id"> }
  | { ok: false; error: string };

export async function uploadFile(file: File, _userId: string): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  // Get a pre-signed R2 upload URL from the Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    }
  );

  if (!res.ok) return { ok: false, error: "Failed to get upload URL" };

  const { uploadUrl, publicUrl } = await res.json();

  // PUT file directly to R2 — no proxy overhead
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  if (!uploadRes.ok) return { ok: false, error: "Upload to storage failed" };

  return {
    ok: true,
    attachment: {
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || "application/octet-stream",
    },
  };
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function isVideo(contentType: string): boolean {
  return contentType.startsWith("video/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
