import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TerminalScreenProps {
	isHighlighted?: boolean;
	width?: number;
	height?: number;
	offset?: number; // how far in front of the target surface along its normal
}

export function TerminalScreen({ isHighlighted = false, width = 0.8, height = 0.6, offset = 0.012 }: TerminalScreenProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const powerOnProgress = useRef(0);
	const typingClock = useRef(0);
	const visibleCharsRef = useRef(0);
	const [visibleChars, setVisibleChars] = useState(0);

	// Terminal text content
	const terminalText = useMemo(
		() =>
			[
				'C:\\> DIR',
				'',
				' Volume in drive C is SYSTEM',
				' Volume Serial Number is 1A2B-3C4D',
				'',
				' Directory of C:\\DOS',
				'',
				'COMMAND  COM     47,845  01-15-1988  12:00p',
				'CONFIG   SYS        128  03-22-1989   3:14p',
				'AUTOEXEC BAT         64  03-22-1989   3:14p',
				'KERNEL   SYS     33,430  01-15-1988  12:00p',
				'',
				'        4 File(s)     81,467 bytes',
				'                  512,000 bytes free',
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
		canvas.width = 1024;
		canvas.height = 768;
		const ctx = canvas.getContext('2d')!;
		ctx.textBaseline = 'top';

		const texture = new THREE.CanvasTexture(canvas);
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;

		return { canvas, ctx, texture };
	}, []);

	const drawText = useCallback(
		(charsToShow: number) => {
			const { canvas, ctx, texture } = canvasBundle;
			const lineHeight = 32;

			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.fillStyle = '#00ff00';
			ctx.font = 'bold 28px "Courier New", monospace';

			const maxLineWidth = textLines.reduce(
				(max, line) => Math.max(max, ctx.measureText(line).width),
				0
			);
			const totalHeight = textLines.length * lineHeight;
			const marginX = Math.max(16, Math.floor((canvas.width - maxLineWidth) / 2) - 36);
			const marginY = Math.max(24, Math.floor((canvas.height - totalHeight) / 2));

			let remaining = charsToShow;
			let cursorLine = 0;
			let cursorChar = 0;

			if (remaining <= 0) {
				cursorLine = 0;
				cursorChar = 0;
			}

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

			// Draw blinking-style cursor if typing not finished
			if (charsToShow < totalCharacters) {
				const targetLine = Math.min(cursorLine, textLines.length - 1);
				const line = textLines[targetLine] ?? '';
				const cursorOffset = ctx.measureText(line.slice(0, cursorChar)).width;
				const cursorX = marginX + cursorOffset;
				const cursorY = marginY + targetLine * lineHeight;
				const cursorHeight = 24;
				ctx.fillRect(cursorX, cursorY + cursorHeight + 4, 16, 4);
			}

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
				flickerIntensity: { value: 0.03 },
				scanlineIntensity: { value: 0.15 },
				brightness: { value: 1.2 },
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

				// Random function for flicker/static
				float random(vec2 st) {
					return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
				}

				void main() {
					float boot = clamp(powerOn, 0.0, 1.0);
					vec2 uv = vUv;
					vec2 centered = uv - 0.5;

					// Collapsing beam animation (dot -> vertical -> horizontal -> full)
					float horizontalPhase = smoothstep(0.05, 0.28, boot);
					float verticalPhase = smoothstep(0.32, 0.72, boot);
					vec2 collapseScale = vec2(
						max(verticalPhase, 0.02),
						max(horizontalPhase, 0.01)
					);
					vec2 collapsed = centered * collapseScale + 0.5;

					// CRT curvature applied after collapse
					vec2 curveCenter = collapsed - 0.5;
					float dist = length(curveCenter);
					vec2 warpedUv = curveCenter * (1.0 + 0.1 * dist * dist) + 0.5;

					vec4 sampled = texture2D(tDiffuse, clamp(warpedUv, 0.001, 0.999));
					vec3 phosphor = sampled.rgb;

					// Static/noise layers fade in/out during boot
					float staticIn = smoothstep(0.1, 0.32, boot);
					float staticOut = 1.0 - smoothstep(0.55, 0.78, boot);
					float staticAmount = staticIn * staticOut;
					float staticA = random(vec2(time * 45.0 + centered.x * 220.0, centered.y * 150.0));
					float staticB = random(vec2(time * 33.0 + centered.y * 200.0, centered.x * 140.0));
					float staticNoise = clamp(staticA * 0.58 + staticB * 0.42, 0.0, 1.0);
					vec3 staticColor = mix(vec3(0.22, 0.35, 0.18), vec3(staticNoise), 0.85);

					// Bright horizontal/vertical flash like an old CRT
					float horizFlash = exp(-pow(centered.y * 160.0, 2.0)) * (1.0 - horizontalPhase);
					float vertFlash = exp(-pow(centered.x * 160.0, 2.0)) * (1.0 - verticalPhase);
					float beamFlash = (horizFlash + vertFlash) * (1.0 - boot * 0.65);
					vec3 beamColor = vec3(0.45, 1.0, 0.52) * beamFlash;
					float beamGate = 1.0 - smoothstep(0.52, 0.8, boot);

					// Blend static and phosphor based on boot progression
					float imageReveal = smoothstep(0.58, 0.9, boot);
					vec3 color = mix(staticColor, phosphor, imageReveal);
					color = mix(staticColor, color, clamp(staticAmount + imageReveal * 0.6, 0.0, 1.0));
					color = mix(beamColor + vec3(0.35), color, clamp(boot * 1.8, 0.0, 1.0));
					color += beamColor * beamGate;

					// Scanlines & subtle flicker
					float scanline = sin(warpedUv.y * 384.0 * 2.1) * scanlineIntensity;
					color -= scanline;
					float flicker = random(vec2(time * 0.1, 0.0)) * flickerIntensity;
					color *= (1.0 - flicker);

					// CRT vignette falloff
					float vignette = smoothstep(0.7, 0.3, dist);
					color *= vignette;

					// Global fade-in with a final flash
					float globalFade = smoothstep(0.04, 1.0, boot);
					color = mix(staticColor * 0.35, color, globalFade);
					color += beamColor * (1.0 - globalFade * 0.5);
					float flash = smoothstep(0.88, 1.0, boot);
					color += flash * 0.4 * color.g;

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

	useEffect(() => {
		drawText(visibleChars);
	}, [visibleChars, drawText]);

	// Animate the shader
	useFrame(({ clock }, delta) => {
		if (!materialRef.current) return;

		const material = materialRef.current;
		material.uniforms.time.value = clock.getElapsedTime();

		// Boost brightness when highlighted/hovered
		const targetBrightness = isHighlighted ? 1.5 : 1.2;
		material.uniforms.brightness.value = THREE.MathUtils.lerp(
			material.uniforms.brightness.value,
			targetBrightness,
			0.1
		);

		// Advance power-on animation
		if (powerOnProgress.current < 1) {
			const duration = 2.2;
			powerOnProgress.current = Math.min(1, powerOnProgress.current + delta / duration);
			material.uniforms.powerOn.value = powerOnProgress.current;
			if (powerOnProgress.current >= 1) {
				typingClock.current = -0.75; // slight delay before typing begins
			}
		} else {
			material.uniforms.powerOn.value = powerOnProgress.current;
			typingClock.current += delta;
			const effectiveTime = Math.max(typingClock.current, 0);
			const charsPerSecond = 52;
			const targetChars = Math.min(totalCharacters, Math.floor(effectiveTime * charsPerSecond));
			if (targetChars > visibleCharsRef.current) {
				updateVisibleChars(targetChars);
			}
		}
	});

	// Initialize screen in powered-off state
	useEffect(() => {
		powerOnProgress.current = 0;
		typingClock.current = 0;
		visibleCharsRef.current = 0;
		setVisibleChars(0);
		if (materialRef.current) {
			materialRef.current.uniforms.powerOn.value = 0;
			materialRef.current.uniforms.time.value = 0;
		}
	}, []);

	return (
		<mesh position={[0, 0, offset]}>
			<planeGeometry args={[width, height]} />
			<shaderMaterial ref={materialRef} attach="material" {...shaderMaterial} />
		</mesh>
	);
}
