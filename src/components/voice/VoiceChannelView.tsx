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
  onLeave: () => void;
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

/** Minimal mount that keeps the LiveKit room connected and portals the sidebar status panel. */
export function VoiceConnection({ token, livekitUrl, e2eeKey, channel, voicePanelRef, onLeave }: Omit<VoiceChannelViewProps, "currentUserId">) {
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
      <VoiceSidebarPortal channelName={channel.name} voicePanelRef={voicePanelRef} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

function VoiceSidebarPortal({ channelName, voicePanelRef, onLeave }: { channelName: string; voicePanelRef: React.RefObject<HTMLDivElement | null>; onLeave: () => void }) {
  if (!voicePanelRef.current) return null;
  return createPortal(<VoiceStatusPanel channelName={channelName} onLeave={onLeave} />, voicePanelRef.current);
}

export function VoiceChannelView({ token, livekitUrl, e2eeKey, channel, currentUserId, voicePanelRef, onLeave }: VoiceChannelViewProps) {
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  useEffect(() => {
    return () => { onLeaveRef.current(); };
  }, []);

  const e2ee = useE2EEOptions(e2eeKey);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      options={{ disconnectOnPageLeave: true, ...(e2ee ? { encryption: e2ee } : {}) }}
      onDisconnected={onLeave}
      className="flex-1 flex flex-col min-h-0"
    >
      <VoiceRoomContent
        channelName={channel.name}
        currentUserId={currentUserId}
        voicePanelRef={voicePanelRef}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  );
}

function VoiceRoomContent({
  channelName,
  currentUserId,
  voicePanelRef,
  onLeave,
}: {
  channelName: string;
  currentUserId: string;
  voicePanelRef: React.RefObject<HTMLDivElement | null>;
  onLeave: () => void;
}) {
  const participants = useParticipants();
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const cameraTracks = useTracks([Track.Source.Camera]);
  const hasScreenShare = screenShareTracks.length > 0;

  const sidebarPanel = voicePanelRef.current
    ? createPortal(
        <VoiceStatusPanel channelName={channelName} onLeave={onLeave} />,
        voicePanelRef.current
      )
    : null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <RoomAudioRenderer />

      {/* Portal renders VoiceStatusPanel into the sidebar */}
      {sidebarPanel}

      {/* Participant view */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto min-h-0">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
            <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
          </svg>
          <h3 className="text-text-primary font-semibold text-sm">{channelName}</h3>
          <span className="text-text-muted text-xs">{participants.length} connected</span>
        </div>

        {hasScreenShare && (
          <ScreenShareView trackRef={screenShareTracks[0]} />
        )}

        <div className={`flex flex-wrap gap-3 ${hasScreenShare ? "" : "flex-1 content-start"}`}>
          {participants.map((participant) => (
            <ParticipantTile
              key={participant.identity}
              participant={participant}
              cameraTrackRef={cameraTracks.find((t) => t.participant.identity === participant.identity)}
              isLocal={participant.identity === currentUserId}
            />
          ))}
        </div>

        {participants.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted text-sm">Connecting…</p>
          </div>
        )}
      </div>
    </div>
  );
}
