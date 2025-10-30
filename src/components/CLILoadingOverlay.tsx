import { useEffect, useMemo, useRef, useState } from 'react';

interface CLILoadingOverlayProps {
	active?: boolean;
	progress?: number;
	loaded?: number;
	total?: number;
	item?: string;
	onComplete?: () => void;
	minVisibleMs?: number;
}

const spinnerFrames = ['|', '/', '-', '\\'];

export function CLILoadingOverlay({
	active = false,
	progress = 0,
	loaded = 0,
	total = 0,
	item = '',
	onComplete,
	minVisibleMs = 600
}: CLILoadingOverlayProps) {
	const [completeAt, setCompleteAt] = useState<number | null>(null);
	const [isVisible, setIsVisible] = useState(true);
	const handledComplete = useRef(false);
	const [spinnerStep, setSpinnerStep] = useState(0);
	const hasStarted = useRef(false);

	useEffect(() => {
		if (!hasStarted.current && (active || loaded > 0 || total > 0)) {
			hasStarted.current = true;
		}
	}, [active, loaded, total]);

	useEffect(() => {
		if (!hasStarted.current || completeAt !== null || active) return;
		if (!active && completeAt === null) {
			setCompleteAt(performance.now());
		}
	}, [active, completeAt]);

	useEffect(() => {
		if (completeAt === null) return;

		if (!handledComplete.current) {
			handledComplete.current = true;
			const completeTimer = setTimeout(() => {
				onComplete?.();
			}, 200);
			const visibilityTimer = setTimeout(() => {
				setIsVisible(false);
			}, Math.max(minVisibleMs, 800));

			return () => {
				clearTimeout(completeTimer);
				clearTimeout(visibilityTimer);
			};
		}
	}, [completeAt, minVisibleMs, onComplete]);

	useEffect(() => {
		if (completeAt !== null) return;
		const tick = setInterval(() => {
			setSpinnerStep((step) => (step + 1) % spinnerFrames.length);
		}, 120);
		return () => clearInterval(tick);
	}, [completeAt]);

	const summary = useMemo(() => {
		const totalCount = total || Math.max(loaded, 1);
		const pct = totalCount > 0 ? Math.round(progress) : active ? Math.round(progress) : 100;
		const latestRaw = item ? item.replace(/^\//, '') : active ? 'initializing assets...' : 'idle';
		const latest = latestRaw.length > 48 ? `${latestRaw.slice(0, 45)}...` : latestRaw;
		const status = completeAt ? 'ready' : 'loading';
		const spinner = completeAt ? ' ' : spinnerFrames[spinnerStep];

		return {
			pct,
			totalCount,
			latest,
			status,
			spinner,
		};
	}, [active, completeAt, item, loaded, progress, spinnerStep, total]);

	if (!isVisible) return null;

	const isComplete = completeAt !== null;
	const className = `cli-loader${isComplete ? ' cli-loader--complete' : ''}`;
	const barSegments = 24;
	const filled = Math.max(0, Math.min(barSegments, Math.round((summary.pct / 100) * barSegments)));
	const bar = `${'#'.repeat(filled)}${'.'.repeat(barSegments - filled)}`;

	return (
		<div className={className}>
			<div className="cli-loader__content">
				<pre className="cli-loader__text">
{`boot> status     ${summary.status}${isComplete ? '' : ` ${summary.spinner}`}
boot> progress   [${bar}] ${summary.pct.toString().padStart(3, ' ')}%
boot> assets     ${loaded}/${summary.totalCount}
boot> current    ${summary.latest}
${isComplete ? 'boot> assets verified\nboot> press POWER to continue' : 'boot> awaiting verification...'}`}
				</pre>
			</div>
		</div>
	);
}
