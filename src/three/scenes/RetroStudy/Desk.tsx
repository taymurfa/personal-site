import { useGLTF } from '@react-three/drei';

export function Desk() {
	const { scene } = useGLTF('/src/assets/models/metal_desk.glb');

	return (
		<primitive
			object={scene}
			position={[0, -1.9, 0]}
			scale={3}
			castShadow
			receiveShadow
		/>
	);
}
