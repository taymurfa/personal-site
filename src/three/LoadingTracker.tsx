import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';

interface LoadingTrackerProps {
	onProgress: (progress: number, loaded: number, total: number, item: string) => void;
	onComplete: () => void;
}

/**
 * Must be placed inside Canvas to track asset loading via useProgress
 */
export function LoadingTracker({ onProgress, onComplete }: LoadingTrackerProps) {
	const { active, progress, loaded, total, item } = useProgress();

	useEffect(() => {
		const timer = setTimeout(() => {
			onProgress(progress, loaded, total, item);
		}, 0);
		return () => clearTimeout(timer);
	}, [progress, loaded, total, item, onProgress]);

	useEffect(() => {
		if (!active && loaded > 0) {
			const timer = setTimeout(() => {
				onComplete();
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [active, loaded, onComplete]);

	return null;
}
