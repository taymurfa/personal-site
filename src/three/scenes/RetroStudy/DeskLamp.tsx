import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DeskLampProps {
	deskTopY?: number;
}

// Configuration constants
const LAMP_POSITION = { x: 1.15, yOffset: 0.12, z: 0.4};
const LAMP_ROTATION_Y = -Math.PI * 0.45;
const LAMP_SCALE = 0.8;

const LIGHT_CONFIG = {
	position: { x: 0, y: 0.32, z: 0 },
	rotation: -Math.PI * 0.3,
	angle: Math.PI / 3,
	penumbra: 0.5,
	color: '#ffa850',
	baseIntensity: 4.0,
	distance: 3.0,
	decay: 2.0,
	shadowMapSize: 1024,
};

const BULB_GLOW = {
	intensity: 0.8,
	distance: 0.35,
	decay: 2,
};

const FLICKER_CONFIG = {
	slow: { frequency: 8, amplitude: 0.05 },
	medium: { frequency: 13, amplitude: 0.03 },
	fast: { frequency: 20, amplitude: 0.02 },
	intensityMultiplier: 0.5,
};

export function DeskLamp({ deskTopY }: DeskLampProps) {
	const lightRef = useRef<THREE.SpotLight>(null);
	const bulbGlowRef = useRef<THREE.PointLight>(null);
	const groupRef = useRef<THREE.Group>(null);
	const { scene } = useGLTF('/assets/models/desk_lamp.glb');
	const [lampY, setLampY] = useState(0);

	// Enable shadows and make bulb emissive
	useEffect(() => {
		scene.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				mesh.castShadow = true;
				mesh.receiveShadow = true;

				// Make the bulb mesh emissive so it appears to glow
				const nameLower = mesh.name.toLowerCase();
				if (nameLower.includes('sphere')) {
					const material = mesh.material as THREE.MeshStandardMaterial;
					if (material && material.isMeshStandardMaterial) {
						material.emissive = new THREE.Color(LIGHT_CONFIG.color);
						material.emissiveIntensity = 30.0;
						material.needsUpdate = true;
					}
				}
			}
		});
	}, [scene]);

	// Align lamp base to desk surface
	useEffect(() => {
		if (!groupRef.current || deskTopY == null) return;

		groupRef.current.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(groupRef.current);
		const minY = box.min.y;
		const offset = deskTopY - minY + 0.005;
		setLampY(offset);
	}, [deskTopY, scene]);

	// Animate light flicker for both spotlight and bulb glow
	useFrame(({ clock }) => {
		if (!lightRef.current || !bulbGlowRef.current) return;

		const time = clock.getElapsedTime();
		const { slow, medium, fast, intensityMultiplier } = FLICKER_CONFIG;

		const flicker =
			Math.sin(time * slow.frequency) * slow.amplitude +
			Math.sin(time * medium.frequency) * medium.amplitude +
			Math.sin(time * fast.frequency) * fast.amplitude;

		lightRef.current.intensity = LIGHT_CONFIG.baseIntensity + flicker * intensityMultiplier;
		bulbGlowRef.current.intensity = BULB_GLOW.intensity + flicker * intensityMultiplier * 0.4;
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

				<pointLight
					ref={bulbGlowRef}
					position={[LIGHT_CONFIG.position.x, LIGHT_CONFIG.position.y, LIGHT_CONFIG.position.z]}
					color={LIGHT_CONFIG.color}
					intensity={BULB_GLOW.intensity}
					distance={BULB_GLOW.distance}
					decay={BULB_GLOW.decay}
				/>

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
