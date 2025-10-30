import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DeskLampProps {
	deskTopY?: number;
}

export function DeskLamp({ deskTopY }: DeskLampProps) {
	const lightRef = useRef<THREE.PointLight>(null);
	const groupRef = useRef<THREE.Group>(null);
	const { scene } = useGLTF('/src/assets/models/desk_lamp.glb');
	const [lampY, setLampY] = useState(0);

	// Enable shadows on all meshes in the lamp model
	useEffect(() => {
		scene.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
	}, [scene]);

	// Align lamp to desk top
	useEffect(() => {
		if (!groupRef.current) return;
		groupRef.current.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(groupRef.current);
		if (deskTopY != null) {
			const minY = box.min.y;
			const offset = deskTopY - minY + 0.005;
			setLampY(offset);
		}
	}, [deskTopY, scene]);

	// Flicker animation
	useFrame(({ clock }) => {
		if (lightRef.current) {
			const time = clock.getElapsedTime();

			// Create subtle flicker
			const flicker = Math.sin(time * 8) * 0.05 +
			                Math.sin(time * 13) * 0.03 +
			                Math.sin(time * 20) * 0.02;

			const baseIntensity = 1.0;
			lightRef.current.intensity = baseIntensity + flicker;
		}
	});

	return (
		<group position={[1.2, lampY, 0.2]}>
			<group ref={groupRef} rotation={[0, -Math.PI / 3, 0]} scale={0.7}>
				{/* Desk lamp model */}
				<primitive object={scene} scale={1} castShadow receiveShadow />

				{/* Point light */}
				<pointLight
					ref={lightRef}
					position={[0, 0.3, 0]}
					color="#ffa850"
					intensity={1.0}
					distance={2.5}
					decay={2}
					castShadow
					shadow-mapSize-width={512}
					shadow-mapSize-height={512}
				/>
			</group>
		</group>
	);
}
