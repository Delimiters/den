import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export interface LinkPreviewData {
  title: string;
  description: string;
  image: string | null;
  siteName: string;
}

const cache = new Map<string, LinkPreviewData | null>();

export function useLinkPreview(url: string | null) {
  const [data, setData] = useState<LinkPreviewData | null>(
    url && cache.has(url) ? cache.get(url)! : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) {
      setData(cache.get(url) ?? null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("link-preview", { body: { url } })
      .then(({ data: result, error }) => {
        if (cancelled) return;
        const preview = !error && result && result.title ? (result as LinkPreviewData) : null;
        cache.set(url, preview);
        setData(preview);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          cache.set(url, null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading };
}

export function extractFirstUrl(content: string): string | null {
  const m = content.match(/https?:\/\/[^\s<>"']+[^\s<>"'.,;!?]/);
  return m ? m[0] : null;
}
