import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RetroStudyScene } from './three/scenes/RetroStudy';
import { TerminalLandingPage } from './components/TerminalLandingPage';

function App() {
	const [showLandingPage, setShowLandingPage] = useState(false);
	const [fadeOut3D, setFadeOut3D] = useState(false);

	const handleEnterTerminal = () => {
		// Start fade out animation
		setFadeOut3D(true);
		// Show landing page after fade animation
		setTimeout(() => {
			setShowLandingPage(true);
		}, 1200);
	};

	const handleBackTo3D = () => {
		setShowLandingPage(false);
		setFadeOut3D(false);
	};

	return (
		<div className="app-root">
			<div className={`scene-container ${fadeOut3D ? 'fade-out' : ''}`}>
				<Canvas
					camera={{
						position: [0, -0.2, 1.2],
						fov: 70,
					}}
					shadows
					gl={{
						antialias: true,
						toneMapping: 0, // NoToneMapping for darker atmosphere
					}}
				>
					<Suspense fallback={null}>
						<RetroStudyScene onEnterTerminal={handleEnterTerminal} />
					</Suspense>
					<OrbitControls
						enableDamping
						dampingFactor={0.05}
						// Lock camera position - no zooming in/out
						enableZoom={false}
						enablePan={false}
						// Set distance constraints to lock position
						minDistance={0}
						maxDistance={0}
						// Vertical rotation limits (head tilt)
						// Looking up: ~45 degrees above horizon
						minPolarAngle={Math.PI / 2 - Math.PI / 4}
						// Looking down: ~90 degrees below horizon
						maxPolarAngle={Math.PI / 2 + Math.PI / 2}
						// Horizontal rotation limits (head turn)
						// ~120 degrees left and right = 240 degrees total
						minAzimuthAngle={-Math.PI * (2 / 3)}
						maxAzimuthAngle={Math.PI * (2 / 3)}
						// Look at the computer screen
						target={[0, -0.66, 0]}
					/>
				</Canvas>
				<div className="hud">
					<h1>Retro Workstation</h1>
					<p>Use your mouse to look around</p>
					<p className="hint">Click the screen to boot up</p>
				</div>
			</div>
			{showLandingPage && <TerminalLandingPage onBack={handleBackTo3D} />}
		</div>
	);
}

export default App;
