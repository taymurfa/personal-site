import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';

interface CameraControllerProps {
	targetPosition: [number, number, number] | null;
	targetLookAt: [number, number, number] | null;
	onAnimationComplete?: () => void;
}

export function CameraController({ targetPosition, targetLookAt, onAnimationComplete }: CameraControllerProps) {
	const { camera } = useThree();
	const isAnimating = useRef(false);
	const currentTarget = useRef(new Vector3());
	const currentLookAt = useRef(new Vector3());
	const targetPos = useRef(new Vector3());
	const targetLook = useRef(new Vector3());

	useEffect(() => {
		if (targetPosition && targetLookAt) {
			isAnimating.current = true;
			targetPos.current.set(...targetPosition);
			targetLook.current.set(...targetLookAt);
			currentTarget.current.copy(camera.position);
			currentLookAt.current.set(0, -0.3, 0); // Default lookAt
		}
	}, [targetPosition, targetLookAt, camera]);

	useFrame(() => {
		if (isAnimating.current) {
			const lerpFactor = 0.08;

			// Lerp camera position
			currentTarget.current.lerp(targetPos.current, lerpFactor);
			camera.position.copy(currentTarget.current);

			// Lerp camera lookAt
			currentLookAt.current.lerp(targetLook.current, lerpFactor);
			camera.lookAt(currentLookAt.current);

			// Check if animation is complete
			const posDistance = camera.position.distanceTo(targetPos.current);
			const lookDistance = currentLookAt.current.distanceTo(targetLook.current);

			if (posDistance < 0.01 && lookDistance < 0.01) {
				isAnimating.current = false;
				if (onAnimationComplete) {
					onAnimationComplete();
				}
			}
		}
	});

	return null;
}
