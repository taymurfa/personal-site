import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DeskProps {
	onReady?: (topY: number) => void;
	onBounds?: (bounds: { topY: number; bottomY: number }) => void;
}

export function Desk({ onReady, onBounds }: DeskProps) {
	const { scene } = useGLTF('/assets/models/metal_desk.glb');
	const groupRef = useRef<THREE.Group>(null);

	useEffect(() => {
		if (!groupRef.current) return;

		const timer = setTimeout(() => {
			if (!groupRef.current) return;
			groupRef.current.updateWorldMatrix(true, true);
			const box = new THREE.Box3().setFromObject(groupRef.current);

			if (onReady) onReady(box.max.y);
			if (onBounds) onBounds({ topY: box.max.y, bottomY: box.min.y });
		}, 0);

		return () => clearTimeout(timer);
	}, [scene, onReady, onBounds]);

	return (
		<group ref={groupRef} position={[0, -1.2, 0]} scale={1.7}>
			<primitive object={scene} castShadow receiveShadow />
		</group>
	);
}
