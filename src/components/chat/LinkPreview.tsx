import { useLinkPreview, extractFirstUrl } from "../../hooks/useLinkPreview";
import { openUrl } from "../../utils/tauri";

interface LinkPreviewProps {
  content: string;
}

export function LinkPreview({ content }: LinkPreviewProps) {
  const url = extractFirstUrl(content);
  const { data } = useLinkPreview(url);

  if (!url || !data) return null;

  return (
    <div
      className="mt-2 max-w-sm border-l-4 border-accent/50 bg-overlay rounded-r overflow-hidden cursor-pointer hover:bg-msg-hover transition-colors"
      onClick={() => openUrl(url)}
    >
      <div className="flex gap-0">
        <div className="flex-1 p-2.5 min-w-0">
          <p className="text-text-muted text-xs truncate mb-0.5">{data.siteName}</p>
          <p className="text-text-link text-sm font-medium line-clamp-1 hover:underline">
            {data.title}
          </p>
          {data.description && (
            <p className="text-text-secondary text-xs line-clamp-2 mt-0.5">
              {data.description}
            </p>
          )}
        </div>
        {data.image && (
          <img
            src={data.image}
            alt=""
            className="w-20 h-full object-cover shrink-0 max-h-24"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>
    </div>
  );
}
