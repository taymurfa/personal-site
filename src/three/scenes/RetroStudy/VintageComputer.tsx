import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useGLTF, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TerminalScreen } from './TerminalScreen';

interface VintageComputerProps {
	onScreenClick?: () => void;
	deskTopY?: number;
	onZoomToScreen?: (screenWorldPos: THREE.Vector3) => void;
	onPowerChange?: (isPoweredOn: boolean) => void;
}

export function VintageComputer({ onScreenClick, deskTopY, onZoomToScreen, onPowerChange }: VintageComputerProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [isPowerButtonHovered, setIsPowerButtonHovered] = useState(false);
	const [isPoweredOn, setIsPoweredOn] = useState(false);
	const { scene } = useGLTF('/assets/models/apple_ii_computer.glb');

	// Refs and state for alignment
	const groupRef = useRef<THREE.Group>(null);
	const [computerY, setComputerY] = useState(0);
	const [screenPos, setScreenPos] = useState<[number, number, number]>([0, 0, 0.5]);
	const [clickPos, setClickPos] = useState<[number, number, number]>([0, 0, 0.5]);
	const [screenRot, setScreenRot] = useState<[number, number, number]>([0, 0, 0]);
	const [screenSize, setScreenSize] = useState<[number, number]>([0.4, 0.8]);
	const [boxDepth, setBoxDepth] = useState(0.1);
	const [screenReady, setScreenReady] = useState(false);
	const [deskAligned, setDeskAligned] = useState(false);
	const screenMeshRef = useRef<THREE.Mesh | null>(null);
	const [powerButtonPos, setPowerButtonPos] = useState<[number, number, number]>([0, 0, 0]);

	const SCREEN_MESH_NAME = 'Cube027_Monitor_0';

	// Store original screen material and track power-on animation
	const originalScreenMaterial = useRef<THREE.Material | THREE.Material[] | null>(null);
	const terminalTexture = useRef<THREE.Texture | null>(null);
	const [bootTime, setBootTime] = useState<number | null>(null);
	const [glowIntensity, setGlowIntensity] = useState(0);
	const [terminalTextureReady, setTerminalTextureReady] = useState(false);
	const screenMaterialRef = useRef<Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>>([]);
	const startupAudioRef = useRef<HTMLAudioElement | null>(null);

	// Load startup audio
	useEffect(() => {
		const audio = new Audio('/assets/sfx/startup.mp3');
		audio.preload = 'auto';
		audio.volume = 0.7;
		startupAudioRef.current = audio;
		return () => {
			audio.pause();
			audio.src = '';
		};
	}, []);

	const disposeScreenMaterials = useCallback((materials: THREE.Material | THREE.Material[]) => {
		if (Array.isArray(materials)) {
			materials.forEach(mat => mat.dispose());
		} else {
			materials.dispose();
		}
	}, []);

	// Callback to receive terminal texture
	const handleTerminalTexture = useCallback((texture: THREE.Texture) => {
		terminalTexture.current = texture;
		setTerminalTextureReady(true);
	}, []);

	// Start boot animation when powered on
	useEffect(() => {
		if (isPoweredOn) {
			setBootTime(Date.now());
		} else {
			setBootTime(null);
			setGlowIntensity(0);
		}
		// Notify parent of power state change
		if (onPowerChange) {
			onPowerChange(isPoweredOn);
		}
	}, [isPoweredOn, onPowerChange]);

	// Animate the emissive glow intensity during boot
	useEffect(() => {
		if (!bootTime) return;

		const GLOW_FADE_DURATION = 1500; // 1.5 seconds to fade in the glow
		const startTime = bootTime;

		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / GLOW_FADE_DURATION, 1);

			// Ease-in quad for smooth fade
			const easedProgress = progress * progress;
			setGlowIntensity(easedProgress * 0.4);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		const animationId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationId);
	}, [bootTime]);

	// Apply terminal texture to existing screen material using emissive map
	useEffect(() => {
		const mesh = screenMeshRef.current;
		if (!mesh || !mesh.material) {
			return;
		}

		if (!originalScreenMaterial.current) {
			originalScreenMaterial.current = Array.isArray(mesh.material)
				? mesh.material.map(material => material.clone())
				: mesh.material.clone();
		}

		if (isPoweredOn && terminalTextureReady && terminalTexture.current) {
			const storedOriginal = originalScreenMaterial.current;
			const originals = Array.isArray(storedOriginal) ? storedOriginal : [storedOriginal];
			const emissiveTexture = terminalTexture.current;
			emissiveTexture.needsUpdate = true;

			if (screenMaterialRef.current.length) {
				disposeScreenMaterials(mesh.material);
			}

			const updateableMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial> = [];
			const clonedMaterials = originals.map(original => {
				const mat = original.clone() as THREE.Material;
				if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
					mat.emissiveMap = emissiveTexture;
					mat.emissive = new THREE.Color('#9ffdcb');
					mat.emissiveIntensity = 0;
					mat.needsUpdate = true;
					updateableMaterials.push(mat);
				}
				return mat;
			});

			if (Array.isArray(storedOriginal)) {
				mesh.material = clonedMaterials;
			} else {
				mesh.material = clonedMaterials[0];
			}
			screenMaterialRef.current = updateableMaterials;
		}

		if (!isPoweredOn && originalScreenMaterial.current) {
			const storedOriginal = originalScreenMaterial.current;
			const restored = Array.isArray(storedOriginal)
				? storedOriginal.map(material => material.clone())
				: storedOriginal.clone();

			if (screenMaterialRef.current.length) {
				disposeScreenMaterials(mesh.material);
			}

			if (Array.isArray(storedOriginal)) {
				mesh.material = restored as THREE.Material[];
			} else {
				mesh.material = restored as THREE.Material;
			}
			screenMaterialRef.current = [];
		}
	}, [isPoweredOn, terminalTextureReady, disposeScreenMaterials]);

	// Enable shadows on all meshes and ensure materials are opaque and block light
	useEffect(() => {
		scene.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;

				// Ensure all materials are opaque and block light properly
				const mesh = child as THREE.Mesh;
				if (mesh.material) {
					const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
					materials.forEach((mat) => {
						if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
							// Ensure materials are opaque (except screen which we handle separately)
							if (mesh.name !== SCREEN_MESH_NAME) {
								mat.transparent = false;
								mat.opacity = 1.0;
								mat.needsUpdate = true;
							}
						}
					});
				}
			}
		});
	}, [scene]);


	// Compute computer base and align to desk top when available
	useLayoutEffect(() => {
		if (!groupRef.current) {
			setDeskAligned(false);
			return;
		}
		setDeskAligned(false);

		// Calculate bounding box from just the computer model (scene), not the entire group
		// This excludes UI elements like the power button
		groupRef.current.updateWorldMatrix(true, true);
		scene.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(scene);

		if (deskTopY != null) {
			const minY = box.min.y; // world-space base of computer
			const offset = deskTopY - minY + 0.005; // small epsilon to avoid z-fighting
			setComputerY(offset);
		}
		setDeskAligned(true);
	}, [deskTopY, scene]);

	// Locate the dedicated screen mesh and power button position
	useLayoutEffect(() => {
		if (!groupRef.current) return;
		const base = groupRef.current;
		setScreenReady(false);
		screenMeshRef.current = null;

		// Use requestAnimationFrame to ensure React has applied position updates
		// before we calculate screen and button positions
		const handle = requestAnimationFrame(() => {
			base.updateWorldMatrix(true, true);

			// Calculate power button position (bottom left of keyboard)
			const compBox = new THREE.Box3().setFromObject(base);
			const compSize = new THREE.Vector3();
			compBox.getSize(compSize);

			// Position power button at bottom left of keyboard area
			const buttonX = compBox.min.x + 0.222;
			const buttonY = compBox.min.y + 0.169;
			const buttonZ = compBox.max.z - 0.115;
			const buttonLocalPos = base.worldToLocal(new THREE.Vector3(buttonX, buttonY, buttonZ));
			setPowerButtonPos([buttonLocalPos.x, buttonLocalPos.y, buttonLocalPos.z]);

			const toMesh = (obj: THREE.Object3D | null | undefined): THREE.Mesh | null =>
				obj && (obj as THREE.Mesh).isMesh ? (obj as THREE.Mesh) : null;

			const screenNode = toMesh(base.getObjectByName(SCREEN_MESH_NAME));

			if (screenNode) {
				screenMeshRef.current = screenNode;

				screenNode.updateWorldMatrix(true, true);
				base.updateWorldMatrix(true, true);

				// Get screen dimensions from bounding box
				const geometry = screenNode.geometry;
				if (!geometry.boundingBox) geometry.computeBoundingBox();
				const bbox = geometry.boundingBox!;
				const size = new THREE.Vector3();
				bbox.getSize(size);

				// Get the largest two dimensions for width and height
				const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
				const [width, height, thickness] = dims;

				// Get screen world transform and convert to local space
				const worldPos = new THREE.Vector3();
				const worldQuat = new THREE.Quaternion();
				const baseWorldQuat = new THREE.Quaternion();
				screenNode.getWorldPosition(worldPos);
				screenNode.getWorldQuaternion(worldQuat);
				base.getWorldQuaternion(baseWorldQuat);

				const localPos = base.worldToLocal(worldPos.clone());
				const localQuat = baseWorldQuat.clone().invert().multiply(worldQuat);
				const euler = new THREE.Euler().setFromQuaternion(localQuat, 'XYZ');

				// Position relative to mesh dimensions - center the terminal on the screen
				// Move right by 2% of width, up by 15% of height, forward in front of mesh
				const xOffset = width * -0.019;
				const yOffset = height * 0.11;
				const zOffset = thickness * 3.75; // Position well in front to avoid overlap

				setScreenPos([localPos.x + xOffset, localPos.y + yOffset, localPos.z + zOffset]);
				setClickPos([localPos.x + xOffset, localPos.y + yOffset, localPos.z + zOffset + 0.02]);

				// Align terminal orientation with the underlying mesh rotation
				setScreenRot([euler.x, euler.y, euler.z]);

				// Set terminal size relative to mesh - use 40% of mesh dimensions
				setScreenSize([width * 0.38, height * 0.37]);
				setBoxDepth(thickness * 2);
				setScreenReady(true);
				return;
			}

			// Final fallback: approximate placement based on whole chassis (reuse compBox and compSize from above)
			const compCenter = new THREE.Vector3();
			compBox.getCenter(compCenter);

			const screenY = compBox.min.y + compSize.y * 0.64;
			const screenZ = compBox.max.z - compSize.z * 0.12;
			const screenX = compCenter.x - compSize.x * 0.18;
			const fallbackPos = base.worldToLocal(new THREE.Vector3(screenX, screenY, screenZ));
			setScreenPos([fallbackPos.x, fallbackPos.y, fallbackPos.z]);
			setClickPos([fallbackPos.x, fallbackPos.y, fallbackPos.z + 0.01]);
			setScreenRot([0, 0, 0]);
			const width = compSize.x * 0.8;
			const height = compSize.y * 0.4;
			setScreenSize([width, height]);
			setBoxDepth(0.05);
			setScreenReady(true);
		});

		return () => cancelAnimationFrame(handle);
	}, [scene, computerY]);

	// Animate emissive intensity on the original screen material
	useFrame(() => {
		if (!screenMaterialRef.current.length) {
			return;
		}

		const baseIntensity = isPoweredOn ? THREE.MathUtils.clamp(0.18 + glowIntensity * 1.4, 0, 0.8) : 0;
		const hoverBoost = isHovered ? 0.12 : 0;
		const targetIntensity = baseIntensity + hoverBoost;

		screenMaterialRef.current.forEach(material => {
			material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, targetIntensity, 0.12);
		});
	});

	return (
		<>
		<group ref={groupRef} position={[0 , computerY, 0]} scale={0.7} visible={true}>
			{/* Computer terminal model */}
			<primitive object={scene} scale={1} castShadow receiveShadow />

			{/* Power button - bottom left of keyboard */}
			{screenReady && (
				<>
					{/* Power button with rounded edges and chamfer like keyboard keys */}
					<RoundedBox
						args={[0.061, 0.03, 0.061]}
						radius={0.008}
						smoothness={1}
						position={powerButtonPos}
						rotation={[0.1, 0.005, 0.01]}
						scale={[1, 0.85, 0.95]}
						onClick={(e) => {
							e.stopPropagation();
							setIsPoweredOn(true);
							// Play startup audio
							if (startupAudioRef.current) {
								startupAudioRef.current.currentTime = 0;
								startupAudioRef.current.play().catch(err => {
									console.warn('Audio playback failed:', err);
								});
							}
						}}
						onPointerOver={(e) => {
							e.stopPropagation();
							setIsPowerButtonHovered(true);
							document.body.style.cursor = 'pointer';
						}}
						onPointerOut={(e) => {
							e.stopPropagation();
							setIsPowerButtonHovered(false);
							document.body.style.cursor = 'auto';
						}}
						castShadow
						receiveShadow
					>
						<meshStandardMaterial
							color={isPowerButtonHovered ? '#ff6666' : '#ff3333'}
							emissive={isPowerButtonHovered ? '#ff0000' : '#660000'}
							emissiveIntensity={isPowerButtonHovered ? 0.5 : 0.2}
							roughness={0.6}
							metalness={0.1}
						/>
					</RoundedBox>

					{/* Invisible clickable area for the screen - aligned to model - only active when powered on */}
					{isPoweredOn && (
						<mesh
							position={clickPos}
							rotation={screenRot}
							onClick={(e) => {
								e.stopPropagation();

								// Fade out startup audio
								if (startupAudioRef.current && !startupAudioRef.current.paused) {
									const audio = startupAudioRef.current;
									const fadeDuration = 1000; // 1 second fade
									const fadeSteps = 50;
									const stepDuration = fadeDuration / fadeSteps;
									const volumeDecrement = audio.volume / fadeSteps;

									const fadeInterval = setInterval(() => {
										if (audio.volume > volumeDecrement) {
											audio.volume = Math.max(0, audio.volume - volumeDecrement);
										} else {
											audio.volume = 0;
											audio.pause();
											clearInterval(fadeInterval);
										}
									}, stepDuration);
								}

								// Get world position of the screen for camera zoom
								if (onZoomToScreen && groupRef.current) {
									const localPos = new THREE.Vector3(...screenPos);
									const worldPos = groupRef.current.localToWorld(localPos.clone());
									onZoomToScreen(worldPos);
								}

								// Keep old callback for backwards compatibility
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
							<boxGeometry args={[screenSize[0] * 1.03, screenSize[1] * 1.03, boxDepth]} />
							<meshBasicMaterial transparent opacity={0} />
						</mesh>
					)}

					{/* Render terminal texture - mapped to screen mesh surface */}
					{isPoweredOn && (
						<>
							{/* Light emanating from screen - fades in with boot animation */}
							<pointLight
								color="#9ffdcb"
								position={screenPos}
								intensity={glowIntensity}
								distance={1.2}
								decay={2}
							/>

							{/* Terminal rendered to texture only - no visible mesh */}
							<TerminalScreen
								isHighlighted={isHovered}
								width={screenSize[0]}
								height={screenSize[1]}
								offset={0}
								bootSignal={bootTime}
								onTextureReady={handleTerminalTexture}
								renderToTexture={true}
							/>
						</>
					)}
				</>
			)}
		</group>

		</>
	);
}
