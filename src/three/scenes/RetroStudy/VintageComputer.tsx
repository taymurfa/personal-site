import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { TerminalScreen } from './TerminalScreen';

interface VintageComputerProps {
	onScreenClick?: () => void;
}

export function VintageComputer({ onScreenClick }: VintageComputerProps) {
	const [isHovered, setIsHovered] = useState(false);
	// Create procedural textures for worn look
	const beigePlasticMaterial = useMemo(() => {
		// Create a noise texture for scratches and wear
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')!;

		// Base beige color
		ctx.fillStyle = '#d4c5a9';
		ctx.fillRect(0, 0, 256, 256);

		// Add scratches and dirt
		for (let i = 0; i < 200; i++) {
			const x = Math.random() * 256;
			const y = Math.random() * 256;
			const len = Math.random() * 20 + 5;
			const angle = Math.random() * Math.PI * 2;

			ctx.strokeStyle = `rgba(0, 0, 0, ${Math.random() * 0.1})`;
			ctx.lineWidth = Math.random() * 2;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
			ctx.stroke();
		}

		// Add dust spots
		for (let i = 0; i < 100; i++) {
			const x = Math.random() * 256;
			const y = Math.random() * 256;
			const radius = Math.random() * 3;

			ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.15})`;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(2, 2);

		return new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 0.7,
			metalness: 0.1,
			color: '#d4c5a9',
		});
	}, []);

	const screenGlassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
		color: '#0a0a0a',
		roughness: 0.1,
		metalness: 0.5,
		transparent: true,
		opacity: 0.95,
		reflectivity: 0.3,
	}), []);

	return (
		<group position={[0, 0, 0]}>
			{/* Monitor housing - back */}
			<mesh position={[0, 0, -0.25]} castShadow receiveShadow>
				<boxGeometry args={[1.2, 1, 0.5]} />
				<primitive object={beigePlasticMaterial} attach="material" />
			</mesh>

			{/* Monitor bezel - thick 80s style */}
			<mesh position={[0, 0, 0.02]} castShadow receiveShadow>
				<boxGeometry args={[1.0, 0.8, 0.08]} />
				<primitive object={beigePlasticMaterial} attach="material" />
			</mesh>

			{/* Screen glass - curved CRT style (clickable) */}
			<mesh
				position={[0, 0, 0.07]}
				onClick={(e) => {
					e.stopPropagation();
					if (onScreenClick) {
						onScreenClick();
					}
				}}
				onPointerOver={(e) => {
					e.stopPropagation();
					setIsHovered(true);
					document.body.style.cursor = 'pointer';
				}}
				onPointerOut={(e) => {
					e.stopPropagation();
					setIsHovered(false);
					document.body.style.cursor = 'auto';
				}}
			>
				<boxGeometry args={[0.85, 0.65, 0.05]} />
				<primitive object={screenGlassMaterial} attach="material" />
			</mesh>

			{/* Terminal display */}
			<group position={[0, 0, 0.08]}>
				<TerminalScreen isHighlighted={isHovered} />
			</group>

			{/* Bottom stand/base */}
			<mesh position={[0, -0.6, 0]} castShadow receiveShadow>
				<boxGeometry args={[0.8, 0.15, 0.6]} />
				<primitive object={beigePlasticMaterial} attach="material" />
			</mesh>

			{/* Monitor neck */}
			<mesh position={[0, -0.52, -0.1]} castShadow receiveShadow>
				<cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
				<primitive object={beigePlasticMaterial} attach="material" />
			</mesh>

			{/* Keyboard - flat on desk */}
			<group position={[0, -0.68, 0.7]}>
				<mesh castShadow receiveShadow>
					<boxGeometry args={[1.0, 0.05, 0.35]} />
					<primitive object={beigePlasticMaterial} attach="material" />
				</mesh>

				{/* Key clusters for detail */}
				{Array.from({ length: 60 }).map((_, i) => {
					const row = Math.floor(i / 12);
					const col = i % 12;
					return (
						<mesh
							key={i}
							position={[
								-0.45 + col * 0.08,
								0.03,
								-0.12 + row * 0.08
							]}
							castShadow
						>
							<boxGeometry args={[0.06, 0.02, 0.06]} />
							<meshStandardMaterial color="#c4b5a0" roughness={0.5} />
						</mesh>
					);
				})}
			</group>

			{/* Power LED - green dot */}
			<mesh position={[0.4, -0.3, 0.05]}>
				<sphereGeometry args={[0.015, 8, 8]} />
				<meshStandardMaterial
					color="#00ff00"
					emissive="#00ff00"
					emissiveIntensity={2}
				/>
			</mesh>

			{/* Ventilation grille on side */}
			{Array.from({ length: 8 }).map((_, i) => (
				<mesh
					key={`vent-${i}`}
					position={[0.61, 0.3 - i * 0.08, -0.1]}
					rotation={[0, Math.PI / 2, 0]}
					castShadow
				>
					<boxGeometry args={[0.3, 0.01, 0.01]} />
					<meshStandardMaterial color="#a09080" roughness={0.8} />
				</mesh>
			))}
		</group>
	);
}
