import {
  useParticipantInfo,
  useIsMuted,
  useIsSpeaking,
  VideoTrack,
  type TrackReference,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { Track } from "livekit-client";
import { Avatar } from "../ui/Avatar";

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
}

export function ParticipantTile({ participant, isLocal }: ParticipantTileProps) {
  const { name, identity } = useParticipantInfo({ participant });
  const isMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const isSpeaking = useIsSpeaking(participant);
  const displayName = name || identity || "Unknown";

  return (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
      isSpeaking ? "bg-accent/20 ring-2 ring-accent/50" : "bg-overlay"
    }`}>
      <div className="relative">
        <Avatar src={null} name={displayName} size={56} />
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-danger rounded-full flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          </div>
        )}
        {isSpeaking && !isMuted && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-status-online rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>
      <p className="text-text-secondary text-xs font-medium truncate max-w-[80px]">
        {isLocal ? `${displayName} (you)` : displayName}
      </p>
    </div>
  );
}

interface ScreenShareViewProps {
  trackRef: TrackReference;
}

export function ScreenShareView({ trackRef }: ScreenShareViewProps) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-black flex-1 min-h-0">
      <VideoTrack trackRef={trackRef} className="w-full h-full object-contain" />
      <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5 text-white text-xs">
        Screen share
      </div>
    </div>
  );
}
