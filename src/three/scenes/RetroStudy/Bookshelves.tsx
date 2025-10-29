import { useMemo } from 'react';
import * as THREE from 'three';

export function Bookshelves() {
	// Create random book colors
	const bookColors = useMemo(() => [
		'#8b4513', '#654321', '#2c1810', '#4a3020',
		'#5c4033', '#704214', '#3e2723', '#6b4423',
		'#4e342e', '#3a2618', '#8b6f47', '#5d4e37',
	], []);

	const shelfMaterial = useMemo(() => new THREE.MeshStandardMaterial({
		color: '#3a2817',
		roughness: 0.7,
		metalness: 0.05,
	}), []);

	// Generate random books
	const books = useMemo(() => {
		const result = [];
		const shelves = 4;
		const booksPerShelf = 15;

		for (let shelf = 0; shelf < shelves; shelf++) {
			for (let i = 0; i < booksPerShelf; i++) {
				const width = Math.random() * 0.08 + 0.04;
				const height = Math.random() * 0.2 + 0.15;
				const depth = 0.12;

				const x = -1.0 + (i / booksPerShelf) * 2.0;
				const y = -0.3 + shelf * 0.4;
				const z = -1.85;

				const color = bookColors[Math.floor(Math.random() * bookColors.length)];
				const rotation = (Math.random() - 0.5) * 0.1; // Slight tilt

				result.push({
					key: `book-${shelf}-${i}`,
					position: [x, y, z] as [number, number, number],
					size: [width, height, depth] as [number, number, number],
					color,
					rotation: [0, rotation, 0] as [number, number, number],
				});
			}
		}

		return result;
	}, [bookColors]);

	return (
		<group position={[0, 0, 0]}>
			{/* Back panel of bookshelf */}
			<mesh position={[0, 0.5, -1.9]} receiveShadow>
				<boxGeometry args={[2.5, 2.0, 0.05]} />
				<primitive object={shelfMaterial} attach="material" />
			</mesh>

			{/* Shelves */}
			{Array.from({ length: 5 }).map((_, i) => (
				<mesh
					key={`shelf-${i}`}
					position={[0, -0.5 + i * 0.4, -1.8]}
					castShadow
					receiveShadow
				>
					<boxGeometry args={[2.4, 0.03, 0.25]} />
					<primitive object={shelfMaterial} attach="material" />
				</mesh>
			))}

			{/* Left side panel */}
			<mesh position={[-1.2, 0.5, -1.78]} castShadow>
				<boxGeometry args={[0.05, 2.0, 0.25]} />
				<primitive object={shelfMaterial} attach="material" />
			</mesh>

			{/* Right side panel */}
			<mesh position={[1.2, 0.5, -1.78]} castShadow>
				<boxGeometry args={[0.05, 2.0, 0.25]} />
				<primitive object={shelfMaterial} attach="material" />
			</mesh>

			{/* Books */}
			{books.map((book) => (
				<mesh
					key={book.key}
					position={book.position}
					rotation={book.rotation}
					castShadow
					receiveShadow
				>
					<boxGeometry args={book.size} />
					<meshStandardMaterial
						color={book.color}
						roughness={0.8}
						metalness={0.0}
					/>
				</mesh>
			))}

			{/* A few scattered papers/objects on shelves for detail */}
			<mesh position={[0.8, 0.3, -1.78]} rotation={[0, 0.3, 0]} castShadow>
				<boxGeometry args={[0.12, 0.01, 0.15]} />
				<meshStandardMaterial color="#e8dcc0" roughness={0.9} />
			</mesh>

			<mesh position={[-0.6, 0.7, -1.78]} rotation={[0, -0.2, 0]} castShadow>
				<boxGeometry args={[0.1, 0.01, 0.13]} />
				<meshStandardMaterial color="#d4c5a9" roughness={0.9} />
			</mesh>
		</group>
	);
}
