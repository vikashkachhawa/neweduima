# EduMeet Features And Design Layout

## Overview
EduMeet is the real-time class and collaboration room inside Eduima. It supports live teaching sessions with video, audio, screen sharing, chat, whiteboard, attendance, polls, files, recordings, and breakout workflows.

## Core Features In Use

### Meeting and Access
- Room join by meeting link and room code.
- Host-managed room lifecycle (start, live state, end).
- Password-protected room support.
- Waiting room flow for controlled participant admission.
- Multi-role participation for faculty, school admin, super admin, and students.

### Live Audio and Video
- Two-way live media with WebRTC peer connections.
- Stable negotiation strategy (perfect negotiation flow).
- Local self-preview and participant tiles.
- Mic and camera toggle controls.
- Active speaker indication.
- Hand raise status on participant tiles and list.

### Screen Sharing
- Host/participant screen share support.
- Shared screen spotlight behavior in speaker view.
- Automatic stream replacement for remote peers during share.
- Fallback states while share stream is preparing.

### Realtime Classroom Collaboration
- Public chat and optional private chat.
- Reactions (emoji quick-send).
- Collaborative whiteboard with draw and clear actions.
- Live poll creation and response collection.
- Learning resource sharing (links/files metadata).
- Breakout room creation and participant assignment.

### Session Control and Moderation
- Host actions for attendance marking.
- Host action to clear session history.
- Remove participant action.
- Mute all / unmute all using host lock logic.
- Stop all videos / allow videos using host lock logic.

### Recording and Session Artifacts
- In-room recording controls for host.
- Recording status indicators during session.
- Recording list and playback from panel.
- Time-bound recording retention notice.

## Design Layout Used In EduMeet

### Visual Direction
- Glassmorphism-inspired panels with translucent surfaces.
- Layered gradients and radial highlights for depth.
- Accent-based controls for key media actions.
- High-contrast dark and light themes.
- Rounded components and soft elevation shadows.

### Desktop Layout (Laptop/Desktop)
- Sticky top information bar.
- Top bar includes room title, status chips, participant count, network quality, room code copy, meeting type, and security chips.
- Main content split uses left stage/video area and right side panel.
- Stage modes include speaker mode with spotlight and participant strip.
- Stage modes include gallery mode grid for multi-participant view.
- Whiteboard tab as alternate main stage content.
- Floating bottom dock for media and host controls.

### Mobile and Tablet Layout
- Full-viewport no-scroll meeting shell.
- Bottom floating control dock optimized for thumb reach.
- Swipeable bottom sheet for panel tabs and content.
- Mobile full-view overlay for focused participant viewing.
- Tap-to-show controls in full-view mode.
- Compact interaction targets sized for mobile ergonomics.

### Side Panel Information Architecture
- Tab set includes Chat, People, Polls, Files, Recordings, and Breakout.
- Badge indicators for unread chat and waiting room counts.
- Empty states for each tab with contextual guidance.
- Card-based item presentation for panel content.

### Tile and Stage Behavior
- Remote tiles show name, mic state, hand raise, active speaker, and pin state.
- Hover controls for pin/full-view on larger screens.
- Spotlight stage prioritizes pinned user or screen-share owner.
- Participant strip supports horizontal overflow scrolling.

### Reliability and UX Stability Notes
- Hook ordering and stream memo usage are stabilized to prevent runtime TDZ issues.
- Screen share distribution is propagated to all active peers.
- Local and remote media state stays synchronized with host lock enforcement.
- Responsive behavior spans mobile, tablet, and desktop breakpoints.

### Quick Summary
EduMeet currently uses a modern classroom layout: sticky smart header, adaptive stage, contextual side panel, and floating media dock. The feature set covers full live class delivery and moderation across desktop and mobile.