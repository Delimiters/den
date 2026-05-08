import { useMemo } from "react";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { ExternalE2EEKeyProvider, Track } from "livekit-client";
import { VideoTrack } from "@livekit/components-react";

interface DmCallViewProps {
  token: string;
  url: string;
  e2eeKey: string | null;
  onHangUp: () => void;
}

function useE2EEOptions(e2eeKey: string | null) {
  return useMemo(() => {
    if (!e2eeKey || typeof SharedArrayBuffer === "undefined") return undefined;
    try {
      const keyProvider = new ExternalE2EEKeyProvider();
      keyProvider.setKey(e2eeKey);
      const worker = new Worker(new URL("livekit-client/e2ee-worker", import.meta.url), { type: "module" });
      return { keyProvider, worker };
    } catch {
      return undefined;
    }
  }, [e2eeKey]);
}

export function DmCallView({ token, url, e2eeKey, onHangUp }: DmCallViewProps) {
  const e2ee = useE2EEOptions(e2eeKey);
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      options={{ disconnectOnPageLeave: true, ...(e2ee ? { encryption: e2ee } : {}) }}
      onDisconnected={onHangUp}
      className="shrink-0 border-b border-divider bg-overlay"
    >
      <RoomAudioRenderer />
      <DmCallContent onHangUp={onHangUp} />
    </LiveKitRoom>
  );
}

function DmCallContent({ onHangUp }: { onHangUp: () => void }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const isCameraOn = cameraTracks.some((t) => t.participant.isLocal);
  const micMuted = !isMicrophoneEnabled;

  async function toggleMic() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(() => {});
  }

  async function toggleCamera() {
    await localParticipant.setCameraEnabled(!isCameraOn).catch(() => {});
  }

  const remoteVideos = cameraTracks.filter((t) => !t.participant.isLocal);
  const localVideo = cameraTracks.find((t) => t.participant.isLocal);

  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Video tiles */}
      {(remoteVideos.length > 0 || localVideo) && (
        <div className="flex gap-2">
          {remoteVideos.map((t) => (
            <div key={t.participant.identity} className="w-48 aspect-video rounded overflow-hidden bg-black">
              <VideoTrack trackRef={t} className="w-full h-full object-cover" />
            </div>
          ))}
          {localVideo && (
            <div className="w-24 aspect-video rounded overflow-hidden bg-black">
              <VideoTrack trackRef={localVideo} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Status + controls */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-status-online shrink-0" />
        <span className="text-status-online text-xs font-semibold">
          {participants.length === 1 ? "Calling…" : "In call"}
        </span>
        <div className="flex-1" />

        {/* Mute */}
        <CallButton onClick={toggleMic} active={!micMuted} title={micMuted ? "Unmute" : "Mute"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            {micMuted
              ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
              : <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            }
          </svg>
        </CallButton>

        {/* Camera */}
        <CallButton onClick={toggleCamera} active={isCameraOn} title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </CallButton>

        {/* Hang up */}
        <button
          onClick={onHangUp}
          title="End call"
          className="w-7 h-7 rounded bg-danger hover:bg-danger/80 flex items-center justify-center text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function CallButton({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
        active ? "bg-white/10 text-text-primary hover:bg-white/15" : "bg-danger/10 text-danger hover:bg-danger/20"
      }`}
    >
      {children}
    </button>
  );
}
