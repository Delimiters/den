import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

interface VoiceStatusPanelProps {
  channelName: string;
  onLeave: () => void;
}

export function VoiceStatusPanel({ channelName, onLeave }: VoiceStatusPanelProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isDeafened, setIsDeafened] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(true);

  const micMuted = !isMicrophoneEnabled;

  async function toggleMic() {
    if (micMuted) {
      await localParticipant.setMicrophoneEnabled(true, {
        noiseSuppression: noiseCancellation,
        echoCancellation: noiseCancellation,
        autoGainControl: noiseCancellation,
      });
    } else {
      await localParticipant.setMicrophoneEnabled(false);
    }
  }

  async function toggleDeafen() {
    const next = !isDeafened;
    setIsDeafened(next);
    if (next) await localParticipant.setMicrophoneEnabled(false);
  }

  async function toggleNC() {
    const next = !noiseCancellation;
    setNoiseCancellation(next);
    if (isMicrophoneEnabled) {
      await localParticipant.setMicrophoneEnabled(false);
      await localParticipant.setMicrophoneEnabled(true, {
        noiseSuppression: next,
        echoCancellation: next,
        autoGainControl: next,
      });
    }
  }

  return (
    <div className="bg-overlay border-t border-divider shrink-0">
      {/* Connected indicator */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-status-online shrink-0" />
        <span className="text-status-online text-xs font-semibold truncate flex-1">Voice Connected</span>
      </div>
      <div className="px-3 pb-1 flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
          <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
        </svg>
        <span className="text-text-muted text-xs truncate">{channelName}</span>
      </div>

      {/* Controls row */}
      <div className="px-2 pb-2 flex items-center gap-0.5">
        {/* Mic */}
        <PanelButton onClick={toggleMic} title={micMuted ? "Unmute" : "Mute"} danger={micMuted}>
          {micMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          )}
        </PanelButton>

        {/* Deafen */}
        <PanelButton onClick={toggleDeafen} title={isDeafened ? "Undeafen" : "Deafen"} danger={isDeafened}>
          {isDeafened ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </PanelButton>

        {/* Noise cancellation */}
        <PanelButton onClick={toggleNC} title={noiseCancellation ? "Disable noise cancellation" : "Enable noise cancellation"} active={noiseCancellation}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.48 3 2 7.48 2 13c0 2.76 1.12 5.26 2.93 7.07L12 13l7.07 7.07C20.88 18.26 22 15.76 22 13c0-5.52-4.48-10-10-10zm0 2c1.85 0 3.56.6 4.96 1.59L5.59 17.96A7.956 7.956 0 0 1 4 13c0-4.42 3.58-8 8-8zm0 16c-1.85 0-3.56-.6-4.96-1.59l11.37-11.37A7.956 7.956 0 0 1 20 13c0 4.42-3.58 8-8 8z"/>
          </svg>
        </PanelButton>

        <div className="flex-1" />

        {/* Disconnect */}
        <PanelButton onClick={onLeave} title="Disconnect" disconnect>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
        </PanelButton>
      </div>
    </div>
  );
}

function PanelButton({
  children,
  onClick,
  title,
  danger = false,
  active = false,
  disconnect = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
  active?: boolean;
  disconnect?: boolean;
}) {
  const colorClass = disconnect
    ? "text-text-muted hover:text-danger hover:bg-danger/10"
    : danger
    ? "text-danger bg-danger/10 hover:bg-danger/20"
    : active
    ? "text-accent hover:bg-white/10"
    : "text-text-muted hover:text-text-secondary hover:bg-white/10";

  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${colorClass}`}
    >
      {children}
    </button>
  );
}
