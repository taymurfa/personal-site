import { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTF } from 'three-stdlib';
import { TerminalScreen } from './TerminalScreen';

interface VintageComputerProps {
	onScreenClick?: () => void;
	deskTopY?: number; // world-space Y of desk surface
	debug?: boolean; // show debug helpers for screen alignment
}

type ComputerTerminalGLTF = GLTF & {
	nodes: {
		'Comp_Screen.000_TerminalMaterial_0': THREE.Mesh;
		'Comp_Screen.002_TerminalMaterial_0': THREE.Mesh;
	};
	materials: Record<string, THREE.Material | THREE.Material[]>;
};


export function VintageComputer({ onScreenClick, deskTopY, debug = false }: VintageComputerProps) {
	const [isHovered, setIsHovered] = useState(false);
	const { scene } = useGLTF('/src/assets/models/apple_ii_computer.glb');

	// Refs and state for alignment
	const groupRef = useRef<THREE.Group>(null);
	const [computerY, setComputerY] = useState(0);
	const [screenPos, setScreenPos] = useState<[number, number, number]>([0, 0, 0.5]);
	const [clickPos, setClickPos] = useState<[number, number, number]>([0, 0, 0.5]);
	const [screenRot, setScreenRot] = useState<[number, number, number]>([0, 0, 0]);
	const [screenSize, setScreenSize] = useState<[number, number]>([0.4, 0.8]);
	const [boxDepth, setBoxDepth] = useState(0.1);
	const [screenReady, setScreenReady] = useState(false);

	const SCREEN_MESH_NAME = 'Cube027_Monitor_0';

	// Enable shadows on all meshes in the computer model
	useEffect(() => {
		scene.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
	}, [scene]);

	// Compute computer base and align to desk top when available
	useEffect(() => {
		if (!groupRef.current) return;
		groupRef.current.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(groupRef.current);
		if (deskTopY != null) {
			const minY = box.min.y; // world-space base of computer
			const offset = deskTopY - minY + 0.005; // small epsilon to avoid z-fighting
			setComputerY(offset);
		}
	}, [deskTopY]);

	// Locate the dedicated screen mesh and align the overlay to it
	useEffect(() => {
		if (!groupRef.current) return;
		const base = groupRef.current;

		// Use requestAnimationFrame to ensure React has applied position updates
		// before we calculate screen position
		const handle = requestAnimationFrame(() => {
			base.updateWorldMatrix(true, true);

			const toMesh = (obj: THREE.Object3D | null | undefined): THREE.Mesh | null => {
				return obj && (obj as THREE.Mesh).isMesh ? (obj as THREE.Mesh) : null;
			};

			// Debug: List all available mesh names in the scene
			const allMeshes: string[] = [];
			base.traverse((child) => {
				if ((child as THREE.Mesh).isMesh) {
					allMeshes.push(child.name);
				}
			});
			console.log('All available meshes:', allMeshes);

			const screenNode = toMesh(base.getObjectByName(SCREEN_MESH_NAME));
			console.log('Looking for mesh:', SCREEN_MESH_NAME);
			console.log('Found screen node:', screenNode);

			if (screenNode) {
				// Make the screen mesh transparent so terminal display shows through
				if (screenNode.material) {
					const materials = Array.isArray(screenNode.material) ? screenNode.material : [screenNode.material];
					materials.forEach((mat) => {
						const material = mat as THREE.MeshStandardMaterial;
						material.transparent = true;
						material.opacity = 0;
						material.needsUpdate = true;
					});
				}

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
				const zOffset = thickness * 4.3; // Position well in front to avoid overlap

				setScreenPos([localPos.x + xOffset, localPos.y + yOffset, localPos.z + zOffset]);
				setClickPos([localPos.x + xOffset, localPos.y + yOffset, localPos.z + zOffset + 0.02]);

				// Align terminal orientation with the underlying mesh rotation
				setScreenRot([0, 0, 0]);

				// Set terminal size relative to mesh - use 40% of mesh dimensions
				setScreenSize([width * 0.36, height * 0.36]);
				console.log('Screen size set to:', [width * 0.4, height * 0.4]);
				console.log('Screen position:', [localPos.x + xOffset, localPos.y + yOffset, localPos.z + zOffset]);
				console.log('Screen rotation:', [euler.x, euler.y, euler.z]);
				console.log('Mesh dimensions (w,h,d):', [width, height, thickness]);
				setBoxDepth(thickness * 2);
				return;
			}

			// Final fallback: approximate placement based on whole chassis
			const compBox = new THREE.Box3().setFromObject(base);
			const compSize = new THREE.Vector3();
			compBox.getSize(compSize);
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
		});

		return () => cancelAnimationFrame(handle);
	}, [scene, computerY]);

	return (
		<group ref={groupRef} position={[0, computerY, 0]} scale={0.7}>
			{/* Computer terminal model */}
			<primitive object={scene} scale={1} castShadow receiveShadow />
			
			{/* Invisible clickable area for the screen - aligned to model */}
			<mesh
				position={clickPos}
				rotation={screenRot}
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
				<boxGeometry args={[screenSize[0] * 1.03, screenSize[1] * 1.03, boxDepth]} />
				<meshBasicMaterial transparent opacity={0} />
			</mesh>

			{/* Terminal display - aligned to model screen */}
			<group position={screenPos} rotation={screenRot}>
				<pointLight
					color="#9ffdcb"
					position={[0, 0, 0.12]}
					intensity={1.1}
					distance={1.6}
					decay={2}
				/>
				<TerminalScreen isHighlighted={isHovered} width={screenSize[0]} height={screenSize[1]} offset={0} />
			</group>
		</group>
	);
}
