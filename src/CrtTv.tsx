import { Component, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getFontEmbedCSS, toCanvas } from 'html-to-image';

// ponytail: minimal boundary — browsers without WebGL lose the 3D, not the app
class GLBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}

const BEZEL = 44; // px of CRT plastic hugging the window edges
const CORNER = 40; // screen-opening corner radius
const UI_W = 1120; // ui-source layout width; height follows screen aspect
const RASTER_SCALE = 1.5; // ponytail: 2x doubled snapshot cost; CRT shader noise hides the difference
const FOV = 40;

type Dims = { w: number; h: number };

function useViewport(): Dims {
	const [d, setD] = useState<Dims>({ w: window.innerWidth, h: window.innerHeight });
	useEffect(() => {
		const onResize = () => setD({ w: window.innerWidth, h: window.innerHeight });
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);
	return d;
}

/** Curved screen filling the window interior; 1 world unit = 1 px. */
function useScreenGeometry(sw: number, sh: number) {
	return useMemo(() => {
		const geo = new THREE.PlaneGeometry(sw, sh, 48, 36);
		const pos = geo.attributes.position;
		const bulge = Math.min(sw, sh) * 0.045;
		for (let i = 0; i < pos.count; i++) {
			const nx = pos.getX(i) / (sw / 2);
			const ny = pos.getY(i) / (sh / 2);
			pos.setZ(i, bulge * (1 - 0.6 * nx * nx) * (1 - 0.6 * ny * ny));
		}
		geo.computeVertexNormals();
		return geo;
	}, [sw, sh]);
}

/** Bezel: extruded frame between the window bounds and the rounded screen opening. */
function useBezelGeometry(w: number, h: number) {
	return useMemo(() => {
		const outer = new THREE.Shape();
		const r = 14;
		outer.moveTo(-w / 2 + r, -h / 2);
		outer.lineTo(w / 2 - r, -h / 2);
		outer.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
		outer.lineTo(w / 2, h / 2 - r);
		outer.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
		outer.lineTo(-w / 2 + r, h / 2);
		outer.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
		outer.lineTo(-w / 2, -h / 2 + r);
		outer.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

		const iw = w / 2 - BEZEL;
		const ih = h / 2 - BEZEL;
		const c = CORNER;
		const hole = new THREE.Path();
		hole.moveTo(-iw + c, -ih);
		hole.lineTo(iw - c, -ih);
		hole.quadraticCurveTo(iw, -ih, iw, -ih + c);
		hole.lineTo(iw, ih - c);
		hole.quadraticCurveTo(iw, ih, iw - c, ih);
		hole.lineTo(-iw + c, ih);
		hole.quadraticCurveTo(-iw, ih, -iw, ih - c);
		hole.lineTo(-iw, -ih + c);
		hole.quadraticCurveTo(-iw, -ih, -iw + c, -ih);
		outer.holes.push(hole);

		const geo = new THREE.ExtrudeGeometry(outer, {
			depth: 26,
			bevelEnabled: true,
			bevelThickness: 16,
			bevelSize: 12,
			bevelSegments: 4,
		});
		geo.computeVertexNormals();
		return geo;
	}, [w, h]);
}

/**
 * UI raster → texture. GPU-side effects (scanlines, tracking, flicker, glare,
 * cursor, vignette) live in the screen shader; the texture only re-uploads when
 * the DOM actually changed, so pointer motion costs nothing.
 */
function useUiTexture(uiRef: React.RefObject<HTMLDivElement>, uiH: number, onFirstRaster?: () => void) {
	const display = useMemo(() => document.createElement('canvas'), []);
	const texture = useMemo(() => {
		const t = new THREE.CanvasTexture(display);
		t.colorSpace = THREE.SRGBColorSpace;
		t.anisotropy = 4;
		return t;
	}, [display]);
	const rendering = useRef(false);
	const queued = useRef(false);
	const fontCss = useRef<string | undefined>(undefined);
	const avgColor = useRef({ r: 0.06, g: 0.06, b: 0.07, lum: 0.06 });
	const probe = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = 1;
		c.height = 1;
		return c;
	}, []);

	useEffect(() => {
		display.width = UI_W * RASTER_SCALE;
		display.height = Math.round(uiH) * RASTER_SCALE;
		// keep alpha: transparent DOM regions let the live video show through in the shader
		display.getContext('2d')!.clearRect(0, 0, display.width, display.height);
		texture.needsUpdate = true;
	}, [display, texture, uiH]);

	const rasterize = useMemo(() => () => {
		const run = async () => {
			if (!uiRef.current || document.hidden) return;
			if (rendering.current) { queued.current = true; return; }
			rendering.current = true;
			try {
				if (fontCss.current === undefined) {
					fontCss.current = await getFontEmbedCSS(uiRef.current);
				}
				const bitmap = await toCanvas(uiRef.current, {
					pixelRatio: RASTER_SCALE,
					style: { animation: 'none', transition: 'none' },
					filter: (node) => !(node instanceof HTMLVideoElement),
					fontEmbedCSS: fontCss.current,
				});
				const ctx = display.getContext('2d')!;
				ctx.clearRect(0, 0, display.width, display.height);
				ctx.drawImage(bitmap, 0, 0, display.width, display.height);
				texture.needsUpdate = true;
				if (onFirstRaster) { onFirstRaster(); }
				const pctx = probe.getContext('2d', { willReadFrequently: true })!;
				pctx.drawImage(display, 0, 0, 1, 1);
				const [r, g, b] = pctx.getImageData(0, 0, 1, 1).data;
				avgColor.current = { r: r / 255, g: g / 255, b: b / 255, lum: (r * 0.3 + g * 0.5 + b * 0.2) / 255 };
			} catch { /* keep last frame */ }
			rendering.current = false;
			if (queued.current) { queued.current = false; rasterize(); }
		};
		void run();
	}, [uiRef, display, texture, onFirstRaster, probe]);

	useEffect(() => {
		let alive = true;
		document.fonts.ready.then(() => { if (alive) rasterize(); });
		const root = uiRef.current;
		let debounce = 0;
		const observer = new MutationObserver(() => {
			window.clearTimeout(debounce);
			debounce = window.setTimeout(rasterize, 30);
		});
		// no style-attribute observation: inline-style effects would re-raster on every pointer move
		if (root) observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'src'] });
		return () => {
			alive = false;
			observer.disconnect();
			window.clearTimeout(debounce);
		};
	}, [rasterize, uiRef]);

	return { texture, rasterize, avgColor };
}

const SCREEN_FRAG = `
uniform sampler2D uTex;
uniform sampler2D uVideo;  // live desk-cam feed, composited under the UI
uniform float uVideoOn;
uniform vec2 uVideoScale;  // uv crop for object-fit: cover
uniform float uTime;
uniform vec2 uCursor;    // uv
uniform float uCursorOn;
uniform float uFlipStart; // channel-change static burst
uniform vec2 uRes;       // screen px
varying vec2 vUv;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
	vec2 uv = vUv;
	float since = uTime - uFlipStart;
	float flip = 1.0 - smoothstep(0.0, 0.38, since);
	if (flip > 0.0) {
		// horizontal line jitter during the burst
		float line = floor(uv.y * uRes.y / 3.0);
		uv.x += (hash(vec2(line, floor(uTime * 60.0))) - 0.5) * 0.06 * flip;
	}
	vec4 t = texture2D(uTex, uv);
	vec3 base = vec3(0.0);
	if (uVideoOn > 0.5) {
		vec2 vuv = (uv - 0.5) * uVideoScale + 0.5;

		// VHS pass, video layer only:
		// tape wobble — tiny per-scanline horizontal drift
		float vline = floor(vuv.y * uRes.y);
		vuv.x += (hash(vec2(vline, floor(uTime * 15.0))) - 0.5) * 0.0015;
		// chroma bleed — red/blue taps offset sideways
		base = vec3(
			texture2D(uVideo, vuv + vec2(0.0016, 0.0)).r,
			texture2D(uVideo, vuv).g,
			texture2D(uVideo, vuv - vec2(0.0016, 0.0)).b
		);
		// worn tape: desaturate, lift blacks, dull highlights
		base = mix(vec3(dot(base, vec3(0.299, 0.587, 0.114))), base, 0.8);
		base = base * 0.9 + 0.03;
		// grain
		base += (hash(vuv * uRes + fract(uTime) * 43.7) - 0.5) * 0.07;
	}
	vec3 c = mix(base, t.rgb, t.a);
	vec2 px = (vUv - uCursor) * uRes;
	if (flip > 0.0) {
		float n = hash(vUv * uRes * 0.5 + fract(uTime) * 100.0);
		c = mix(c, vec3(n * 0.8 + 0.08), flip * 0.85);
	}

	// scanlines
	c *= 0.955 + 0.045 * sin(vUv.y * uRes.y * 2.094);

	// tracking bar sweep (~every 9s)
	float tt = mod(uTime, 9.0);
	if (tt > 6.8) {
		float bandY = 1.0 - (tt - 6.8) / 2.2;
		float d = (vUv.y - bandY) * uRes.y / 30.0;
		c += vec3(0.09) * exp(-d * d);
		c *= 1.0 - 0.3 * exp(-(d - 0.8) * (d - 0.8));
	}

	// exposure flicker
	float f = mod(uTime, 7.0);
	if ((f > 3.1 && f < 3.17) || (f > 5.6 && f < 5.64)) c *= 0.85;

	// pointer glare + crosshair
	if (uCursorOn > 0.5) {
		float r = length(px);
		c += vec3(0.06) * exp(-r / 160.0);
		float cross = step(abs(px.x), 1.4) * step(abs(px.y), 9.0)
		            + step(abs(px.y), 1.4) * step(abs(px.x), 9.0);
		c = mix(c, vec3(1.0), clamp(cross, 0.0, 1.0));
	}

	// vignette
	vec2 v = vUv - 0.5;
	c *= 1.0 - 0.24 * smoothstep(0.32, 0.72, dot(v, v));

	gl_FragColor = vec4(c, 1.0);
}
`;

// bound to uVideo until the stream's first live frame
const BLACK_TEX = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK_TEX.needsUpdate = true;

const SCREEN_VERT = `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const TIME_FMT = new Intl.DateTimeFormat(undefined, {
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
});
const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'short' });

function formatLocalDate() {
	const now = new Date();
	return `${MONTH_FMT.format(now).toUpperCase()}.${now.getDate()} ${now.getFullYear()}`;
}

/** Camcorder OSD (REC/STBY, clock, tape speed, battery) as its own texture —
    keeps the per-second tick out of the DOM snapshot pipeline entirely.
    Laid out in UI px × S over the whole screen. */
function OsdOverlay({ sw, sh }: { sw: number; sh: number }) {
	const S = 2; // canvas oversampling for crisp glyphs
	const uiH = UI_W * (sh / sw);
	const W = Math.round(UI_W * S);
	const H = Math.round(uiH * S);
	const [onHome, setOnHome] = useState(true);

	useEffect(() => {
		const check = () => setOnHome(['', '#live'].includes(window.location.hash));
		check();
		window.addEventListener('hashchange', check);
		return () => window.removeEventListener('hashchange', check);
	}, []);
	const canvas = useMemo(() => {
		const c = document.createElement('canvas');
		c.width = W;
		c.height = H;
		return c;
	}, [W, H]);
	const texture = useMemo(() => {
		const t = new THREE.CanvasTexture(canvas);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	}, [canvas]);

	useEffect(() => {
		const white = 'rgba(255,255,255,0.92)';
		const whiteGlow = 'rgba(255,255,255,0.5)';
		const draw = () => {
			const ctx = canvas.getContext('2d')!;
			ctx.clearRect(0, 0, W, H);
			ctx.font = `${26 * S}px "VT323", monospace`;
			ctx.fillStyle = white;
			ctx.shadowColor = whiteGlow;
			ctx.shadowBlur = 6 * S;
			try { (ctx as any).letterSpacing = `${4.5 * S}px`; } catch { /* older browsers */ }

			const x0 = 58 * S;
			const recY = (uiH - 144) * S;
			const timeY = (uiH - 109) * S;
			const dateY = (uiH - 74) * S;
			ctx.fillText(TIME_FMT.format(new Date()), x0, timeY);
			ctx.fillText(formatLocalDate(), x0, dateY);

			// ● REC while the tape rolls (dot blinks on alternate seconds), STBY otherwise
			const video = document.querySelector<HTMLVideoElement>('.stream-video');
			const playing = Boolean(video && !video.paused && !video.ended);
			if (playing) {
				if (Math.floor(Date.now() / 1000) % 2 === 0) {
					ctx.fillStyle = '#ff3b30';
					ctx.shadowColor = 'rgba(255,60,40,0.7)';
					ctx.beginPath();
					ctx.arc(x0 + 7 * S, recY - 8 * S, 6 * S, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = white;
					ctx.shadowColor = whiteGlow;
				}
				ctx.fillText('REC', x0 + 24 * S, recY);
			} else {
				ctx.fillText('STBY', x0, recY);
			}

			// tape speed + battery, bottom-right
			const bx = (UI_W - 58) * S;
			ctx.textAlign = 'right';
			ctx.fillText('SP', bx - 48 * S, dateY);
			ctx.textAlign = 'left';
			const bw = 34 * S;
			const bh = 15 * S;
			const by = dateY - bh + 2 * S;
			ctx.strokeStyle = white;
			ctx.lineWidth = 1.5 * S;
			ctx.strokeRect(bx - bw, by, bw, bh);
			ctx.fillRect(bx, by + bh * 0.25, 3 * S, bh * 0.5); // terminal nub
			for (let i = 0; i < 2; i++) {
				ctx.fillRect(bx - bw + (4 + i * 10) * S, by + 3 * S, 8 * S, bh - 6 * S); // 2/3 cells: always almost dead
			}

			// scanlines so it matches the shader-treated screen — clipped to the glyphs,
			// or they'd band the transparent canvas over the live video
			ctx.shadowBlur = 0;
			ctx.globalCompositeOperation = 'source-atop';
			ctx.fillStyle = 'rgba(0,0,20,0.22)';
			for (let y = 0; y < H; y += 3 * S) ctx.fillRect(0, y, W, S);
			ctx.globalCompositeOperation = 'source-over';
			texture.needsUpdate = true;
		};
		document.fonts.ready.then(draw);
		draw();
		const id = window.setInterval(draw, 1000);
		return () => window.clearInterval(id);
	}, [canvas, texture, W, H, uiH]);

	if (!onHome) return null;
	return (
		<mesh position={[0, 0, -4]}>
			<planeGeometry args={[sw, sh]} />
			<meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
		</mesh>
	);
}

/** Caps the render loop below display refresh — 120Hz ProMotion was quadrupling GPU work for a VHS look. */
function FrameLimiter({ fps }: { fps: number }) {
	const invalidate = useThree((s) => s.invalidate);
	useEffect(() => {
		let raf = 0;
		let last = 0;
		const loop = (t: number) => {
			raf = requestAnimationFrame(loop);
			if (t - last >= 1000 / fps) {
				last = t;
				invalidate();
			}
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [invalidate, fps]);
	return null;
}

function Scene({ uiRef, dims, onFirstRaster, flipRef }: { uiRef: React.RefObject<HTMLDivElement>; dims: Dims; onFirstRaster: () => void; flipRef: React.MutableRefObject<(() => void) | null> }) {
	const { camera } = useThree();
	const sw = dims.w - 2 * BEZEL;
	const sh = dims.h - 2 * BEZEL;
	const uiH = UI_W * (sh / sw);
	const screen = useScreenGeometry(sw, sh);
	const bezel = useBezelGeometry(dims.w, dims.h);
	const { texture, rasterize, avgColor } = useUiTexture(uiRef, uiH, onFirstRaster);

	const material = useMemo(() => new THREE.ShaderMaterial({
		uniforms: {
			uTex: { value: texture },
			uVideo: { value: BLACK_TEX },
			uVideoOn: { value: 0 },
			uVideoScale: { value: new THREE.Vector2(1, 1) },
			uTime: { value: 0 },
			uCursor: { value: new THREE.Vector2(0.5, 0.5) },
			uCursorOn: { value: 0 },
			uFlipStart: { value: -10 },
			uRes: { value: new THREE.Vector2(sw, sh) },
		},
		vertexShader: SCREEN_VERT,
		fragmentShader: SCREEN_FRAG,
	}), [texture, sw, sh]);

	const clockRef = useRef(0);
	const spill = useRef<THREE.PointLight>(null);
	const videoState = useRef<{ el: HTMLVideoElement | null; tex: THREE.VideoTexture | null }>({ el: null, tex: null });

	useEffect(() => {
		flipRef.current = () => { material.uniforms.uFlipStart.value = clockRef.current; };
		return () => { flipRef.current = null; };
	}, [material, flipRef]);
	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		clockRef.current = t;
		material.uniforms.uTime.value = t;

		// live desk cam: sample the hidden <video> into the shader's base layer
		const vs = videoState.current;
		if (!vs.el) vs.el = document.querySelector<HTMLVideoElement>('.stream-video');
		const video = vs.el;
		const live = Boolean(video && !video.paused && video.readyState >= 3 && video.videoWidth);
		if (live && video) {
			if (!vs.tex) {
				vs.tex = new THREE.VideoTexture(video);
				vs.tex.colorSpace = THREE.SRGBColorSpace;
			}
			if (material.uniforms.uVideo.value !== vs.tex) material.uniforms.uVideo.value = vs.tex; // material is remade on resize
			const va = video.videoWidth / video.videoHeight;
			const sa = sw / sh;
			// cover: crop the longer axis
			if (va > sa) material.uniforms.uVideoScale.value.set(sa / va, 1);
			else material.uniforms.uVideoScale.value.set(1, va / sa);
		}
		material.uniforms.uVideoOn.value = live ? 1 : 0;

		// ponytail: bezel spill only tracks the UI raster; sample the video into the probe if the bezel should glow with the footage
		if (spill.current) {
			const { r, g, b, lum } = avgColor.current;
			// mirror the shader: exposure dips + channel-flip static burst
			const f = t % 7;
			const dip = (f > 3.1 && f < 3.17) || (f > 5.6 && f < 5.64) ? 0.7 : 1;
			const since = t - material.uniforms.uFlipStart.value;
			const flip = since >= 0 && since < 0.38 ? 1 - since / 0.38 : 0;
			const burst = flip > 0 ? flip * (1.6 + Math.sin(t * 173.0) * 0.5) : 0;
			const intensity = (0.35 + lum * 3.2) * dip + burst;
			spill.current.intensity = intensity;
			// static is white; otherwise tint by content
			spill.current.color.setRGB(
				Math.min(1, r * 1.4 + burst),
				Math.min(1, g * 1.4 + burst),
				Math.min(1, b * 1.5 + burst)
			);
		}
	});

	// pixel-true camera: 1 world unit = 1 px at z=0
	useEffect(() => {
		const cam = camera as THREE.PerspectiveCamera;
		cam.fov = FOV;
		cam.near = 10;
		cam.far = 20000;
		cam.position.set(0, 0, dims.h / (2 * Math.tan((FOV * Math.PI) / 360)));
		cam.updateProjectionMatrix();
	}, [camera, dims]);

	const uvToUi = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
		if (!e.uv) return null;
		return { x: e.uv.x * UI_W, y: (1 - e.uv.y) * uiH };
	};

	const uiElementAt = (p: { x: number; y: number }) => {
		const root = uiRef.current;
		if (!root) return null;
		const s = parseFloat(root.dataset.scale || '1');
		const cvs = document.querySelector<HTMLElement>('.tv-canvas');
		const prev = cvs?.style.pointerEvents ?? '';
		if (cvs) cvs.style.pointerEvents = 'none';
		const el = document.elementFromPoint(p.x * s, p.y * s);
		if (cvs) cvs.style.pointerEvents = prev;
		return el;
	};

	// hover highlight: tag the clickable under the cursor; the MutationObserver re-rasterizes
	const hoverEl = useRef<HTMLElement | null>(null);
	const setHover = (el: HTMLElement | null) => {
		if (el === hoverEl.current) return;
		hoverEl.current?.classList.remove('is-hover');
		el?.classList.add('is-hover');
		hoverEl.current = el;
	};

	const onMove = (e: ThreeEvent<PointerEvent>) => {
		if (!e.uv) return;
		material.uniforms.uCursor.value.set(e.uv.x, e.uv.y);
		material.uniforms.uCursorOn.value = 1;
		const p = uvToUi(e);
		if (!p) return;
		setHover((uiElementAt(p)?.closest('a, button') as HTMLElement | null) ?? null);
		const pressed = (e.buttons & 1) === 1;
		if (pressed && !drag.current.active) {
			const parts = scrollParts();
			if (parts) {
				drag.current = {
					active: true,
					startY: p.y,
					startOffset: parseFloat(parts.inner.dataset.offset || '0'),
					moved: false,
				};
			}
		} else if (!pressed && drag.current.active) {
			drag.current.active = false;
		} else if (pressed) {
			onDragMove(p);
		}
	};

	// click-and-drag scrolling of the content panel
	const drag = useRef({ active: false, startY: 0, startOffset: 0, moved: false });

	// scroll snapshots at most every 80ms, with a trailing run so the final position lands
	const scrollRaster = useMemo(() => {
		let last = 0;
		let timer = 0;
		return () => {
			const wait = 80 - (performance.now() - last);
			if (wait <= 0) {
				last = performance.now();
				rasterize();
			} else {
				window.clearTimeout(timer);
				timer = window.setTimeout(() => {
					last = performance.now();
					rasterize();
				}, wait);
			}
		};
	}, [rasterize]);

	const scrollParts = () => {
		const root = uiRef.current;
		const area = root?.querySelector<HTMLElement>('.page-content-area') ?? null;
		const inner = area?.querySelector<HTMLElement>('.page-scroll') ?? null;
		return area && inner ? { area, inner } : null;
	};

	const endDrag = () => { drag.current.active = false; };

	const onDragMove = (p: { x: number; y: number }) => {
		if (!drag.current.active) return;
		const parts = scrollParts();
		if (!parts) return;
		const delta = p.y - drag.current.startY;
		if (Math.abs(delta) > 6) drag.current.moved = true;
		const max = Math.max(0, parts.inner.scrollHeight - parts.area.clientHeight);
		const next = Math.min(max, Math.max(0, drag.current.startOffset - delta));
		if (parseFloat(parts.inner.dataset.offset || '0') === next) return;
		parts.inner.dataset.offset = String(next);
		parts.inner.style.transform = `translateY(${-next}px)`;
		scrollRaster();
	};

	const onWheel = (e: ThreeEvent<WheelEvent>) => {
		const parts = scrollParts();
		if (!parts) return;
		const max = Math.max(0, parts.inner.scrollHeight - parts.area.clientHeight);
		const cur = parseFloat(parts.inner.dataset.offset || '0');
		const next = Math.min(max, Math.max(0, cur + e.deltaY));
		if (next === cur) return;
		parts.inner.dataset.offset = String(next);
		parts.inner.style.transform = `translateY(${-next}px)`;
		scrollRaster();
	};

	const onClick = (e: ThreeEvent<MouseEvent>) => {
		if (drag.current.moved) { drag.current.moved = false; return; }
		const p = uvToUi(e);
		if (!p) return;
		const el = uiElementAt(p);
		const clickable = el?.closest('a, button') as HTMLElement | null;
		if (clickable instanceof HTMLAnchorElement && clickable.target === '_blank') {
			// open inside the real (trusted) click handler so popup blockers allow it
			window.open(clickable.href, '_blank', 'noopener');
			return;
		}
		const closesViaOverlay = el instanceof HTMLElement && el.classList.contains('room-overlay');
		if (closesViaOverlay || (clickable instanceof HTMLAnchorElement && clickable.hash)) {
			// channel-change static burst masks the re-raster latency
			material.uniforms.uFlipStart.value = clockRef.current;
		}
		(clickable ?? (el as HTMLElement | null))?.click();
		// capture right after React commits, then again for late content
		requestAnimationFrame(() => rasterize());
		window.setTimeout(rasterize, 150);
		window.setTimeout(rasterize, 600);
	};

	return (
		<>
			<mesh
				geometry={screen}
				material={material}
				position={[0, 0, -Math.min(sw, sh) * 0.045 - 6]}
				onPointerMove={onMove}
				onPointerOut={() => { material.uniforms.uCursorOn.value = 0; endDrag(); setHover(null); }}
				onWheel={onWheel}
				onClick={onClick}
			/>
			<OsdOverlay sw={sw} sh={sh} />
			{/* decay=0: with 1 unit = 1 px, physical falloff killed the light before it reached the bezel */}
			<pointLight ref={spill} position={[0, 0, 60]} distance={Math.max(sw, sh) * 1.4} decay={0} />
			<mesh geometry={bezel} position={[0, 0, -42]}>
				<meshStandardMaterial color="#17171b" roughness={0.62} metalness={0.08} />
			</mesh>
		</>
	);
}

// after the Blair Witch sigil: vertical stake, bound crossbar, crossed legs
const FIGURE_PATHS = (
	<>
		<path d="M50 4 L50 58" strokeWidth="5" />
		<path d="M15 40 Q50 34 85 40" strokeWidth="5" />
		<path d="M13 33 L19 47" strokeWidth="4" />
		<path d="M87 33 L81 47" strokeWidth="4" />
		<path d="M63 26 Q52 60 26 122" strokeWidth="6" />
		<path d="M37 26 Q48 60 74 122" strokeWidth="6" />
		<path d="M44 44 L56 52" strokeWidth="3.5" />
		<path d="M56 44 L44 52" strokeWidth="3.5" />
		<path d="M24 116 L20 126" strokeWidth="4" />
		<path d="M76 116 L80 126" strokeWidth="4" />
	</>
);

function BootScreen({ progress, done }: { progress: number; done: boolean }) {
	const H = 140;
	const fillTop = H * (1 - progress);
	return (
		<div className={`boot-screen ${done ? 'boot-done' : ''}`} aria-hidden="true">
			<div className="boot-figure">
				<svg viewBox="0 0 100 140">
					<g stroke="#4a0503" strokeLinecap="round" fill="none">
						{FIGURE_PATHS}
					</g>
					<clipPath id="boot-fill">
						<rect x="0" y={fillTop} width="100" height={H - fillTop} />
					</clipPath>
					<g stroke="#e01008" strokeLinecap="round" fill="none" clipPath="url(#boot-fill)">
						{FIGURE_PATHS}
					</g>
				</svg>
			</div>
			<p className="boot-title">The Taymur Project</p>
		</div>
	);
}

export function CrtTv({ children }: { children: ReactNode }) {
	const uiRef = useRef<HTMLDivElement>(null);
	const dims = useViewport();
	const [bootProgress, setBootProgress] = useState(0);
	const [bootDone, setBootDone] = useState(false);
	const [bootGone, setBootGone] = useState(false);
	const readyRef = useRef(false);
	const flipRef = useRef<(() => void) | null>(null);

	const onFirstRaster = useMemo(() => () => { readyRef.current = true; }, []);

	useEffect(() => {
		const start = performance.now();
		let raf = 0;
		let finished = false;

		// smooth fill (rAF, purely cosmetic)
		const tick = () => {
			if (finished) return;
			const elapsed = performance.now() - start;
			const target = readyRef.current ? 1 : Math.min(0.8, elapsed / 1800);
			setBootProgress((p) => p + (target - p) * 0.08);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		// completion on timers — immune to rAF throttling/suspension
		const check = window.setInterval(() => {
			const elapsed = performance.now() - start;
			if ((readyRef.current && elapsed > 1900) || elapsed > 6000) {
				finished = true;
				window.clearInterval(check);
				setBootProgress(1);
				setBootDone(true); // card glitches
				window.setTimeout(() => {
					flipRef.current?.(); // tube erupts in static as the card cuts out
					setBootGone(true);
				}, 260);
			}
		}, 200);

		return () => {
			cancelAnimationFrame(raf);
			window.clearInterval(check);
		};
	}, []);
	const sw = dims.w - 2 * BEZEL;
	const sh = dims.h - 2 * BEZEL;
	const uiH = Math.round(UI_W * (sh / sw));

	useEffect(() => {
		const el = uiRef.current;
		if (!el) return;
		el.style.height = `${uiH}px`;
		const s = Math.min(dims.w / UI_W, dims.h / uiH, 1);
		el.style.transform = `scale(${s})`;
		el.dataset.scale = String(s);
	}, [dims, uiH]);

	return (
		<>
			<div className="ui-source" ref={uiRef}>
				{children}
			</div>
			<GLBoundary fallback={null}>
				<Canvas className="tv-canvas" frameloop="demand" gl={{ antialias: false, powerPreference: 'high-performance' }} dpr={[1, 1.5]}>
					<FrameLimiter fps={48} />
					<color attach="background" args={['#08080e']} />
					{/* dimmer fixed lights so the content-driven spill visibly moves the bezel */}
					<ambientLight intensity={0.35} />
					<directionalLight position={[0.4, 1, 0.8]} intensity={0.7} />
					<directionalLight position={[-0.6, -0.3, 0.5]} intensity={0.4} color="#8090ff" />
					<Scene uiRef={uiRef} dims={dims} onFirstRaster={onFirstRaster} flipRef={flipRef} />
				</Canvas>
			</GLBoundary>
			{!bootGone && <BootScreen progress={bootProgress} done={bootDone} />}
		</>
	);
}
