import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DeskLampProps {
	deskTopY?: number;
	computerPoweredOn?: boolean;
	assetsReady?: boolean;
}

// Configuration constants
const LAMP_POSITION = { x: 0, y: 0, z: 0};
const LAMP_ROTATION_Y = -Math.PI * 0.45;
const LAMP_SCALE = 0.9;

const LIGHT_CONFIG = {
	position: { x: 0, y: -0.08, z: 1.11 },
	rotation: -Math.PI * 0.3,
	angle: Math.PI / 3,
	penumbra: 0.5,
	color: '#ffa850',
	baseIntensity: 4.0,
	distance: 3.0,
	decay: 2.0,
	shadowMapSize: 1024,
};

// Fixed rotation values
const LAMP_HEAD_ROTATION = { x: 0.291, y: -0.054 };
const BASE_ROTATION = -0.468;
const BASE_JOINT_POS = { x: 0, y: 0.3, z: 0.15 };

const BULB_GLOW = {
	intensity: 0.8,
	distance: 0.25,
	decay: 2,
};

const FLICKER_CONFIG = {
	slow: { frequency: 8, amplitude: 0.05 },
	medium: { frequency: 13, amplitude: 0.03 },
	fast: { frequency: 20, amplitude: 0.02 },
	intensityMultiplier: 0.5,
};

export function DeskLamp({ deskTopY, computerPoweredOn = false, assetsReady = false }: DeskLampProps) {
	const lightRef = useRef<THREE.SpotLight>(null);
	const bulbGlowRef = useRef<THREE.PointLight>(null);
	const fillLightRef = useRef<THREE.PointLight>(null);
	const groupRef = useRef<THREE.Group>(null);
	const targetRef = useRef<THREE.Object3D>(null);
	const { scene } = useGLTF('/assets/models/desk_lamp.glb');
	const [lampY, setLampY] = useState(0);

	// Flicker-on animation state
	const flickerOnProgress = useRef(0);
	const [isFlickerComplete, setIsFlickerComplete] = useState(false);
	const flickerStartTime = useRef<number | null>(null);

	// Start flicker animation when assets are ready
	useEffect(() => {
		if (assetsReady && flickerStartTime.current === null) {
			flickerStartTime.current = Date.now();
		}
	}, [assetsReady]);

	// Set spotlight target and configure shadow camera
	useEffect(() => {
		if (lightRef.current && targetRef.current) {
			lightRef.current.target = targetRef.current;

			// Configure shadow camera for better coverage
			if (lightRef.current.shadow.camera) {
				lightRef.current.shadow.camera.near = 0.1;
				lightRef.current.shadow.camera.far = 5;
				lightRef.current.shadow.bias = -0.0001;
				lightRef.current.shadow.camera.updateProjectionMatrix();
			}
		}
	}, []);

	// Enable shadows and make bulb emissive and semi-transparent
	useEffect(() => {
		scene.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				const mesh = child as THREE.Mesh;
				mesh.castShadow = true;
				mesh.receiveShadow = true;

				// Make the bulb mesh emissive and semi-transparent so it appears to glow
				const nameLower = mesh.name.toLowerCase();
				if (nameLower.includes('sphere') && mesh.name.includes('Material011')) {
					const material = mesh.material as THREE.MeshStandardMaterial;
					if (material && material.isMeshStandardMaterial) {
						const clonedMaterial = material.clone();
						clonedMaterial.emissive = new THREE.Color(LIGHT_CONFIG.color);
						clonedMaterial.emissiveIntensity = 30.0;
						clonedMaterial.transparent = true;
						clonedMaterial.opacity = 0.6;
						mesh.material = clonedMaterial;
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

	// Animate light flicker and dim fill light when computer is powered on
	useFrame(({ clock }) => {
		if (!lightRef.current || !bulbGlowRef.current || !fillLightRef.current) return;

		const time = clock.getElapsedTime();

		// Flicker-on animation when assets become ready
		if (flickerStartTime.current !== null && !isFlickerComplete) {
			const elapsed = Date.now() - flickerStartTime.current;
			const FLICKER_DURATION = 2000; // 2 seconds flicker-on animation

			if (elapsed < FLICKER_DURATION) {
				// Progress from 0 to 1 over duration
				flickerOnProgress.current = elapsed / FLICKER_DURATION;

				// Random flickers during power-on (more intense at start)
				const randomFlicker = Math.random() * (1 - flickerOnProgress.current) * 0.8;
				const baseProgress = flickerOnProgress.current * (1 - randomFlicker);

				// Apply eased progress with random flickers
				const easedProgress = baseProgress < 0.5
					? 2 * baseProgress * baseProgress
					: 1 - Math.pow(-2 * baseProgress + 2, 2) / 2;

				lightRef.current.intensity = LIGHT_CONFIG.baseIntensity * easedProgress;
				bulbGlowRef.current.intensity = BULB_GLOW.intensity * easedProgress;
				fillLightRef.current.intensity = 1.0 * easedProgress;
			} else {
				// Flicker complete, set to normal intensities
				flickerOnProgress.current = 1;
				setIsFlickerComplete(true);
			}
		} else if (!flickerStartTime.current) {
			// Lamp is off before assets are ready
			lightRef.current.intensity = 0;
			bulbGlowRef.current.intensity = 0;
			fillLightRef.current.intensity = 0;
		} else {
			// Normal operation with subtle flicker after flicker-on completes
			const { slow, medium, fast, intensityMultiplier } = FLICKER_CONFIG;

			const flicker =
				Math.sin(time * slow.frequency) * slow.amplitude +
				Math.sin(time * medium.frequency) * medium.amplitude +
				Math.sin(time * fast.frequency) * fast.amplitude;

			lightRef.current.intensity = LIGHT_CONFIG.baseIntensity + flicker * intensityMultiplier;
			bulbGlowRef.current.intensity = BULB_GLOW.intensity + flicker * intensityMultiplier * 0.4;

			// Dim the fill light when computer is powered on (reduces from 1.0 to 0.2)
			const targetFillIntensity = computerPoweredOn ? 0.2 : 1.0;
			fillLightRef.current.intensity = THREE.MathUtils.lerp(
				fillLightRef.current.intensity,
				targetFillIntensity,
				0.05
			);
		}
	});

	return (
		<group position={[1, -0.2, 0.6]}>
			<group
				ref={groupRef}
				rotation={[0, -Math.PI / 3, 0]}
				scale={0.7}
				position={[0, 0, 0]}
			>
				{/* Base rotation with fixed angle */}
				<group position={[BASE_JOINT_POS.x, BASE_JOINT_POS.y, BASE_JOINT_POS.z]}>
					<group rotation={[0, BASE_ROTATION, 0]}>
						<group position={[-BASE_JOINT_POS.x, -BASE_JOINT_POS.y, -BASE_JOINT_POS.z]}>
							<primitive object={scene} castShadow receiveShadow />
						</group>
					</group>
				</group>

				{/* Lamp head with fixed rotation - lights point at target in local space */}
				<group position={[BASE_JOINT_POS.x, BASE_JOINT_POS.y, BASE_JOINT_POS.z]} rotation={[0, BASE_ROTATION, 0]}>
					<group rotation={[LAMP_HEAD_ROTATION.x, LAMP_HEAD_ROTATION.y, 0]}>
						<pointLight
							ref={bulbGlowRef}
							position={[LIGHT_CONFIG.position.x, LIGHT_CONFIG.position.y, LIGHT_CONFIG.position.z]}
							color={LIGHT_CONFIG.color}
							intensity={BULB_GLOW.intensity}
							distance={BULB_GLOW.distance}
							decay={BULB_GLOW.decay}
						/>

						{/* Secondary fill light for better illumination - positioned above lamp */}
						<pointLight
							ref={fillLightRef}
							position={[LIGHT_CONFIG.position.x, LIGHT_CONFIG.position.y + 0.4, LIGHT_CONFIG.position.z]}
							color={LIGHT_CONFIG.color}
							intensity={1.0}
							distance={2.5}
							decay={2}
						/>

						<spotLight
							ref={lightRef}
							position={[LIGHT_CONFIG.position.x, LIGHT_CONFIG.position.y, LIGHT_CONFIG.position.z]}
							angle={LIGHT_CONFIG.angle}
							penumbra={LIGHT_CONFIG.penumbra}
							color={LIGHT_CONFIG.color}
							intensity={LIGHT_CONFIG.baseIntensity}
							distance={LIGHT_CONFIG.distance}
							decay={LIGHT_CONFIG.decay}
							castShadow
							shadow-mapSize-width={2048}
							shadow-mapSize-height={2048}
							shadow-bias={-0.0001}
						/>

						{/* Target for spotlight - positioned to aim at keyboard */}
						<object3D ref={targetRef} position={[0, -1, 0]} />
					</group>
				</group>
			</group>
		</group>
	);
}
