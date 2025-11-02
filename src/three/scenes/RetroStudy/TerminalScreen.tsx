import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TerminalScreenProps {
	isHighlighted?: boolean;
	width?: number;
	height?: number;
	offset?: number; // how far in front of the target surface along its normal
	bootSignal?: number | null;
	onTextureReady?: (texture: THREE.Texture) => void; // Callback to expose the terminal texture
	renderToTexture?: boolean; // If true, only provides texture without rendering visible mesh
}

export function TerminalScreen({
	isHighlighted = false,
	width = 0.8,
	height = 0.6,
	offset = 0.012,
	bootSignal = null,
	onTextureReady,
	renderToTexture = false,
}: TerminalScreenProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const powerOnProgress = useRef(0);
	const typingClock = useRef(0);
	const visibleCharsRef = useRef(0);
	const [visibleChars, setVisibleChars] = useState(0);
	const bootActiveRef = useRef(false);

	// Terminal text content
const terminalText = useMemo(
		() =>
			[
				'C:\\> INIT PORTFOLIO.SYS',
				'',
				'Loading database...',
				'',
				'[==============================] 100%',
				'',
				'System initialized successfully.',
				'',
				'+--------------------------------------+',
				'|                                      |',
				'|     Welcome to Taymur Faruqui\'s     |',
				'|             Portfolio!               |',
				'|                                      |',
				'+--------------------------------------+',
				'',
				'Click to enter!',
				'',
				'C:\\> _',
			].join('\n'),
		[]
	);

const totalCharacters = useMemo(() => terminalText.length, [terminalText]);
	const textLines = useMemo(() => terminalText.split('\n'), [terminalText]);

	// Create canvas texture with terminal text
	const canvasBundle = useMemo(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 2048;
		canvas.height = 1536;
		const ctx = canvas.getContext('2d')!;
		ctx.textBaseline = 'top';

		const texture = new THREE.CanvasTexture(canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;

		return { canvas, ctx, texture };
	}, []);

	// Expose the texture via callback when ready
	useEffect(() => {
		if (onTextureReady && canvasBundle.texture) {
			onTextureReady(canvasBundle.texture);
		}
	}, [canvasBundle.texture, onTextureReady]);

	const renderScreen = useCallback(
		(charsToShow: number, boot: number, elapsed: number, highlight: boolean) => {
			const { canvas, ctx, texture } = canvasBundle;
			const lineHeight = 112;

			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.fillStyle = '#030403';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.font = '900 64px "Courier New", monospace';
			ctx.textBaseline = 'top';
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';

			const globalFade = THREE.MathUtils.smoothstep(0, 0.75, boot);
			// Start revealing the terminal content earlier so the typing is clearly visible
			const imageReveal = THREE.MathUtils.smoothstep(0.18, 0.6, boot);

			const maxLineWidth = textLines.reduce(
				(max, line) => Math.max(max, ctx.measureText(line).width),
				0
			);
			const totalHeight = textLines.length * lineHeight;
			const marginX = Math.max(16, Math.floor((canvas.width - maxLineWidth) / 2) - 36);
			const marginY = Math.floor((canvas.height - totalHeight) / 2);

			let remaining = charsToShow;
			let cursorLine = 0;
			let cursorChar = 0;

			if (remaining <= 0) {
				cursorLine = 0;
				cursorChar = 0;
			}

			// Keep slight collapse for boot flash but never squish text completely flat
			const collapse = THREE.MathUtils.lerp(0.55, 1, imageReveal);

			ctx.save();
			ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
			ctx.scale(1, collapse);
			ctx.translate(-canvas.width * 0.5, -canvas.height * 0.5);

			ctx.globalAlpha = THREE.MathUtils.lerp(0.85, 1, imageReveal);
			ctx.fillStyle = highlight ? '#6cff9c' : '#00ff00';
			ctx.shadowColor = highlight ? '#4cff9a' : 'rgba(0,0,0,0)';
			ctx.shadowBlur = highlight ? 10 : 0;

			textLines.forEach((line, index) => {
				if (remaining <= 0) {
					return;
				}

				const take = Math.min(line.length, remaining);
				const visibleSlice = line.slice(0, take);
				ctx.fillText(visibleSlice, marginX, marginY + index * lineHeight);
				remaining -= take;

				if (remaining > 0) {
					remaining -= 1; // account for newline character
					cursorLine = index + 1;
					cursorChar = 0;
				} else {
					cursorLine = index;
					cursorChar = take;
				}
			});

			// Draw blinking-style cursor only after boot completes and typing not finished
			if (boot >= 1.0 && charsToShow < totalCharacters) {
				const targetLine = Math.min(cursorLine, textLines.length - 1);
				const line = textLines[targetLine] ?? '';
				const cursorOffset = ctx.measureText(line.slice(0, cursorChar)).width;
				const cursorX = marginX + cursorOffset;
				const cursorY = marginY + targetLine * lineHeight;
				const cursorHeight = 48;
				ctx.fillRect(cursorX, cursorY + cursorHeight + 8, 32, 8);
			}

			ctx.restore();

			// Additional fade overlay while booting
			if (globalFade < 1) {
				ctx.save();
				const overlayProgress = 1 - globalFade;
				// Ease the fade and keep it translucent so the boot sequence stays visible
				ctx.globalAlpha = Math.pow(overlayProgress, 1.5) * 0.25;
				// Slight green tint instead of pure black to avoid masking the animation
				const gradient = ctx.createRadialGradient(
					canvas.width * 0.5,
					canvas.height * 0.45,
					0,
					canvas.width * 0.5,
					canvas.height * 0.5,
					canvas.height * 0.85
				);
				gradient.addColorStop(0, '#04170a');
				gradient.addColorStop(0.6, '#031108');
				gradient.addColorStop(1, '#020805');
				ctx.fillStyle = gradient;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.restore();
			}

			// Power-on horizontal beam sweep
			if (boot < 0.6) {
				const flashProgress = THREE.MathUtils.smoothstep(0, 0.6, boot);
				const beamAlpha = (1 - flashProgress) * 0.8;
				if (beamAlpha > 0.01) {
					const beamWidth = canvas.width; // Full width
					const beamX = 0;
					// Expand from thin line, then fade (reduced max expansion)
					const beamHeight = canvas.height * THREE.MathUtils.lerp(0.003, 0.15, flashProgress);
					const beamCenter = canvas.height * 0.5;
					const gradient = ctx.createLinearGradient(0, beamCenter - beamHeight, 0, beamCenter + beamHeight);
					gradient.addColorStop(0, 'rgba(120, 255, 200, 0)');
					gradient.addColorStop(0.5, `rgba(180, 255, 210, ${beamAlpha})`);
					gradient.addColorStop(1, 'rgba(120, 255, 200, 0)');
					ctx.save();
					ctx.globalCompositeOperation = 'lighter';
					ctx.fillStyle = gradient;
					ctx.fillRect(beamX, beamCenter - beamHeight, beamWidth, beamHeight * 2);
					ctx.restore();
				}
			}

			// Slight flicker variation tied to boot state and elapsed time
			const flickerStrength = highlight ? 0.02 : 0.01;
			const flicker = (Math.sin(elapsed * 6.3) + Math.sin(elapsed * 13.7)) * 0.5 * flickerStrength * globalFade;
			if (flicker > 0) {
				ctx.save();
				ctx.globalAlpha = flicker;
				ctx.fillStyle = 'rgba(140, 255, 160, 0.08)';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.restore();
			}

			// Overlay subtle scanlines to keep CRT feel when mapped onto the original screen
			ctx.save();
			ctx.globalAlpha = 0.04 * globalFade;
			ctx.fillStyle = '#001000';
			for (let y = 0; y < canvas.height; y += 6) {
				ctx.fillRect(0, y, canvas.width, 2);
			}
			ctx.restore();

			texture.needsUpdate = true;
		},
		[canvasBundle, textLines, totalCharacters]
	);

	// Shader material for CRT effect with scanlines and flicker
	const shaderMaterial = useMemo(
		() => ({
			uniforms: {
				tDiffuse: { value: canvasBundle.texture },
				time: { value: 0 },
				flickerIntensity: { value: 0.003 },
				scanlineIntensity: { value: 0.3 },
				brightness: { value: 1.0 },
				powerOn: { value: 0 },
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform sampler2D tDiffuse;
				uniform float time;
				uniform float flickerIntensity;
				uniform float scanlineIntensity;
				uniform float brightness;
				uniform float powerOn;
				varying vec2 vUv;

				// Random function for flicker
				float random(vec2 st) {
					return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
				}

				void main() {
					float boot = clamp(powerOn, 0.0, 1.0);
					vec2 uv = vUv;
					vec2 centered = uv - 0.5;

					// Slight CRT curvature
					float dist = length(centered);
					vec2 warpedUv = centered * (1.0 + 0.08 * dist * dist) + 0.5;

					vec4 sampled = texture2D(tDiffuse, clamp(warpedUv, 0.001, 0.999));
					vec3 phosphor = sampled.rgb;

					// Bright horizontal bar expanding from center
					float flashProgress = smoothstep(0.0, 0.5, boot);
					// Expand from thin line with reduced max expansion
					float heightFactor = mix(0.005, 0.12, flashProgress);
					float horizFlash = exp(-pow(centered.y / heightFactor, 2.0)) * (1.0 - flashProgress);
					vec3 beamColor = vec3(0.45, 1.0, 0.52) * horizFlash * 1.5;
					float beamGate = boot < 0.5 ? 1.0 : 0.0;

					// Start with beam, fade to phosphor content
					float imageReveal = smoothstep(0.18, 0.6, boot);
					vec3 color = mix(beamColor * 0.6, phosphor, imageReveal);
					color += beamColor * beamGate;

					// Scanlines & subtle flicker
					float scanline = sin(warpedUv.y * 384.0 * 2.1) * scanlineIntensity;
					color -= scanline;
					float flicker = random(vec2(time * 0.1, 0.0)) * flickerIntensity;
					color *= (1.0 - flicker);

					// Subtle vignette falloff
					float vignette = smoothstep(1.2, 0.1, dist);
					color *= vignette;

					// Global fade-in
					float globalFade = smoothstep(0.0, 0.8, boot);
					color *= globalFade;

					// Brightness & green tint
					color *= brightness;
					color.g *= 1.1;

					gl_FragColor = vec4(color, sampled.a);
				}
			`,
		}),
		[canvasBundle.texture]
	);

	const updateVisibleChars = useCallback((value: number) => {
		if (value !== visibleCharsRef.current) {
			visibleCharsRef.current = value;
			setVisibleChars(value);
		}
	}, []);

	// Animate the shader and typing animation
	useFrame(({ clock }, delta) => {
		// Update shader uniforms if material exists
		if (materialRef.current) {
			const material = materialRef.current;
			material.uniforms.time.value = clock.getElapsedTime();

			// Boost brightness when highlighted/hovered
			const targetBrightness = isHighlighted ? 1.3 : 1.0;
			material.uniforms.brightness.value = THREE.MathUtils.lerp(
				material.uniforms.brightness.value,
				targetBrightness,
				0.1
			);
		}

		// Handle typing animation (works even in texture-only mode)
		if (!bootActiveRef.current) {
			powerOnProgress.current = 0;
			if (materialRef.current) {
				materialRef.current.uniforms.powerOn.value = 0;
			}
			renderScreen(visibleCharsRef.current, 0, clock.getElapsedTime(), isHighlighted);
			return;
		}

		// Advance power-on animation
		const duration = 2.2;
		powerOnProgress.current = Math.min(1, powerOnProgress.current + delta / duration);
		if (materialRef.current) {
			materialRef.current.uniforms.powerOn.value = powerOnProgress.current;
		}

		// Only start typing after boot animation completes
		if (powerOnProgress.current >= 1.0) {
			typingClock.current += delta;
			const charsPerSecond = 52;
			const targetChars = Math.min(totalCharacters, Math.floor(typingClock.current * charsPerSecond));
			if (targetChars > visibleCharsRef.current) {
				updateVisibleChars(targetChars);
			}
		}

		renderScreen(visibleCharsRef.current, powerOnProgress.current, clock.getElapsedTime(), isHighlighted);
	});

	const resetBoot = useCallback(() => {
		powerOnProgress.current = 0;
		typingClock.current = 0;
		visibleCharsRef.current = 0;
		setVisibleChars(0);
		if (materialRef.current) {
			materialRef.current.uniforms.powerOn.value = 0;
			materialRef.current.uniforms.time.value = 0;
		}
	}, []);

	// Initialize screen in powered-off state
	useEffect(() => {
		resetBoot();
		bootActiveRef.current = false;
	}, [resetBoot]);

	useEffect(() => {
		if (bootSignal == null) return;
		resetBoot();
		bootActiveRef.current = true;
	}, [bootSignal, resetBoot]);

	// If renderToTexture is true, don't render a visible mesh - just update texture
	if (renderToTexture) {
		return null;
	}

	return (
		<mesh position={[0, 0, offset]}>
			<planeGeometry args={[width, height]} />
			<shaderMaterial ref={materialRef} attach="material" {...shaderMaterial} />
		</mesh>
	);
}
