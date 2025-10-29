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
						position: [-0.5, 1.5, 2.2],
						fov: 50,
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
						dampingFactor={0.15}
						enableZoom={false}
						enablePan={false}
						minPolarAngle={0}
						maxPolarAngle={Math.PI}
						minAzimuthAngle={-Math.PI * (2 / 3)}
						maxAzimuthAngle={Math.PI * (2 / 3)}
						target={[0, 1, 0.5]}
						rotateSpeed = {0.3}
					/>
				</Canvas>
				<div className="hud">
					<h1>Taymur Faruqui</h1>
					<p>Use your mouse to look around</p>
					<p className="hint">Click the screen to boot up</p>
				</div>
			</div>
			{showLandingPage && <TerminalLandingPage onBack={handleBackTo3D} />}
		</div>
	);
}

export default App;
