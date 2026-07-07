import { useEffect, useState } from 'react';
import { CrtTv } from './CrtTv';

type StreamState = 'live' | 'offline';
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
	const [streamState, setStreamState] = useState<StreamState>('live');
	const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
	const [activePage, setActivePage] = useState<'live' | 'desk' | 'log' | 'about'>('live');
	const [menuOpen, setMenuOpen] = useState(false);

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
	const isLive = hasStream && streamState === 'live';

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
						onCanPlay={() => setStreamState('live')}
						onError={() => setStreamState('offline')}
						playsInline
						src={streamUrl}
					/>
				)}

				<div className="ambient" aria-hidden={hasStream}>
					<i /><i /><i />
				</div>

				<div className={`room-overlay ${activePage !== 'live' ? 'active' : ''}`} onClick={() => window.location.hash = 'live'} />

				<div className="rec-badge">
					<p className="osd-line">PLAY <span className="osd-play">▶</span></p>
					<p className="osd-line">
						{isLive ? 'REC' : 'STOP'} {isLive && <span className="dot live" />}
					</p>
				</div>

				<div className="osd-menu">
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

				{activePage !== 'live' && (
					<aside className="left-stack expanded" aria-label="Content panel">
						<div className="page-content-area">
							<div className="page-scroll" key={activePage}>
								{activePage === 'desk' && <PortfolioPage />}
								{activePage === 'log' && <FeedPage />}
								{activePage === 'about' && <BioPage />}
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

function PortfolioPage() {
	const [index, setIndex] = useState(0);

	const projects: Project[] = [
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
			title: 'personal-site',
			subtitle: 'A portrait of a workspace',
			desc: 'The site you are looking at, looking back at you.',
			longDesc: 'A personal desktop simulator environment featuring glassmorphic windows, real-time Spotify "now playing" synchronization, Vercel serverless integration, dynamic GitHub event logging streams, and interactive canvas components.',
			tech: ['React', 'TypeScript', 'Vite', 'CSS3', 'Spotify API', 'Vercel Serverless'],
			mainTag: 'FRONTEND & API',
			image: '/personal_site.png',
			link: 'https://github.com/taymurfa/personal-site',
			role: 'Creator / Designer',
			timeline: '2026'
		}
	];

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
				<a className="cinema-link" href={proj.link} target="_blank" rel="noopener noreferrer">
					View footage ↗
				</a>
				<div className="cinema-body">
					<blockquote>“{proj.desc}”</blockquote>
					<div className="cinema-detail">
						<p>{proj.longDesc}</p>
						<dl>
							<div><dt>Role</dt><dd>{proj.role}</dd></div>
							<div><dt>Stack</dt><dd>{proj.tech.join(' · ')}</dd></div>
						</dl>
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

type GitHubEvent = {
	id: string;
	type: string;
	created_at: string;
	repo: {
		name: string;
	};
	payload: {
		ref?: string;
		ref_type?: string;
		action?: string;
		number?: number;
		pull_request?: {
			title: string;
		};
		issue?: {
			title: string;
		};
	};
};

function FeedPage() {
	const [logs, setLogs] = useState<{ date: string; title: string; body: string }[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let isMounted = true;
		const fallbackLogs = [
			{
				date: 'May 26, 2026',
				title: 'Spotify Audio Integration & Redesign',
				body: 'Upgraded the Spotify widget with local HTML5 Audio playback. Fixed environment variable synchronization with Vercel Dev. Sleek new glassmorphic player UI.'
			},
			{
				date: 'May 24, 2026',
				title: 'Expo Peerakeet Build Success',
				body: 'Completed Expo configuration updates for peerakeet-app. Enabled native builds and peer directory exports.'
			},
			{
				date: 'May 22, 2026',
				title: 'Topic Modeling on Mohs Data',
				body: 'Trained Latent Dirichlet Allocation (LDA) models on 10k Reddit comments related to Mohs surgery. Successfully categorized major concerns: post-op pain, scarring, and healing timelines.'
			}
		];

		const fetchGitHubEvents = async () => {
			try {
				const response = await fetch('https://api.github.com/users/taymurfa/events');
				if (!response.ok) {
					throw new Error('Failed to fetch from GitHub');
				}
				const events = (await response.json()) as GitHubEvent[];

				const formattedLogs = events
					.slice(0, 10)
					.map((event) => {
						const date = new Date(event.created_at).toLocaleDateString(undefined, {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						});
						const repoName = event.repo.name.replace('taymurfa/', '');

						let title = '';
						let body = '';

						switch (event.type) {
							case 'PushEvent':
								const branch = event.payload.ref?.replace('refs/heads/', '') || 'main';
								title = `Pushed to ${repoName}`;
								body = `Updated branch "${branch}" with new commits.`;
								break;
							case 'PullRequestEvent':
								const action = event.payload.action || 'updated';
								const prTitle = event.payload.pull_request?.title || '';
								title = `${action.charAt(0).toUpperCase() + action.slice(1)} PR on ${repoName}`;
								body = prTitle ? `"${prTitle}"` : `Pull Request #${event.payload.number}`;
								break;
							case 'CreateEvent':
								const refType = event.payload.ref_type || 'repository';
								const ref = event.payload.ref ? ` "${event.payload.ref}"` : '';
								title = `Created ${refType} on ${repoName}`;
								body = `Initialized new ${refType}${ref}.`;
								break;
							case 'IssueCommentEvent':
								title = `Commented on ${repoName}`;
								body = `Left a comment on issue #${event.payload.issue?.title || event.payload.number}.`;
								break;
							default:
								title = `Activity on ${repoName}`;
								body = `Triggered a ${event.type.replace('Event', '')} event.`;
						}

						return { date, title, body };
					});

				if (isMounted) {
					setLogs(formattedLogs.length > 0 ? formattedLogs : fallbackLogs);
					setIsLoading(false);
				}
			} catch {
				if (isMounted) {
					setLogs(fallbackLogs);
					setIsLoading(false);
				}
			}
		};

		fetchGitHubEvents();
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="feed-container">
			<h2>Activity Log</h2>
			{isLoading ? (
				<div className="feed-loading">
					Loading active feed...
				</div>
			) : (
				<div className="timeline">
					{logs.map((log, index) => (
						<div className="timeline-item" key={index}>
							<div className="timeline-date">{log.date}</div>
							<div className="timeline-content">
								<h3>{log.title}</h3>
								<p>{log.body}</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function BioPage() {
	return (
		<div className="bio-container">
			<h2>About Me</h2>
			<div className="bio-text">
				<p>
					Hi, I'm <strong>Taymur Faruqui</strong>, a software engineer passionate about building high-quality,
					interactive web and mobile applications. I specialize in the React/React Native ecosystem,
					TypeScript, and backend Python engineering.
				</p>
				<p>
					I enjoy combining clean technical architectures with high-fidelity frontend aesthetics. Whether it's
					extracting insights from clinical discussions using NLP or creating responsive, immersive user interfaces,
					I focus on delivering robust and polished products.
				</p>
				<h3>Core Tech Stack</h3>
				<div className="bio-tech-list">
					<span>React / React Native</span>
					<span>TypeScript</span>
					<span>Node.js / Express</span>
					<span>Python (FastAPI, PyTorch, NLTK)</span>
					<span>PostgreSQL / Firebase</span>
					<span>Docker / Vercel</span>
				</div>
			</div>
		</div>
	);
}

export default App;
