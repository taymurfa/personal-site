# personal-site

A live-room personal site built with Vite, React, and TypeScript.

## Scripts

- `npm run dev`: Start the local Vite server
- `npm run typecheck`: Run TypeScript checks
- `npm run build`: Build the production site
- `npm run preview`: Preview the production build

## Environment

Set these in Vercel for the live deployment:

- `VITE_LIVE_STREAM_URL`: Public HLS/MP4 playback URL for the room camera feed
- `SPOTIFY_CLIENT_ID`: Spotify developer app client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify developer app client secret
- `SPOTIFY_REFRESH_TOKEN`: Refresh token for the Spotify account whose playback should appear

The browser only receives the normalized `/api/spotify-now-playing` response. Spotify secrets stay server-side.
