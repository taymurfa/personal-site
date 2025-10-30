import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RetroStudyScene } from './three/scenes/RetroStudy';
import { TerminalLandingPage } from './components/TerminalLandingPage';
import { CameraRotationControls } from './three/scenes/RetroStudy/CameraRotationControls';

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
						position: [0, 0.5, 0],
						rotation: [0, 0, 0],
						fov: 65,
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
					<CameraRotationControls
						minPolarAngle={Math.PI / 6}
						maxPolarAngle={Math.PI * 0.85}
						minAzimuthAngle={-Math.PI * (115 / 180)}
						maxAzimuthAngle={Math.PI * (115 / 180)}
						sensitivity={0.002}
						damping={0.7}
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
