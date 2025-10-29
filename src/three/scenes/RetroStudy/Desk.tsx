import { useMemo } from 'react';
import * as THREE from 'three';

export function Desk() {
	// Create wood texture
	const woodMaterial = useMemo(() => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		// Base wood color - dark walnut
		const baseColor = '#3a2817';
		ctx.fillStyle = baseColor;
		ctx.fillRect(0, 0, 512, 512);

		// Wood grain lines
		for (let i = 0; i < 100; i++) {
			const x = Math.random() * 512;
			const y = 0;
			const height = 512;
			const width = Math.random() * 3 + 1;

			const gradient = ctx.createLinearGradient(x, y, x + width, y);
			gradient.addColorStop(0, `rgba(20, 10, 5, ${Math.random() * 0.3})`);
			gradient.addColorStop(0.5, `rgba(60, 40, 20, ${Math.random() * 0.2})`);
			gradient.addColorStop(1, `rgba(20, 10, 5, ${Math.random() * 0.3})`);

			ctx.fillStyle = gradient;
			ctx.fillRect(x, y, width, height);
		}

		// Add some knots and imperfections
		for (let i = 0; i < 10; i++) {
			const x = Math.random() * 512;
			const y = Math.random() * 512;
			const radius = Math.random() * 20 + 10;

			const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
			gradient.addColorStop(0, 'rgba(20, 10, 5, 0.4)');
			gradient.addColorStop(1, 'rgba(20, 10, 5, 0)');

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(2, 1);

		return new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 0.6,
			metalness: 0.1,
			color: '#3a2817',
		});
	}, []);

	return (
		<group>
			{/* Desk top */}
			<mesh position={[0, -0.7, 0]} receiveShadow castShadow>
				<boxGeometry args={[3, 0.08, 1.8]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Front left leg */}
			<mesh position={[-1.3, -1.3, 0.7]} castShadow>
				<boxGeometry args={[0.08, 1.2, 0.08]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Front right leg */}
			<mesh position={[1.3, -1.3, 0.7]} castShadow>
				<boxGeometry args={[0.08, 1.2, 0.08]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Back left leg */}
			<mesh position={[-1.3, -1.3, -0.7]} castShadow>
				<boxGeometry args={[0.08, 1.2, 0.08]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Back right leg */}
			<mesh position={[1.3, -1.3, -0.7]} castShadow>
				<boxGeometry args={[0.08, 1.2, 0.08]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Support beams */}
			<mesh position={[0, -1.3, 0.7]} castShadow>
				<boxGeometry args={[2.6, 0.06, 0.06]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			<mesh position={[0, -1.3, -0.7]} castShadow>
				<boxGeometry args={[2.6, 0.06, 0.06]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Side drawer (cosmetic) */}
			<mesh position={[-1.0, -0.9, 0.5]} castShadow receiveShadow>
				<boxGeometry args={[0.6, 0.3, 0.7]} />
				<primitive object={woodMaterial} attach="material" />
			</mesh>

			{/* Drawer handle */}
			<mesh position={[-0.68, -0.9, 0.87]}>
				<boxGeometry args={[0.15, 0.03, 0.03]} />
				<meshStandardMaterial color="#8a7a65" metalness={0.7} roughness={0.3} />
			</mesh>
		</group>
	);
}
