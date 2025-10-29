import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function DeskLamp() {
	const lightRef = useRef<THREE.PointLight>(null);
	const emissiveMeshRef = useRef<THREE.Mesh>(null);

	// Flicker animation
	useFrame(({ clock }) => {
		if (lightRef.current && emissiveMeshRef.current) {
			const time = clock.getElapsedTime();

			// Create subtle flicker
			const flicker = Math.sin(time * 8) * 0.05 +
			                Math.sin(time * 13) * 0.03 +
			                Math.sin(time * 20) * 0.02;

			const baseIntensity = 2.5;
			lightRef.current.intensity = baseIntensity + flicker;

			// Sync emissive intensity with light
			if (emissiveMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
				emissiveMeshRef.current.material.emissiveIntensity = 0.8 + flicker * 0.3;
			}
		}
	});

	return (
		<group position={[1.2, 0.2, 0.5]}>
			{/* Lamp base */}
			<mesh position={[0, -0.9, 0]} castShadow>
				<cylinderGeometry args={[0.08, 0.1, 0.05, 16]} />
				<meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
			</mesh>

			{/* Lamp arm - lower */}
			<mesh position={[0, -0.65, 0]} rotation={[0, 0, -0.3]} castShadow>
				<cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
			</mesh>

			{/* Lamp joint */}
			<mesh position={[0.12, -0.42, 0]} castShadow>
				<sphereGeometry args={[0.03, 8, 8]} />
				<meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
			</mesh>

			{/* Lamp arm - upper */}
			<mesh position={[0.22, -0.18, 0]} rotation={[0, 0, 0.5]} castShadow>
				<cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
				<meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
			</mesh>

			{/* Lamp shade */}
			<mesh position={[0.35, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
				<coneGeometry args={[0.12, 0.15, 16, 1, true]} />
				<meshStandardMaterial
					color="#2a3a2a"
					metalness={0.5}
					roughness={0.5}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* Light bulb (emissive) */}
			<mesh ref={emissiveMeshRef} position={[0.35, 0.0, 0]}>
				<sphereGeometry args={[0.04, 8, 8]} />
				<meshStandardMaterial
					color="#ffd399"
					emissive="#ff9933"
					emissiveIntensity={0.8}
					roughness={0.3}
					metalness={0.1}
				/>
			</mesh>

			{/* Point light */}
			<pointLight
				ref={lightRef}
				position={[0.35, 0.0, 0]}
				color="#ffa850"
				intensity={2.5}
				distance={5}
				decay={2}
				castShadow
				shadow-mapSize-width={512}
				shadow-mapSize-height={512}
			/>
		</group>
	);
}
