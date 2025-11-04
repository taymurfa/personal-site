import { useState, useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { VintageComputer } from './VintageComputer';
import { Desk } from './Desk';
import { ChairModel } from './ChairModel';
import { DeskLamp } from './DeskLamp';
import * as THREE from 'three';

interface RetroStudySceneProps {
	onEnterTerminal?: () => void;
	onObjectInteraction?: (isInteracting: boolean) => void;
	onSceneReady?: () => void;
	assetsReady?: boolean;
	resetCameraSignal?: number;
}

export function RetroStudyScene({ onEnterTerminal, onObjectInteraction, onSceneReady, assetsReady = false, resetCameraSignal = 0 }: RetroStudySceneProps) {
    const [deskTopY, setDeskTopY] = useState<number | null>(null);
    const furnitureRef = useRef<THREE.Group>(null);
    const [furnitureZ, setFurnitureZ] = useState(0);
    const [furnitureY, setFurnitureY] = useState<number | null>(null);
    const [isPositioned, setIsPositioned] = useState(false);
    const [computerPoweredOn, setComputerPoweredOn] = useState(false);

    // Camera zoom animation state
    const { camera } = useThree();
    const [isZooming, setIsZooming] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const zoomProgress = useRef(0);
    const resetProgress = useRef(0);
    const startCameraPos = useRef(new THREE.Vector3());
    const startCameraRot = useRef(new THREE.Quaternion());
    const targetCameraPos = useRef(new THREE.Vector3());
    const targetCameraRot = useRef(new THREE.Quaternion());
    const startFOV = useRef(75);
    const targetFOV = useRef(50);
    const originalCameraPos = useRef(new THREE.Vector3(0.1, 0.6, -0.1));
    const originalCameraRot = useRef(new THREE.Quaternion());
    const originalFOV = useRef(70);

    // Store original camera orientation on mount
    useEffect(() => {
        originalCameraPos.current.copy(camera.position);
        originalCameraRot.current.copy(camera.quaternion);
        if (camera instanceof THREE.PerspectiveCamera) {
            originalFOV.current = camera.fov;
        }
    }, [camera]);

    // Handle reset camera signal
    useEffect(() => {
        if (resetCameraSignal > 0) {
            // Store current position and rotation as starting point
            startCameraPos.current.copy(camera.position);
            startCameraRot.current.copy(camera.quaternion);
            if (camera instanceof THREE.PerspectiveCamera) {
                startFOV.current = camera.fov;
            }

            // Set targets to original values
            targetCameraPos.current.copy(originalCameraPos.current);
            targetCameraRot.current.copy(originalCameraRot.current);
            targetFOV.current = originalFOV.current;

            // Start reset animation
            resetProgress.current = 0;
            setIsResetting(true);
        }
    }, [resetCameraSignal, camera]);

    const handleDeskBounds = useCallback((bounds: { topY: number; bottomY: number }) => {
        const floorY = -1.9;
        const epsilon = 0.005;
        const delta = (floorY + epsilon) - bounds.bottomY;
        setFurnitureY(delta);
        setDeskTopY(bounds.topY + delta);
        setIsPositioned(true);
        if (onSceneReady) onSceneReady();
    }, [onSceneReady]);

    // Handle camera zoom to screen
    const handleZoomToScreen = useCallback((screenWorldPos: THREE.Vector3) => {
        // Store starting position and rotation
        startCameraPos.current.copy(camera.position);
        startCameraRot.current.copy(camera.quaternion);

        // Store starting FOV and set target FOV
        if (camera instanceof THREE.PerspectiveCamera) {
            startFOV.current = camera.fov;
            targetFOV.current = 45; // Narrower FOV for better readability
        }

        // Calculate target position - position camera in front of the screen
        const cameraDistance = 0.35; // Distance from screen
        const lookAtOffset = new THREE.Vector3(0, 0, 0.05); // Slight offset to look at center

        // Calculate camera position directly in front of screen
        targetCameraPos.current.set(
            screenWorldPos.x,
            screenWorldPos.y,
            screenWorldPos.z + cameraDistance
        );

        // Calculate target rotation to look at the screen
        const lookAtTarget = screenWorldPos.clone().add(lookAtOffset);
        const tempCamera = camera.clone();
        tempCamera.position.copy(targetCameraPos.current);
        tempCamera.lookAt(lookAtTarget);
        targetCameraRot.current.copy(tempCamera.quaternion);

        // Start zoom animation
        zoomProgress.current = 0;
        setIsZooming(true);

        // Notify that we're interacting with an object
        if (onObjectInteraction) {
            onObjectInteraction(true);
        }
    }, [camera, onObjectInteraction]);

    // Animate camera zoom and reset
    useFrame((_, delta) => {
        // Handle reset animation
        if (isResetting) {
            resetProgress.current += delta * 1.5;

            if (resetProgress.current >= 1) {
                // Animation complete
                resetProgress.current = 1;
                camera.position.copy(targetCameraPos.current);
                camera.quaternion.copy(targetCameraRot.current);

                // Set final FOV
                if (camera instanceof THREE.PerspectiveCamera) {
                    camera.fov = targetFOV.current;
                    camera.updateProjectionMatrix();
                }

                setIsResetting(false);
                return;
            }

            // Ease-in-out cubic for smooth animation
            const t = resetProgress.current;
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Interpolate position
            camera.position.lerpVectors(
                startCameraPos.current,
                targetCameraPos.current,
                eased
            );

            // Interpolate rotation
            camera.quaternion.slerpQuaternions(
                startCameraRot.current,
                targetCameraRot.current,
                eased
            );

            // Interpolate FOV
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.fov = THREE.MathUtils.lerp(
                    startFOV.current,
                    targetFOV.current,
                    eased
                );
                camera.updateProjectionMatrix();
            }
            return;
        }

        // Handle zoom animation
        if (isZooming) {
            // Increment progress (takes ~2 seconds to complete for smoother animation)
            zoomProgress.current += delta * 0.5;

            if (zoomProgress.current >= 1) {
                // Animation complete
                zoomProgress.current = 1;
                camera.position.copy(targetCameraPos.current);
                camera.quaternion.copy(targetCameraRot.current);

                // Set final FOV
                if (camera instanceof THREE.PerspectiveCamera) {
                    camera.fov = targetFOV.current;
                    camera.updateProjectionMatrix();
                }

                setIsZooming(false);

                // Re-enable camera controls after animation
                if (onObjectInteraction) {
                    onObjectInteraction(false);
                }
                return;
            }

            // Ease-in-out quartic for smoother animation
            const t = zoomProgress.current;
            const eased = t < 0.5
                ? 8 * t * t * t * t
                : 1 - Math.pow(-2 * t + 2, 4) / 2;

            // Interpolate position
            camera.position.lerpVectors(
                startCameraPos.current,
                targetCameraPos.current,
                eased
            );

            // Interpolate rotation
            camera.quaternion.slerpQuaternions(
                startCameraRot.current,
                targetCameraRot.current,
                eased
            );

            // Interpolate FOV
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.fov = THREE.MathUtils.lerp(
                    startFOV.current,
                    targetFOV.current,
                    eased
                );
                camera.updateProjectionMatrix();
            }
        }
    });

    // Align groups so their back-most edge sits flush with back wall (z = -2.5)
    useEffect(() => {
        const wallZ = -2.5;
        const epsilon = 0.002;

        if (furnitureRef.current && furnitureY !== null && isPositioned) {
            furnitureRef.current.updateWorldMatrix(true, true);
            const box = new THREE.Box3().setFromObject(furnitureRef.current);
            const minZ = box.min.z;
            const delta = (wallZ + epsilon) - minZ;
            if (Math.abs(delta) > 1e-4) setFurnitureZ((z) => z + delta);
        }

    }, [furnitureY, isPositioned]);
	const handleScreenClick = () => {
		if (onEnterTerminal) {
			onEnterTerminal();
		}
	};

	return (
		<>
            {/* Desk with computer setup */}
            <group ref={furnitureRef} position={[0, furnitureY ?? 0, furnitureZ]}>
                <Desk onBounds={handleDeskBounds} />
                <group position={[0.1, 0, -0.4]}>
                    <VintageComputer
                        onScreenClick={handleScreenClick}
                        deskTopY={deskTopY ?? undefined}
                        onZoomToScreen={handleZoomToScreen}
                        onPowerChange={setComputerPoweredOn}
                    />
                </group>
                <DeskLamp
                    deskTopY={deskTopY ?? undefined}
                    computerPoweredOn={computerPoweredOn}
                    assetsReady={assetsReady}
                />
            </group>

            <ChairModel />

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
		</>
	);
}
