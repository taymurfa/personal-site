import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DeskLampProps {
	deskTopY?: number;
}

// Configuration constants
const LAMP_POSITION = { x: 1.05, yOffset: 0.5, z: -0.2 };
const LAMP_ROTATION_Y = -Math.PI * 0.3; // -81 degrees
const LAMP_SCALE = 0.7;

const LIGHT_CONFIG = {
	position: { x: 0, y: 0.32, z: 0 },
	rotation: Math.PI / 3, // 60 degrees downward tilt
	angle: Math.PI / 4, // 45 degree cone
	penumbra: 0.5,
	color: '#ffa850',
	baseIntensity: 4.0,
	distance: 3.0,
	decay: 2.0,
	shadowMapSize: 1024,
};

const FLICKER_CONFIG = {
	slow: { frequency: 8, amplitude: 0.05 },
	medium: { frequency: 13, amplitude: 0.03 },
	fast: { frequency: 20, amplitude: 0.02 },
	intensityMultiplier: 0.5,
};

export function DeskLamp({ deskTopY }: DeskLampProps) {
	const lightRef = useRef<THREE.SpotLight>(null);
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

	// Align lamp base to desk surface
	useEffect(() => {
		if (!groupRef.current || deskTopY == null) return;

		groupRef.current.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(groupRef.current);
		const minY = box.min.y;
		const offset = deskTopY - minY + 0.005; // Small epsilon to prevent z-fighting
		setLampY(offset);
	}, [deskTopY, scene]);

	// Animate light flicker
	useFrame(({ clock }) => {
		if (!lightRef.current) return;

		const time = clock.getElapsedTime();
		const { slow, medium, fast, intensityMultiplier } = FLICKER_CONFIG;

		// Combine multiple sine waves for organic flicker effect
		const flicker =
			Math.sin(time * slow.frequency) * slow.amplitude +
			Math.sin(time * medium.frequency) * medium.amplitude +
			Math.sin(time * fast.frequency) * fast.amplitude;

		lightRef.current.intensity = LIGHT_CONFIG.baseIntensity + flicker * intensityMultiplier;
	});

	return (
		<group position={[LAMP_POSITION.x, lampY + LAMP_POSITION.yOffset, LAMP_POSITION.z]}>
			<group
				ref={groupRef}
				rotation={[0, LAMP_ROTATION_Y, 0]}
				scale={LAMP_SCALE}
				position={[0, 0.12, 0]}
			>
				<primitive object={scene} castShadow receiveShadow />

				<spotLight
					ref={lightRef}
					position={[LIGHT_CONFIG.position.x, LIGHT_CONFIG.position.y, LIGHT_CONFIG.position.z]}
					rotation={[LIGHT_CONFIG.rotation, 0, 0]}
					angle={LIGHT_CONFIG.angle}
					penumbra={LIGHT_CONFIG.penumbra}
					color={LIGHT_CONFIG.color}
					intensity={LIGHT_CONFIG.baseIntensity}
					distance={LIGHT_CONFIG.distance}
					decay={LIGHT_CONFIG.decay}
					castShadow
					shadow-mapSize-width={LIGHT_CONFIG.shadowMapSize}
					shadow-mapSize-height={LIGHT_CONFIG.shadowMapSize}
				/>
			</group>
		</group>
	);
}
