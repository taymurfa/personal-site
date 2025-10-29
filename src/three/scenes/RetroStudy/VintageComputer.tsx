import { useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { TerminalScreen } from './TerminalScreen';

interface VintageComputerProps {
	onScreenClick?: () => void;
}

export function VintageComputer({ onScreenClick }: VintageComputerProps) {
	const [isHovered, setIsHovered] = useState(false);
	const { scene } = useGLTF('/src/assets/models/computer_terminal.glb');

	return (
		<group position={[0, 0, 0]}>
			{/* Computer terminal model */}
			<primitive
				object={scene}
				scale={1}
				castShadow
				receiveShadow
			/>

			{/* Invisible clickable area for the screen */}
			<mesh
				position={[0, 0, 0.5]}
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
				<boxGeometry args={[0.85, 0.65, 0.1]} />
				<meshBasicMaterial transparent opacity={0} />
			</mesh>

			{/* Terminal display */}
			<group position={[0, 0, 0.5]}>
				<TerminalScreen isHighlighted={isHovered} />
			</group>
		</group>
	);
}
