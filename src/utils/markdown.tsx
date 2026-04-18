import { openUrl } from "./tauri";

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; url: string }
  | { type: "mention"; value: string };

function parseInline(text: string): Segment[] {
  // Apply patterns in priority order using a combined regex
  const combined = /(`[^`]+`|\*\*[\s\S]+?\*\*|(?<!\*)\*(?!\*)[\s\S]+?(?<!\*)\*(?!\*)|_[\s\S]+?_|https?:\/\/[^\s<>"']+[^\s<>"'.,;!?]|@\w+)/g;
  const segments: Segment[] = [];
  let last = 0;

  for (const match of text.matchAll(combined)) {
    if (match.index! > last) {
      segments.push({ type: "text", value: text.slice(last, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("`")) {
      segments.push({ type: "code", value: raw.slice(1, -1) });
    } else if (raw.startsWith("**")) {
      segments.push({ type: "bold", value: raw.slice(2, -2) });
    } else if (raw.startsWith("*") || raw.startsWith("_")) {
      segments.push({ type: "italic", value: raw.slice(1, -1) });
    } else if (/^https?:\/\//i.test(raw)) {
      segments.push({ type: "link", value: raw, url: raw });
    } else if (raw.startsWith("@")) {
      segments.push({ type: "mention", value: raw.slice(1) });
    }
    last = match.index! + raw.length;
  }

  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}

function renderSegments(segments: Segment[], key: string) {
  return segments.map((seg, i) => {
    const k = `${key}-${i}`;
    switch (seg.type) {
      case "bold":
        return <strong key={k} className="font-semibold text-text-primary">{seg.value}</strong>;
      case "italic":
        return <em key={k}>{seg.value}</em>;
      case "code":
        return (
          <code key={k} className="bg-black/30 text-text-primary font-mono text-sm px-1 py-0.5 rounded">
            {seg.value}
          </code>
        );
      case "link":
        return (
          <a
            key={k}
            href={seg.url}
            onClick={(e) => { e.preventDefault(); openUrl(seg.url); }}
            className="text-text-link hover:underline cursor-pointer"
            title={seg.url}
          >
            {seg.value}
          </a>
        );
      case "mention":
        return (
          <span key={k} className="bg-accent/20 text-accent rounded px-0.5 font-medium">
            @{seg.value}
          </span>
        );
      default:
        return <span key={k}>{seg.value}</span>;
    }
  });
}

interface MessageContentProps {
  content: string;
  className?: string;
}

/**
 * Renders message content with safe inline markdown:
 * **bold**, *italic*, `inline code`, ```code blocks```, and https:// links.
 * No HTML is ever injected — all output is React elements.
 */
export function MessageContent({ content, className = "" }: MessageContentProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    // Code block
    if (lines[i].startsWith("```")) {
      const lang = lines[i].slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-black/30 rounded p-3 my-1 overflow-x-auto text-sm font-mono text-text-secondary whitespace-pre">
          {lang && <span className="text-text-muted text-xs block mb-1">{lang}</span>}
          {codeLines.join("\n")}
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // Blockquote
    if (lines[i].startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-text-muted pl-3 my-0.5 text-text-muted">
          {renderSegments(parseInline(lines[i].slice(2)), `bq-${i}`)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Headings (# ## ###)
    const headingMatch = lines[i].match(/^(#{1,3}) (.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1
        ? "text-text-primary font-bold text-xl mt-2 mb-0.5"
        : level === 2
        ? "text-text-primary font-semibold text-lg mt-1.5 mb-0.5"
        : "text-text-primary font-semibold text-base mt-1 mb-0.5";
      elements.push(
        <div key={i} className={cls}>
          {renderSegments(parseInline(headingMatch[2]), `h-${i}`)}
        </div>
      );
      i++;
      continue;
    }

    // Ordered list (1. 2. 3.)
    if (/^\d+\. /.test(lines[i])) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside my-0.5 space-y-0.5 text-text-secondary">
          {listItems.map((item, j) => (
            <li key={j}>{renderSegments(parseInline(item), `oli-${i}-${j}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list (- item or * item)
    if (/^[-*] /.test(lines[i])) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside my-0.5 space-y-0.5 text-text-secondary">
          {listItems.map((item, j) => (
            <li key={j}>{renderSegments(parseInline(item), `li-${i}-${j}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Normal line
    const segs = parseInline(lines[i]);
    elements.push(
      <span key={i}>
        {renderSegments(segs, `line-${i}`)}
        {i < lines.length - 1 && <br />}
      </span>
    );
    i++;
  }

  return <span className={className}>{elements}</span>;
}
