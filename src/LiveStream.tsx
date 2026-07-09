import { useEffect, useRef } from 'react';

/**
 * Desk-cam feed. The element is never shown directly — CrtTv samples it into a
 * WebGL texture and composites it under the UI raster. Native HLS on Safari,
 * hls.js (lazy-loaded) everywhere else; plain <video> handles MP4 URLs.
 * While the stream is offline it retries every 15s, so going live needs no reload.
 */
export function LiveStream({ url, onLiveChange }: { url: string; onLiveChange: (live: boolean) => void }) {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		let disposed = false;
		let retryTimer = 0;
		let hls: import('hls.js').default | undefined;

		const retry = () => {
			window.clearTimeout(retryTimer);
			retryTimer = window.setTimeout(start, 15000);
		};

		async function start() {
			if (disposed || !video) return;
			hls?.destroy();
			if (/\.m3u8(\?|$)/.test(url) && !video.canPlayType('application/vnd.apple.mpegurl')) {
				const { default: Hls } = await import('hls.js');
				if (disposed || !Hls.isSupported()) return;
				hls = new Hls();
				// ponytail: any fatal error = full restart in 15s; per-type recovery if reconnects get janky
				hls.on(Hls.Events.ERROR, (_event, data) => {
					if (data.fatal) retry();
				});
				hls.loadSource(url);
				hls.attachMedia(video);
			} else {
				video.src = url;
				video.load();
			}
			video.play().catch(() => { /* autoplay is allowed when muted; errors retry below */ });
		}

		const onError = () => retry();
		video.addEventListener('error', onError);
		start();

		return () => {
			disposed = true;
			window.clearTimeout(retryTimer);
			video.removeEventListener('error', onError);
			hls?.destroy();
		};
	}, [url]);

	return (
		<video
			ref={videoRef}
			className="stream-video"
			muted
			playsInline
			autoPlay
			crossOrigin="anonymous" /* WebGL texture upload taints without CORS */
			onPlaying={() => onLiveChange(true)}
			onPause={() => onLiveChange(false)}
			onEnded={() => onLiveChange(false)}
			onEmptied={() => onLiveChange(false)}
			onError={() => onLiveChange(false)}
		/>
	);
}
