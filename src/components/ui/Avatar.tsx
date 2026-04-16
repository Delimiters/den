interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

const COLORS = [
  "#5865f2", "#57f287", "#fee75c", "#eb459e",
  "#ed4245", "#3ba55c", "#faa61a", "#9146ff",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ src, name, size = 32, className = "" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colorFromName(name),
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}
