import { Suspense, useCallback, useState, lazy, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { CLILoadingOverlay } from './components/CLILoadingOverlay';
import { LoadingTracker } from './three/LoadingTracker';

const RetroStudyScene = lazy(() => import('./three/scenes/RetroStudy').then(m => ({ default: m.RetroStudyScene })));
const TerminalLandingPage = lazy(() => import('./components/TerminalLandingPage').then(m => ({ default: m.TerminalLandingPage })));
const CameraRotationControls = lazy(() => import('./three/scenes/RetroStudy/CameraRotationControls').then(m => ({ default: m.CameraRotationControls })));

const MIN_LOADING_TIME = 1500;

function App() {
	const [showLandingPage, setShowLandingPage] = useState(false);
	const [fadeOut3D, setFadeOut3D] = useState(false);
	const [assetsReady, setAssetsReady] = useState(false);
	const [loadingActive, setLoadingActive] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [loadingLoaded, setLoadingLoaded] = useState(0);
	const [loadingTotal, setLoadingTotal] = useState(0);
	const [loadingItem, setLoadingItem] = useState('');
	const startTimeRef = useRef(Date.now());
	const assetsLoadedRef = useRef(false);

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

	const handleLoadingProgress = useCallback((progress: number, loaded: number, total: number, item: string) => {
		setLoadingActive(true);
		setLoadingProgress(progress);
		setLoadingLoaded(loaded);
		setLoadingTotal(total);
		setLoadingItem(item);
	}, []);

	const handleAssetsReady = useCallback(() => {
		assetsLoadedRef.current = true;
		const elapsed = Date.now() - startTimeRef.current;
		const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

		setTimeout(() => {
			setLoadingActive(false);
			setAssetsReady(true);
		}, remaining);
	}, []);

	const sceneClassName = `scene-container ${fadeOut3D ? 'fade-out' : ''} ${assetsReady ? 'loaded' : 'is-loading'}`;

	return (
		<div className="app-root">
			<CLILoadingOverlay
				active={loadingActive}
				progress={loadingProgress}
				loaded={loadingLoaded}
				total={loadingTotal}
				item={loadingItem}
				onComplete={handleAssetsReady}
			/>
			<div className={sceneClassName}>
				<Canvas
					camera={{
						position: [0.1, 0.6, 0],
						rotation: [0, 0, 0],
						fov: 65,
					}}
					shadows
					gl={{
						antialias: true,
						toneMapping: 0, // NoToneMapping for darker atmosphere
					}}
				>
					<LoadingTracker onProgress={handleLoadingProgress} onComplete={handleAssetsReady} />
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
				</div>
				{showLandingPage && <TerminalLandingPage onBack={handleBackTo3D} />}
			</div>
		);
	}

export default App;
