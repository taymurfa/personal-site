import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DeskProps {
	onReady?: (topY: number) => void;
	onBounds?: (bounds: { topY: number; bottomY: number }) => void;
}

export function Desk({ onReady, onBounds }: DeskProps) {
	const { scene } = useGLTF('/src/assets/models/metal_desk.glb');
	const groupRef = useRef<THREE.Group>(null);

	useEffect(() => {
		if (!groupRef.current) return;
		groupRef.current.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(groupRef.current);
		if (onReady) onReady(box.max.y);
		if (onBounds) onBounds({ topY: box.max.y, bottomY: box.min.y });
	}, [scene, onReady]);

	return (
		<group ref={groupRef} position={[0, -1.9, 0]} scale={3}>
			<primitive object={scene} castShadow receiveShadow />
		</group>
	);
}
