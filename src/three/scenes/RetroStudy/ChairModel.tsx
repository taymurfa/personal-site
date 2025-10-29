import { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function ChairModel() {
    const { scene } = useGLTF('/src/assets/models/old_leather_office_chair.glb');
    const groupRef = useRef<THREE.Group>(null);
    const [yOffset, setYOffset] = useState(0);

    useEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(groupRef.current);
        const floorY = -1.9;
        const epsilon = 0.005;
        const minY = box.min.y;
        const delta = (floorY + epsilon) - minY;
        if (Math.abs(delta) > 1e-4) setYOffset((y) => y + delta);
    }, [scene]);

    return (
        <group ref={groupRef} position={[0, yOffset, 2.2]} rotation={[0, Math.PI, 0]}>
            <primitive object={scene} castShadow receiveShadow />
        </group>
    );
}

