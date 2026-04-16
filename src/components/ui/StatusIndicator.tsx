import type { UserStatus } from "../../types";

const statusColors: Record<UserStatus, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-status-offline",
};

interface StatusIndicatorProps {
  status: UserStatus;
  size?: number;
}

export function StatusIndicator({ status, size = 10 }: StatusIndicatorProps) {
  return (
    <span
      className={`rounded-full block shrink-0 ${statusColors[status]}`}
      style={{ width: size, height: size }}
    />
  );
}
