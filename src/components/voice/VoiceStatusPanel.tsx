import { useEffect, useState } from "react";
import { useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { prefs } from "../../utils/prefs";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface VoiceStatusPanelProps {
  channelName: string;
  onLeave: () => void;
  /** Called with the sharer's identity when the user clicks a LIVE badge to opt into watching. */
  onWatchScreenShare?: (identity: string) => void;
}

export function VoiceStatusPanel({ channelName, onLeave, onWatchScreenShare }: VoiceStatusPanelProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isDeafened, setIsDeafened] = useState(false);
  const [noiseCancellation, setNoiseCancellation] = useState(prefs.getNoiseCancellation);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaError) return;
    const t = setTimeout(() => setMediaError(null), 5000);
    return () => clearTimeout(t);
  }, [mediaError]);

  const participants = useParticipants();
  const screenShareTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const isScreenSharing = screenShareTracks.some((t) => t.participant.isLocal);
  const isCameraOn = cameraTracks.some((t) => t.participant.isLocal);

  const micMuted = !isMicrophoneEnabled;

  async function toggleMic() {
    try {
      if (micMuted) {
        await localParticipant.setMicrophoneEnabled(true, {
          noiseSuppression: noiseCancellation,
          echoCancellation: noiseCancellation,
          autoGainControl: noiseCancellation,
        });
      } else {
        await localParticipant.setMicrophoneEnabled(false);
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      if (msg.includes("Permission denied") || msg.includes("NotAllowed") || msg.includes("NotFoundError")) {
        setMediaError("Microphone access denied — grant access in System Settings → Privacy & Security → Microphone.");
      } else if (!msg.includes("cancelled") && !msg.includes("abort")) {
        setMediaError(`Microphone error: ${msg}`);
        console.error("[mic]", err);
      }
    }
  }

  async function toggleDeafen() {
    const next = !isDeafened;
    setIsDeafened(next);
    if (next) await localParticipant.setMicrophoneEnabled(false);
  }

  async function toggleCamera() {
    try {
      const deviceId = prefs.getCameraDeviceId();
      await localParticipant.setCameraEnabled(!isCameraOn, deviceId ? { deviceId } : undefined);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      if (msg.includes("Permission denied") || msg.includes("NotAllowed") || msg.includes("NotFoundError")) {
        setMediaError("Camera access denied — grant access in System Settings → Privacy & Security → Camera.");
      } else if (!msg.includes("cancelled") && !msg.includes("abort")) {
        setMediaError(`Camera error: ${msg}`);
        console.error("[camera]", err);
      }
    }
  }

  async function toggleScreenShare() {
    // On Windows/WebView2, the screen picker can appear behind the app window and freeze it.
    // Minimize before showing the picker so it can come to the foreground, then restore.
    const isWindows = navigator.userAgent.includes("Windows");
    const shouldMinimize = !isScreenSharing && isTauri() && isWindows;
    const win = shouldMinimize ? getCurrentWindow() : null;
    try {
      if (win) {
        await win.minimize();
        await new Promise((r) => setTimeout(r, 150));
      }
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      if (msg.includes("Permission denied") || msg.includes("NotAllowed")) {
        setMediaError("Screen recording denied — grant access in System Settings → Privacy & Security → Screen Recording.");
      } else if (msg.includes("not supported") || msg.includes("NotSupportedError")) {
        setMediaError("Screen sharing is not supported in this version of the app.");
      } else if (!msg.includes("cancelled") && !msg.includes("abort")) {
        setMediaError(`Screen share error: ${msg}`);
        console.error("[screenshare]", err);
      }
    } finally {
      if (win) {
        await win.unminimize();
        await win.setFocus();
      }
    }
  }

  async function toggleNC() {
    const next = !noiseCancellation;
    setNoiseCancellation(next);
    prefs.setNoiseCancellation(next);
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
    <div data-testid="voice-status-panel" className="bg-overlay border-t border-divider shrink-0">
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

      {/* Participant list */}
      {participants.length > 0 && (
        <div className="px-2 pb-1 flex flex-col gap-0.5 max-h-36 overflow-y-auto">
          {participants.map((p) => {
            const hasCam = cameraTracks.some((t) => t.participant.identity === p.identity);
            const hasScreen = screenShareTracks.some((t) => t.participant.identity === p.identity);
            const initials = (p.name || p.identity).slice(0, 1).toUpperCase();
            return (
              <div key={p.identity} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-white/5">
                <div className="w-5 h-5 rounded-full bg-accent/30 flex items-center justify-center shrink-0 text-[9px] font-bold text-accent">
                  {initials}
                </div>
                <span className="text-text-secondary text-xs truncate flex-1">{p.name || p.identity}</span>
                {hasCam && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted shrink-0">
                    <title>Camera on</title>
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                )}
                {hasScreen && (
                  <button
                    onClick={() => onWatchScreenShare?.(p.identity)}
                    className="text-[9px] font-bold px-1 py-0.5 bg-red-500 hover:bg-red-400 text-white rounded leading-none shrink-0 transition-colors"
                    title="Watch screen share"
                  >
                    LIVE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Permission / media error */}
      {mediaError && (
        <div className="mx-2 mb-1 px-2 py-1.5 bg-danger/20 border border-danger/30 rounded text-danger text-[10px] leading-tight">
          {mediaError}
        </div>
      )}

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

        {/* Screen share */}
        <PanelButton onClick={toggleScreenShare} title={isScreenSharing ? "Stop sharing" : "Share screen"} active={isScreenSharing}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78.48-4.34 1.71-5.5 3.72.14-1.37.49-4.4 3.28-6.31l-.78-.78V7.5L14 11l-1.5 2.47-.5-3z"/>
          </svg>
        </PanelButton>

        {/* Camera — classic movie camera: reel on top, body, lens ring */}
        <PanelButton onClick={toggleCamera} title={isCameraOn ? "Turn off camera" : "Turn on camera"} active={isCameraOn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            {/* Camera body with lens (evenodd: body filled, outer lens ring = glass hole, inner dot = aperture) */}
            <path
              fillRule="evenodd"
              d="M1 10h20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z
                 M13 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8z
                 M13 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
            />
            {/* Film reel — prominent circle mounted on top of body */}
            <path
              fillRule="evenodd"
              d="M7 1a5 5 0 1 0 0 10A5 5 0 0 0 7 1z
                 M7 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z
                 M7 5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
            />
            {/* Record indicator dot */}
            <circle cx="3.5" cy="13" r="1.5"/>
          </svg>
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
