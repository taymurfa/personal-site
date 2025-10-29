import { useMemo } from 'react';
import * as THREE from 'three';

export function HeroScene() {
	const grid = useMemo(() => new THREE.GridHelper(20, 20, 0x334155, 0x1f2937), []);
	return (
		<group>
			<primitive object={grid} position={[0, -1, 0]} />
			<mesh castShadow receiveShadow position={[0, 0, 0]}>
				<icosahedronGeometry args={[1, 0]} />
				<meshStandardMaterial color="#8b5cf6" roughness={0.3} metalness={0.2} />
			</mesh>
		</group>
	);
}


