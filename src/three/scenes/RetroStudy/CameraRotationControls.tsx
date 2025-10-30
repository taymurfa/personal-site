import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRotationControlsProps {
	minPolarAngle?: number;
	maxPolarAngle?: number;
	minAzimuthAngle?: number;
	maxAzimuthAngle?: number;
	sensitivity?: number;
	damping?: number;
	enabled?: boolean;
}

export function CameraRotationControls({
	minPolarAngle = 0,
	maxPolarAngle = Math.PI,
	minAzimuthAngle = -Infinity,
	maxAzimuthAngle = Infinity,
	sensitivity = 0.002,
	damping = 0.9,
	enabled = true,
}: CameraRotationControlsProps) {
	const { camera, gl } = useThree();
	const isDragging = useRef(false);
	const previousMousePosition = useRef({ x: 0, y: 0 });
	const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
	const velocity = useRef({ x: 0, y: 0 });

	useEffect(() => {
		const domElement = gl.domElement;

		const onMouseDown = (event: MouseEvent) => {
			if (!enabled) return;
			isDragging.current = true;
			previousMousePosition.current = {
				x: event.clientX,
				y: event.clientY,
			};
		};

		const onMouseMove = (event: MouseEvent) => {
			if (!isDragging.current || !enabled) return;

			const deltaX = event.clientX - previousMousePosition.current.x;
			const deltaY = event.clientY - previousMousePosition.current.y;

			previousMousePosition.current = {
				x: event.clientX,
				y: event.clientY,
			};

			// Update velocity for continued rotation
			velocity.current.x = deltaX * sensitivity;
			velocity.current.y = deltaY * sensitivity;
		};

		const onMouseUp = () => {
			isDragging.current = false;
			// Reset velocity when released
			velocity.current.x = 0;
			velocity.current.y = 0;
		};

		domElement.addEventListener('mousedown', onMouseDown);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);

		return () => {
			domElement.removeEventListener('mousedown', onMouseDown);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};
	}, [camera, gl, sensitivity, enabled]);

	useFrame(() => {
		if (!isDragging.current && Math.abs(velocity.current.x) < 0.0001 && Math.abs(velocity.current.y) < 0.0001) {
			return;
		}

		// Update euler angles
		euler.current.setFromQuaternion(camera.quaternion);

		// Apply velocity to rotation
		euler.current.y -= velocity.current.x;
		euler.current.x -= velocity.current.y;

		// Apply limits
		euler.current.x = Math.max(
			Math.min(euler.current.x, maxPolarAngle - Math.PI / 2),
			minPolarAngle - Math.PI / 2
		);

		if (minAzimuthAngle !== -Infinity || maxAzimuthAngle !== Infinity) {
			euler.current.y = Math.max(
				Math.min(euler.current.y, maxAzimuthAngle),
				minAzimuthAngle
			);
		}

		// Apply rotation to camera
		camera.quaternion.setFromEuler(euler.current);

		// Apply damping only when not actively dragging
		if (!isDragging.current) {
			velocity.current.x *= damping;
			velocity.current.y *= damping;
		}
	});

	return null;
}
