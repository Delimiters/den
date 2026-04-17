import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { ParticipantTile, ScreenShareView } from "./ParticipantTile";
import { VoiceControls } from "./VoiceControls";
import type { Channel } from "../../types";

interface VoiceChannelViewProps {
  token: string;
  livekitUrl: string;
  channel: Channel;
  currentUserId: string;
  onLeave: () => void;
}

export function VoiceChannelView({ token, livekitUrl, channel, currentUserId, onLeave }: VoiceChannelViewProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      options={{ disconnectOnPageLeave: true }}
      onDisconnected={onLeave}
      className="flex-1 flex flex-col min-h-0"
    >
      <VoiceRoomContent
        channelName={channel.name}
        currentUserId={currentUserId}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  );
}

function VoiceRoomContent({
  channelName,
  currentUserId,
  onLeave,
}: {
  channelName: string;
  currentUserId: string;
  onLeave: () => void;
}) {
  const participants = useParticipants();
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const hasScreenShare = screenShareTracks.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Audio renderer — plays remote participants' audio */}
      <RoomAudioRenderer />

      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto min-h-0">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
            <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
          </svg>
          <h3 className="text-text-primary font-semibold text-sm">{channelName}</h3>
          <span className="text-text-muted text-xs">{participants.length} connected</span>
        </div>

        {/* Screen share — shown large when active */}
        {hasScreenShare && (
          <ScreenShareView trackRef={screenShareTracks[0]} />
        )}

        {/* Participant grid */}
        <div className={`flex flex-wrap gap-3 ${hasScreenShare ? "" : "flex-1 content-start"}`}>
          {participants.map((participant) => (
            <ParticipantTile
              key={participant.identity}
              participant={participant}
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

      {/* Voice controls bar */}
      <VoiceControls channelName={channelName} onLeave={onLeave} />
    </div>
  );
}
