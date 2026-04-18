interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const COLORS = [
  "#5865f2", // blurple
  "#3ba55c", // forest green
  "#e67e22", // warm orange
  "#9b59b6", // soft purple
  "#e74c3c", // muted red
  "#1abc9c", // teal
  "#3498db", // sky blue
  "#f39c12", // amber
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ src, name, size = 32, className = "", onClick }: AvatarProps) {
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
        onClick={onClick}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
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
