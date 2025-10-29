import { useRef, useMemo } from 'react';
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

	// Terminal text content
	const terminalText = useMemo(() => [
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
	].join('\n'), []);

	// Create canvas texture with terminal text
	const texture = useMemo(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 384;
		const ctx = canvas.getContext('2d')!;

		// Black background
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Green text
		ctx.fillStyle = '#00ff00';
		ctx.font = 'bold 14px "Courier New", monospace';
		ctx.textBaseline = 'top';

		const lines = terminalText.split('\n');
		lines.forEach((line, i) => {
			ctx.fillText(line, 20, 20 + i * 18);
		});

		const texture = new THREE.CanvasTexture(canvas);
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		return texture;
	}, [terminalText]);

	// Shader material for CRT effect with scanlines and flicker
	const shaderMaterial = useMemo(() => ({
		uniforms: {
			tDiffuse: { value: texture },
			time: { value: 0 },
			flickerIntensity: { value: 0.03 },
			scanlineIntensity: { value: 0.15 },
			brightness: { value: 1.2 },
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
			varying vec2 vUv;

			// Random function for flicker
			float random(vec2 st) {
				return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
			}

			void main() {
				vec2 uv = vUv;

				// Slight CRT curve distortion
				vec2 center = uv - 0.5;
				float dist = length(center);
				uv = center * (1.0 + 0.1 * dist * dist) + 0.5;

				// Sample texture
				vec4 color = texture2D(tDiffuse, uv);

				// Add scanlines
				float scanline = sin(uv.y * 384.0 * 2.0) * scanlineIntensity;
				color.rgb -= scanline;

				// Add flicker effect
				float flicker = random(vec2(time * 0.1, 0.0)) * flickerIntensity;
				color.rgb *= (1.0 - flicker);

				// Vignette effect
				float vignette = smoothstep(0.7, 0.3, dist);
				color.rgb *= vignette;

				// Brightness boost for green glow
				color.rgb *= brightness;

				// Add green tint glow
				color.g *= 1.1;

				gl_FragColor = color;
			}
		`,
	}), [texture]);

	// Animate the shader
	useFrame(({ clock }) => {
		if (materialRef.current) {
			materialRef.current.uniforms.time.value = clock.getElapsedTime();
			// Boost brightness when highlighted/hovered
			const targetBrightness = isHighlighted ? 1.5 : 1.2;
			materialRef.current.uniforms.brightness.value = THREE.MathUtils.lerp(
				materialRef.current.uniforms.brightness.value,
				targetBrightness,
				0.1
			);
		}
	});

    return (
        <mesh position={[0, 0, offset]}>
            <planeGeometry args={[width, height]} />
            <shaderMaterial
                ref={materialRef}
                attach="material"
                {...shaderMaterial}
            />
        </mesh>
    );
}
