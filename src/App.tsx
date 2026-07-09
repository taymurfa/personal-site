import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { CrtTv } from './CrtTv';

type NowPlaying = {
	isPlaying: boolean;
	title: string;
	artist: string;
	album: string;
	albumArt: string;
	url: string;
	progressMs: number;
	durationMs: number;
	id?: string;
	previewUrl?: string;
};

function App() {
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
	const [activePage, setActivePage] = useState<'live' | 'desk' | 'log' | 'about'>('live');
	const [menuOpen, setMenuOpen] = useState(false);
	const [projIndex, setProjIndex] = useState(0);

	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.replace('#', '') || 'live';
			if (['live', 'desk', 'log', 'about'].includes(hash)) {
				setActivePage(hash as any);
			}
		};

		window.addEventListener('hashchange', handleHashChange);
		handleHashChange();

		return () => window.removeEventListener('hashchange', handleHashChange);
	}, []);

	const streamUrl = import.meta.env.VITE_LIVE_STREAM_URL?.trim();
	const hasStream = Boolean(streamUrl);

	useEffect(() => {
		let isMounted = true;

		const loadNowPlaying = async () => {
			try {
				const response = await fetch('/api/spotify-now-playing');
				if (!response.ok) {
					throw new Error('Spotify response was not ok');
				}

				const data = await response.json() as NowPlaying | { isPlaying: false };
				if (isMounted) {
					if ('title' in data) {
						setNowPlaying(data);
					} else {
						setNowPlaying(null);
					}
				}
			} catch {
				if (isMounted) {
					setNowPlaying(null);
				}
			}
		};

		loadNowPlaying();
		const interval = window.setInterval(loadNowPlaying, 30000);

		return () => {
			isMounted = false;
			window.clearInterval(interval);
		};
	}, []);

	return (
		<main className="home-screen">
			<CrtTv>
			<section className="room-frame" aria-label="Live room home">
				{hasStream && (
					<video
						autoPlay
						className="stream-video"
						controls
						muted
						playsInline
						src={streamUrl}
					/>
				)}

				<div className="ambient" aria-hidden={hasStream}>
					<i /><i /><i />
				</div>

				<div className={`room-overlay ${activePage !== 'live' ? 'active' : ''}`} onClick={() => window.location.hash = 'live'} />

				<div className={`osd-menu ${activePage !== 'live' ? 'behind' : ''}`}>
					<button type="button" className="osd-menu-trigger" onClick={() => setMenuOpen((o) => !o)}>
						Taymur Faruqui ▾
					</button>
					{menuOpen && (
						<nav className="osd-dropdown">
							<a href="#desk" onClick={() => setMenuOpen(false)}>Portfolio</a>
							<a href="#log" onClick={() => setMenuOpen(false)}>Blog</a>
							<a href="#about" onClick={() => setMenuOpen(false)}>Bio</a>
						</nav>
					)}
				</div>

				{activePage === 'log' && <FeedPage />}

				{activePage !== 'live' && activePage !== 'about' && activePage !== 'log' && (
					<aside className="left-stack expanded" aria-label="Content panel">
						<nav className="folder-tabs" aria-label="Projects">
							{PROJECTS.map((p, i) => (
								<a
									key={p.title}
									href="#desk"
									className={activePage === 'desk' && i === projIndex ? 'active' : ''}
									onClick={() => setProjIndex(i)}
								>
									{p.title}
								</a>
							))}
						</nav>
						<a className="panel-close" href="#live" aria-label="Close panel">✕</a>
						<div className="page-content-area">
							<div className="page-scroll" key={activePage}>
								{activePage === 'desk' && <PortfolioPage index={projIndex} setIndex={setProjIndex} />}
							</div>
						</div>
					</aside>
				)}

				<a
					className="now-playing"
					href="https://open.spotify.com/user/taymurfa"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Spotify profile"
				>
					Now playing: {nowPlaying ? `${nowPlaying.title} — ${nowPlaying.artist}` : 'signal lost'}
				</a>
			</section>
			</CrtTv>
			{activePage === 'about' && <BioPage />}
		</main>
	);
}

interface Project {
	title: string;
	subtitle: string;
	desc: string;
	longDesc: string;
	tech: string[];
	mainTag: string;
	image: string;
	link: string;
	role: string;
	timeline: string;
}

const PROJECTS: Project[] = [
		{
			title: 'reddit-mohs-nlp',
			subtitle: 'A study of patient voices',
			desc: 'Extracting insight from ten thousand patient conversations.',
			longDesc: 'An end-to-end Reddit NLP analysis pipeline for Mohs surgery discussions. It scrapes posts, performs topic modeling (LDA), runs sentiment analysis, and displays the outcomes in a highly-interactive, responsive dashboard interface to help clinicians understand patients\' perspectives.',
			tech: ['Python', 'React', 'NLP', 'LDA', 'FastAPI', 'Scikit-Learn'],
			mainTag: 'CLINICAL NLP',
			image: '/reddit_mohs.png',
			link: 'https://github.com/taymurfa/reddit-mohs-nlp',
			role: 'Lead Developer & Data Engineer',
			timeline: '2026'
		},
		{
			title: 'peerakeet-app',
			subtitle: 'Where developers find each other',
			desc: 'Community-led rooms, audio huddles, honest feedback.',
			longDesc: 'A mobile and web application built with React Native and Expo. Peerakeet facilitates peer-to-peer developer networking, custom audio huddles, knowledge sharing, and portfolio feedback through interactive, community-led rooms.',
			tech: ['React Native', 'Expo', 'TypeScript', 'Node.js', 'Firebase', 'WebRTC'],
			mainTag: 'MOBILE & P2P',
			image: '/peerakeet.png',
			link: 'https://github.com/taymurfa/peerakeet-app',
			role: 'Full-Stack Developer',
			timeline: '2025'
		},
		{
			title: 'quant-code',
			subtitle: 'Agentic quant strategy research',
			desc: 'A CLI-first research agent that hunts for trading strategies.',
			longDesc: 'A CLI-first agentic research workflow for systematic strategy discovery, using Claude Code as a local agent. It researches market hypotheses, generates schema-validated strategy specs, gates them through feasibility checks, runs a backtest-learning loop with paper portfolio simulation, and compresses long reasoning traces into reusable semantic memory in Redis.',
			tech: ['Python', 'TypeScript', 'FastAPI', 'Next.js', 'Redis', 'Claude API'],
			mainTag: 'AGENTIC QUANT',
			image: '/quant_code.png',
			link: 'https://github.com/Ayush-Agarwal07/quant-code',
			role: 'Developer',
			timeline: '2026'
		}
];

function PortfolioPage({ index, setIndex }: { index: number; setIndex: Dispatch<SetStateAction<number>> }) {
	const projects = PROJECTS;
	const next = () => setIndex((i) => (i + 1) % projects.length);
	const prev = () => setIndex((i) => (i - 1 + projects.length) % projects.length);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'ArrowRight') next();
			if (e.key === 'ArrowLeft') prev();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const proj = projects[index];

	return (
		<div className="cinema-portfolio">
			<div className="cinema-slide" key={proj.title}>
				<div className="cinema-meta">
					<span className="cinema-index">{String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}</span>
					<span>{proj.timeline}</span>
					<span className="cinema-tag">{proj.mainTag}</span>
				</div>
				<h2 className="cinema-title">{proj.title}</h2>
				<p className="cinema-tagline">{proj.subtitle}</p>
				<div className="cinema-columns">
					<div className="cinema-copy">
						<p className="cinema-lead">{proj.desc}</p>
						<p>{proj.longDesc}</p>
					</div>
					<div className="cinema-detail">
						<dl>
							<div><dt>Role</dt><dd>{proj.role}</dd></div>
							<div><dt>Stack</dt><dd>{proj.tech.join(' · ')}</dd></div>
						</dl>
						<a className="cinema-link" href={proj.link} target="_blank" rel="noopener noreferrer">
							View footage ↗
						</a>
					</div>
				</div>
			</div>
			<div className="cinema-nav">
				<button type="button" onClick={prev} aria-label="Previous project">←</button>
				<div className="cinema-dots">
					{projects.map((_, i) => (
						<button key={i} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Project ${i + 1}`} />
					))}
				</div>
				<button type="button" onClick={next} aria-label="Next project">→</button>
			</div>
		</div>
	);
}

type Entry = { date: string; body: string; images?: string[] };

function useEntries(url: string) {
	const [entries, setEntries] = useState<Entry[] | null>(null);
	useEffect(() => {
		let isMounted = true;
		fetch(url)
			.then((r) => (r.ok ? r.json() : Promise.reject()))
			.then((data: Entry[]) => { if (isMounted) setEntries(data); })
			.catch(() => { if (isMounted) setEntries([]); });
		return () => { isMounted = false; };
	}, [url]);
	return entries;
}

function formatNoteDate(iso: string) {
	const d = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return iso;
	const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
	return `${month}.${d.getDate()} ${d.getFullYear()}`;
}

function EntryList({ entries }: { entries: Entry[] }) {
	return (
		<div className="notes-list">
			{entries.map((entry, index) => (
				<div className="note-entry" key={index}>
					<div className="note-date">{formatNoteDate(entry.date)}</div>
					{entry.body && <p>{entry.body}</p>}
					{entry.images && entry.images.length > 0 && (
						<div className="note-images">
							{entry.images.map((src) => (
								<img key={src} src={src} alt="" loading="lazy" />
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function isoDate(year: number, month: number, day: number) {
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function Calendar({
	entryDates,
	selected,
	onSelect,
}: {
	entryDates: Set<string>;
	selected: string | null;
	onSelect: (iso: string) => void;
}) {
	const now = new Date();
	const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

	const shift = (delta: number) => {
		setView(({ year, month }) => {
			const d = new Date(year, month + delta, 1);
			return { year: d.getFullYear(), month: d.getMonth() };
		});
	};

	const firstDay = new Date(view.year, view.month, 1).getDay();
	const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
	const cells: (number | null)[] = [
		...Array.from({ length: firstDay }, () => null),
		...Array.from({ length: daysInMonth }, (_, i) => i + 1),
	];

	return (
		<div className="cal">
			<div className="cal-head">
				<button type="button" onClick={() => shift(-1)} aria-label="Previous month">←</button>
				<span>{MONTH_NAMES[view.month]} {view.year}</span>
				<button type="button" onClick={() => shift(1)} aria-label="Next month">→</button>
			</div>
			<div className="cal-grid">
				{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
					<span className="cal-dow" key={i}>{d}</span>
				))}
				{cells.map((day, i) => {
					if (day === null) return <span key={`b${i}`} />;
					const iso = isoDate(view.year, view.month, day);
					const has = entryDates.has(iso);
					const cls = ['cal-day', has ? 'has-entry' : '', selected === iso ? 'selected' : ''].join(' ').trim();
					return (
						<button type="button" className={cls} key={iso} onClick={() => has && onSelect(iso)}>
							{day}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function FeedPage() {
	const [tab, setTab] = useState<'daily' | 'notes'>('daily');
	const [selected, setSelected] = useState<string | null>(null);
	const daily = useEntries('/daily.json');
	const notes = useEntries('/notes.json');

	const entries = tab === 'daily' ? daily : notes;
	const entryDates = new Set((entries ?? []).map((e) => e.date));

	// default to the most recent entry when the tab's data arrives
	useEffect(() => {
		const latest = (tab === 'daily' ? daily : notes)?.[0]?.date ?? null;
		setSelected(latest);
	}, [tab, daily, notes]);

	const dayEntries = (entries ?? []).filter((e) => e.date === selected);

	return (
		<div className="win98-window" role="dialog" aria-label="Blog">
			<div className="win98-titlebar">
				<span>Blog</span>
				<a className="win98-close" href="#live" aria-label="Close">×</a>
			</div>
			<div className="win98-content">
				<div className="win98-tabs">
					<button
						type="button"
						className={tab === 'daily' ? 'active' : ''}
						onClick={() => setTab('daily')}
					>
						Daily
					</button>
					<button
						type="button"
						className={tab === 'notes' ? 'active' : ''}
						onClick={() => setTab('notes')}
					>
						Notes
					</button>
				</div>
				<div className="win98-page">
					<div className="win98-group">
						<span className="win98-group-label">Date</span>
						<Calendar entryDates={entryDates} selected={selected} onSelect={setSelected} />
					</div>
					<div className="win98-group">
						<span className="win98-group-label">Entry</span>
						<div className="win98-notepad">
							{entries === null && <div className="feed-loading">Reading tape...</div>}
							{entries !== null && dayEntries.length === 0 && (
								<div className="feed-loading">No entry for this day</div>
							)}
							{dayEntries.length > 0 && <EntryList entries={dayEntries} />}
						</div>
					</div>
				</div>
				<div className="win98-buttons">
					<a href="#live">OK</a>
					<a href="#live">Cancel</a>
				</div>
			</div>
		</div>
	);
}

function BioPage() {
	const [crawlDone, setCrawlDone] = useState(false);
	return (
		<div className="bio-crawl-page">
			<a className="bio-crawl-close" href="#live" aria-label="Close bio">✕</a>
			<div className="bio-crawl-stage">
				<div className="bio-crawl" onAnimationEnd={() => setCrawlDone(true)}>
					<h2>About Me</h2>
					<div className="bio-text">
				<p>
					Hi, I'm <strong>Taymur Faruqui</strong>, a math student at Purdue interested in quantitative trading,
					AI systems, and applied research. I like building tools that turn messy real-world information into 
					structured decisions, whether that means extracting patient concerns from public health data, designing 
					AI workflows for compliance, or exploring trading strategies through probability, market structure, and automation.
				</p>

				<p>
					My work spans software engineering, research, and finance. I’ve built NLP pipelines for medical research, 
					contributed to an addiction recovery platform at Peerakeet, worked on private credit and energy finance 
					analysis, and competed in quantitative trading through BoilerQuant and IMC Prosperity. Across everything
					I do, I’m drawn to problems where strong technical thinking can create practical, measurable impact.
				</p>
					</div>
				</div>
			</div>
			<div className={`bio-socials${crawlDone ? ' visible' : ''}`}>
				<h3>Channels</h3>
				<div className="bio-links">
					<a href="https://github.com/taymurfa" target="_blank" rel="noopener noreferrer">GitHub ↗ taymurfa</a>
					<a href="https://linkedin.com/in/taymurfa" target="_blank" rel="noopener noreferrer">LinkedIn ↗ taymurfa</a>
					<a href="https://instagram.com/taymurfa" target="_blank" rel="noopener noreferrer">Instagram ↗ @taymurfa</a>
					<a href="https://x.com/taymurfa" target="_blank" rel="noopener noreferrer">X ↗ taymurfa</a>
					<span className="bio-discord">Discord: taymr</span>
				</div>
			</div>
		</div>
	);
}

export default App;
