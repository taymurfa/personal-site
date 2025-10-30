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
}

export function RetroStudyScene({ onEnterTerminal, onObjectInteraction, onSceneReady, assetsReady = false }: RetroStudySceneProps) {
    const [deskTopY, setDeskTopY] = useState<number | null>(null);
    const furnitureRef = useRef<THREE.Group>(null);
    const [furnitureZ, setFurnitureZ] = useState(0);
    const [furnitureY, setFurnitureY] = useState<number | null>(null);
    const [isPositioned, setIsPositioned] = useState(false);
    const [computerPoweredOn, setComputerPoweredOn] = useState(false);

    // Camera zoom animation state
    const { camera } = useThree();
    const [isZooming, setIsZooming] = useState(false);
    const zoomProgress = useRef(0);
    const startCameraPos = useRef(new THREE.Vector3());
    const startCameraRot = useRef(new THREE.Quaternion());
    const targetCameraPos = useRef(new THREE.Vector3());
    const targetCameraRot = useRef(new THREE.Quaternion());

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

    // Animate camera zoom
    useFrame((_, delta) => {
        if (!isZooming) return;

        // Increment progress (takes ~1 second to complete)
        zoomProgress.current += delta * 1.5;

        if (zoomProgress.current >= 1) {
            // Animation complete
            zoomProgress.current = 1;
            camera.position.copy(targetCameraPos.current);
            camera.quaternion.copy(targetCameraRot.current);
            setIsZooming(false);

            // Re-enable camera controls after animation
            if (onObjectInteraction) {
                onObjectInteraction(false);
            }
            return;
        }

        // Ease-in-out cubic for smooth animation
        const t = zoomProgress.current;
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
