import { useState } from 'react';
import { VintageComputer } from './VintageComputer';
import { Desk } from './Desk';
import { Bookshelves } from './Bookshelves';
import { DeskLamp } from './DeskLamp';
import { CameraController } from './CameraController';
import { Environment } from '@react-three/drei';

interface RetroStudySceneProps {
	onEnterTerminal?: () => void;
}

export function RetroStudyScene({ onEnterTerminal }: RetroStudySceneProps) {
	const [isZoomedIn, setIsZoomedIn] = useState(false);

	// Camera positions (from seated perspective)
	const defaultCameraPosition: [number, number, number] = [0, -0.2, 1.2];
	const zoomedCameraPosition: [number, number, number] = [0, -0.3, 0.5];
	const defaultLookAt: [number, number, number] = [0, -0.66, 0];
	const zoomedLookAt: [number, number, number] = [0, -0.66, 0];

	const handleScreenClick = () => {
		if (!isZoomedIn) {
			setIsZoomedIn(true);
		}
	};

	const handleZoomComplete = () => {
		if (isZoomedIn && onEnterTerminal) {
			// Trigger terminal transition after zoom completes
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

			{/* Camera Controller for zoom animation */}
			<CameraController
				targetPosition={isZoomedIn ? zoomedCameraPosition : defaultCameraPosition}
				targetLookAt={isZoomedIn ? zoomedLookAt : defaultLookAt}
				onAnimationComplete={handleZoomComplete}
			/>

			{/* Desk with computer setup */}
			<group>
				<Desk />
				<group position={[0, -0.66, 0]}>
					<VintageComputer onScreenClick={handleScreenClick} />
				</group>
				<DeskLamp />
			</group>

			{/* Bookshelves in the background */}
			<Bookshelves />

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
