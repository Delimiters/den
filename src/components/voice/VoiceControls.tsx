import { useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";

interface VoiceControlsProps {
  channelName: string;
  onLeave: () => void;
}

export function VoiceControls({ channelName, onLeave }: VoiceControlsProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isTogglingScreen, setIsTogglingScreen] = useState(false);

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  async function toggleDeafen() {
    const next = !isDeafened;
    setIsDeafened(next);
    // Mute mic too when deafening (same as familiar chat app behavior)
    if (next) await localParticipant.setMicrophoneEnabled(false);
  }

  async function toggleScreenShare() {
    if (isTogglingScreen) return;
    setIsTogglingScreen(true);
    try {
      const next = !isSharingScreen;
      await localParticipant.setScreenShareEnabled(next, {
        resolution: { width: 1920, height: 1080, frameRate: 30 },
        audio: false,
      });
      setIsSharingScreen(next);
    } catch (e) {
      // User cancelled the screen picker — not an error
    } finally {
      setIsTogglingScreen(false);
    }
  }

  const micMuted = !isMicrophoneEnabled;

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-guild-rail border-t border-divider shrink-0">
      <div className="flex-1 min-w-0">
        <p className="text-status-online text-xs font-semibold">Voice Connected</p>
        <p className="text-text-muted text-xs truncate">{channelName}</p>
      </div>

      <ControlButton
        onClick={toggleMic}
        active={!micMuted}
        danger={micMuted}
        title={micMuted ? "Unmute" : "Mute"}
      >
        {micMuted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        )}
      </ControlButton>

      <ControlButton
        onClick={toggleDeafen}
        active={!isDeafened}
        danger={isDeafened}
        title={isDeafened ? "Undeafen" : "Deafen"}
      >
        {isDeafened ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        )}
      </ControlButton>

      <ControlButton
        onClick={toggleScreenShare}
        active={isSharingScreen}
        title={isSharingScreen ? "Stop sharing" : "Share screen"}
        disabled={isTogglingScreen}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
        </svg>
      </ControlButton>

      <ControlButton
        onClick={onLeave}
        title="Disconnect"
        danger
        className="ml-1"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
        </svg>
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  active = true,
  danger = false,
  title,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-9 h-9 rounded flex items-center justify-center transition-colors disabled:opacity-50 ${
        danger
          ? "text-danger hover:bg-danger/20"
          : active
          ? "text-text-secondary hover:bg-white/10"
          : "text-text-muted hover:bg-white/10"
      } ${className}`}
    >
      {children}
    </button>
  );
}
