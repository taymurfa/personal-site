# personal-site

A live-room personal site built with Vite, React, and TypeScript.

## Scripts

- `npm run dev`: Start the local Vite server
- `npm run typecheck`: Run TypeScript checks
- `npm run build`: Build the production site
- `npm run preview`: Preview the production build

## Live desk cam

The homepage plays `VITE_LIVE_STREAM_URL` through the CRT shader (scanlines, tracking, vignette applied to the footage). Any URL a `<video>` can play works; `.m3u8` HLS streams work in every browser via hls.js, which is lazy-loaded only when needed.

Webcam → site pipeline:

1. Push RTMP from the desk machine with OBS, or ffmpeg on macOS:
   `ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 -i "0" -c:v libx264 -preset veryfast -g 60 -f flv rtmp://<ingest-host>/<stream-key>`
2. Turn RTMP into an HLS playback URL: Cloudflare Stream Live or Mux are the low-effort managed options; [mediamtx](https://github.com/bluenviron/mediamtx) is a single self-hosted binary (RTMP in, HLS out) if you'd rather not pay.
3. Set `VITE_LIVE_STREAM_URL` to the HLS playback URL in Vercel and redeploy (the player is compiled in only when the variable is set at build time).

The playback host must send CORS headers (`Access-Control-Allow-Origin`) because the CRT samples the video into a WebGL texture — managed providers do this out of the box. When the stream is offline the site shows the ambient screen and retries every 15 s, so going live requires nothing on the site side.

## Environment

Set these in Vercel for the live deployment:

- `VITE_LIVE_STREAM_URL`: Public HLS/MP4 playback URL for the room camera feed
- `SPOTIFY_CLIENT_ID`: Spotify developer app client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify developer app client secret
- `SPOTIFY_REFRESH_TOKEN`: Refresh token for the Spotify account whose playback should appear

The browser only receives the normalized `/api/spotify-now-playing` response. Spotify secrets stay server-side.
