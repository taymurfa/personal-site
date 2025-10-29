import { useMemo } from 'react';
import * as THREE from 'three';

export function Chair() {
	// Create fabric material for seat/backrest
	const fabricMaterial = useMemo(() => {
		return new THREE.MeshStandardMaterial({
			color: '#2a2a3a',
			roughness: 0.8,
			metalness: 0.1,
		});
	}, []);

	const metalMaterial = useMemo(() => {
		return new THREE.MeshStandardMaterial({
			color: '#3a3a3a',
			roughness: 0.4,
			metalness: 0.7,
		});
	}, []);

	return (
		<group position={[0, 0, 2.2]} rotation={[0, Math.PI, 0]}>
			{/* Seat cushion */}
			<mesh position={[0, -0.9, 0]} castShadow receiveShadow>
				<boxGeometry args={[0.5, 0.1, 0.5]} />
				<primitive object={fabricMaterial} attach="material" />
			</mesh>

			{/* Backrest - now behind seat after 180 rotation */}
			<mesh position={[0, -0.6, -0.25]} castShadow receiveShadow>
				<boxGeometry args={[0.5, 0.6, 0.08]} />
				<primitive object={fabricMaterial} attach="material" />
			</mesh>

			{/* Central pole from seat to base */}
			<mesh position={[0, -1.1, 0]} castShadow>
				<cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
				<primitive object={metalMaterial} attach="material" />
			</mesh>

			{/* Wheeled base - 5-star pattern */}
			<mesh position={[0, -1.3, 0]} castShadow>
				<cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
				<primitive object={metalMaterial} attach="material" />
			</mesh>

			{/* Base arms (5 spokes) */}
			{Array.from({ length: 5 }).map((_, i) => {
				const angle = (i / 5) * Math.PI * 2;
				const x = Math.cos(angle) * 0.25;
				const z = Math.sin(angle) * 0.25;

				return (
					<group key={`spoke-${i}`} position={[0, -1.31, 0]}>
						<mesh
							position={[x / 2, 0, z / 2]}
							rotation={[0, angle, 0]}
							castShadow
						>
							<boxGeometry args={[0.25, 0.02, 0.04]} />
							<primitive object={metalMaterial} attach="material" />
						</mesh>
						{/* Small wheel at end of spoke */}
						<mesh position={[x, -0.02, z]} castShadow>
							<cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
							<primitive object={metalMaterial} attach="material" />
						</mesh>
					</group>
				);
			})}

			{/* Armrests - facing forward toward desk */}
			<mesh position={[-0.22, -0.8, -0.1]} castShadow>
				<boxGeometry args={[0.06, 0.05, 0.3]} />
				<primitive object={metalMaterial} attach="material" />
			</mesh>

			<mesh position={[0.22, -0.8, -0.1]} castShadow>
				<boxGeometry args={[0.06, 0.05, 0.3]} />
				<primitive object={metalMaterial} attach="material" />
			</mesh>
		</group>
	);
}
