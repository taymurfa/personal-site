import { useState, useCallback, useEffect, useRef } from 'react';
import { VintageComputer } from './VintageComputer';
import { Desk } from './Desk';
import { DeskLamp } from './DeskLamp';
import { ChairModel } from './ChairModel';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

interface RetroStudySceneProps {
	onEnterTerminal?: () => void;
}

export function RetroStudyScene({ onEnterTerminal }: RetroStudySceneProps) {
    const [deskTopY, setDeskTopY] = useState<number | null>(null);
    const furnitureRef = useRef<THREE.Group>(null);
    const [furnitureZ, setFurnitureZ] = useState(0);
    const [furnitureY, setFurnitureY] = useState(0);

    const handleDeskBounds = useCallback((bounds: { topY: number; bottomY: number }) => {
        const floorY = -1.9;
        const epsilon = 0.005;
        const delta = (floorY + epsilon) - bounds.bottomY;
        setFurnitureY(delta);
        setDeskTopY(bounds.topY + delta);
    }, []);

    // Align groups so their back-most edge sits flush with back wall (z = -2.5)
    useEffect(() => {
        const wallZ = -2.5;
        const epsilon = 0.002;

        if (furnitureRef.current) {
            furnitureRef.current.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(furnitureRef.current);
            const minZ = box.min.z;
            const delta = (wallZ + epsilon) - minZ;
            if (Math.abs(delta) > 1e-4) setFurnitureZ((z) => z + delta);
        }

    }, []);
	const handleScreenClick = () => {
		if (onEnterTerminal) {
			onEnterTerminal();
		}
	};

	return (
		<>
			{/* Ambient lighting - very dim for moody atmosphere */}
			<ambientLight intensity={0.15} color="#1a1a2e" />

			{/* Subtle overhead light - dim and warm */}
			<pointLight
				position={[0, 3, -1]}
				intensity={0.8}
				distance={8}
				color="#4a3520"
				decay={2}
			/>

			{/* Subtle rim light from behind to separate objects */}
			<pointLight
				position={[0, 2, -3]}
				intensity={0.3}
				distance={6}
				color="#2a2a3e"
			/>

			{/* Green glow from the computer screen */}
			<pointLight
				position={[0, 0, 0.3]}
				intensity={0.5}
				distance={2}
				color="#00ff00"
				decay={2}
			/>

            {/* Desk with computer setup */}
            <group ref={furnitureRef} position={[0, furnitureY, furnitureZ]}>
                <Desk onBounds={handleDeskBounds} />
                <group position={[0, 0, 0]}>
                    <VintageComputer onScreenClick={handleScreenClick} deskTopY={deskTopY ?? undefined} />
                </group>
                <DeskLamp />
            </group>

            {/* Chair - replaced with uploaded asset */}
            <ChairModel />

            {/* Bookshelves removed */}

			{/* Floor */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, -1.9, 0]}
				receiveShadow
			>
				<planeGeometry args={[20, 20]} />
				<meshStandardMaterial
					color="#1a1410"
					roughness={0.9}
					metalness={0.0}
				/>
			</mesh>

			{/* Back wall */}
			<mesh
				position={[0, 0.5, -2.5]}
				receiveShadow
			>
				<planeGeometry args={[20, 10]} />
				<meshStandardMaterial
					color="#2a2218"
					roughness={0.95}
					metalness={0.0}
				/>
			</mesh>

			{/* Side walls for depth */}
			<mesh
				position={[-5, 0.5, 0]}
				rotation={[0, Math.PI / 2, 0]}
				receiveShadow
			>
				<planeGeometry args={[20, 10]} />
				<meshStandardMaterial
					color="#2a2218"
					roughness={0.95}
					metalness={0.0}
				/>
			</mesh>

			<mesh
				position={[5, 0.5, 0]}
				rotation={[0, -Math.PI / 2, 0]}
				receiveShadow
			>
				<planeGeometry args={[20, 10]} />
				<meshStandardMaterial
					color="#2a2218"
					roughness={0.95}
					metalness={0.0}
				/>
			</mesh>

			{/* Ceiling */}
			<mesh
				rotation={[Math.PI / 2, 0, 0]}
				position={[0, 3.5, 0]}
				receiveShadow
			>
				<planeGeometry args={[20, 20]} />
				<meshStandardMaterial
					color="#1a1a20"
					roughness={0.95}
					metalness={0.0}
				/>
			</mesh>

			{/* Atmospheric fog */}
			<fog attach="fog" args={['#0a0808', 3, 12]} />

			{/* Environment preset for subtle reflections */}
			<Environment preset="night" />
		</>
	);
}

