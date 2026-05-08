import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { ExternalE2EEKeyProvider, Track } from "livekit-client";
import { ParticipantTile, ScreenShareView } from "./ParticipantTile";
import { VoiceStatusPanel } from "./VoiceStatusPanel";
import type { Channel } from "../../types";

interface VoiceChannelViewProps {
  token: string;
  livekitUrl: string;
  e2eeKey: string | null;
  channel: Channel;
  currentUserId: string;
  voicePanelRef: React.RefObject<HTMLDivElement | null>;
  /** Where to portal the participant grid. When null, only audio is kept alive. */
  contentEl: HTMLDivElement | null;
  onLeave: () => void;
  /** Fires whenever screen share track count changes. Used by AppLayout to force the voice view. */
  onScreenShareChange?: (active: boolean) => void;
  /** Called when a participant's LIVE badge is clicked — navigates to the voice channel view. */
  onViewVoiceChannel?: () => void;
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
      console.warn("[E2EE] Failed to initialize voice encryption — connecting without it");
      return undefined;
    }
  }, [e2eeKey]);
}

/**
 * Mounts the LiveKit room for the duration of a voice connection.
 * Always portals a tiny status panel into the sidebar (`voicePanelRef`).
 * Portals the participant grid + screen share view into `contentRef` when provided —
 * AppLayout supplies it when the user is viewing the voice channel or when a screen share is active.
 */
export function VoiceConnection({
  token, livekitUrl, e2eeKey, channel, currentUserId,
  voicePanelRef, contentEl, onLeave, onScreenShareChange, onViewVoiceChannel,
}: VoiceChannelViewProps) {
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  useEffect(() => { return () => { onLeaveRef.current(); }; }, []);

  const e2ee = useE2EEOptions(e2eeKey);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      options={{ disconnectOnPageLeave: true, ...(e2ee ? { encryption: e2ee } : {}) }}
      onDisconnected={onLeave}
    >
      <RoomAudioRenderer />
      <VoicePortals
        channelName={channel.name}
        currentUserId={currentUserId}
        voicePanelRef={voicePanelRef}
        contentEl={contentEl}
        onLeave={onLeave}
        onScreenShareChange={onScreenShareChange}
        onViewVoiceChannel={onViewVoiceChannel}
      />
    </LiveKitRoom>
  );
}

function VoicePortals({
  channelName, currentUserId, voicePanelRef, contentEl, onLeave, onScreenShareChange, onViewVoiceChannel,
}: {
  channelName: string;
  currentUserId: string;
  voicePanelRef: React.RefObject<HTMLDivElement | null>;
  contentEl: HTMLDivElement | null;
  onLeave: () => void;
  onScreenShareChange?: (active: boolean) => void;
  onViewVoiceChannel?: () => void;
}) {
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const screenShareActive = screenShareTracks.length > 0;

  useEffect(() => {
    onScreenShareChange?.(screenShareActive);
  }, [screenShareActive, onScreenShareChange]);

  const sidebar = voicePanelRef.current
    ? createPortal(
        <VoiceStatusPanel channelName={channelName} onLeave={onLeave} onViewVoiceChannel={onViewVoiceChannel} />,
        voicePanelRef.current
      )
    : null;

  const main = contentEl
    ? createPortal(
        <VoiceRoomGrid channelName={channelName} currentUserId={currentUserId} />,
        contentEl
      )
    : null;

  return <>{sidebar}{main}</>;
}

function VoiceRoomGrid({ channelName, currentUserId }: { channelName: string; currentUserId: string }) {
  const participants = useParticipants();
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const cameraTracks = useTracks([Track.Source.Camera]);
  const hasScreenShare = screenShareTracks.length > 0;

  return (
    <div data-testid="voice-room-grid" className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto min-h-0">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
          <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
        </svg>
        <h3 className="text-text-primary font-semibold text-sm">{channelName}</h3>
        <span className="text-text-muted text-xs">{participants.length} connected</span>
      </div>

      {hasScreenShare && <ScreenShareView trackRef={screenShareTracks[0]} />}

      <div className={`flex flex-wrap gap-3 ${hasScreenShare ? "" : "flex-1 content-start"}`}>
        {participants.map((participant) => (
          <ParticipantTile
            key={participant.identity}
            participant={participant}
            cameraTrackRef={cameraTracks.find((t) => t.participant.identity === participant.identity)}
            isLocal={participant.identity === currentUserId}
          />
        ))}
        {participants.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <p className="text-text-muted text-sm">Connecting…</p>
          </div>
        )}
      </div>
    </div>
  );
}

