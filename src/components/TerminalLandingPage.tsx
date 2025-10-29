import { useEffect, useState } from 'react';
import './TerminalLandingPage.css';

interface TerminalLandingPageProps {
	onBack?: () => void;
}

export function TerminalLandingPage({ onBack }: TerminalLandingPageProps) {
	const [displayedLines, setDisplayedLines] = useState<string[]>([]);
	const [currentLineIndex, setCurrentLineIndex] = useState(0);

	const terminalLines = [
		{ text: '> Initializing terminal session...', delay: 100 },
		{ text: '', delay: 200 },
		{ text: '> Loading system information...', delay: 300 },
		{ text: '', delay: 100 },
		{ text: '╔═══════════════════════════════════════════════════════╗', delay: 50 },
		{ text: '║                  SYSTEM INFORMATION                   ║', delay: 50 },
		{ text: '╚═══════════════════════════════════════════════════════╝', delay: 50 },
		{ text: '', delay: 100 },
		{ text: '  > User:          Guest User', delay: 150 },
		{ text: '  > Session:       Active', delay: 150 },
		{ text: '  > Access Level:  Public', delay: 150 },
		{ text: '  > Location:      ~/portfolio', delay: 150 },
		{ text: '', delay: 200 },
		{ text: '╔═══════════════════════════════════════════════════════╗', delay: 50 },
		{ text: '║                  AVAILABLE COMMANDS                   ║', delay: 50 },
		{ text: '╚═══════════════════════════════════════════════════════╝', delay: 50 },
		{ text: '', delay: 100 },
		{ text: '  [1] about      - View information about me', delay: 100 },
		{ text: '  [2] projects   - Browse my projects', delay: 100 },
		{ text: '  [3] skills     - View technical skills', delay: 100 },
		{ text: '  [4] contact    - Get in touch', delay: 100 },
		{ text: '  [5] github     - View GitHub profile', delay: 100 },
		{ text: '  [6] back       - Return to 3D scene', delay: 100 },
		{ text: '', delay: 200 },
		{ text: '> Waiting for command..._', delay: 0 },
	];

	useEffect(() => {
		if (currentLineIndex < terminalLines.length) {
			const timer = setTimeout(() => {
				setDisplayedLines((prev) => [...prev, terminalLines[currentLineIndex].text]);
				setCurrentLineIndex((prev) => prev + 1);
			}, terminalLines[currentLineIndex].delay);

			return () => clearTimeout(timer);
		}
	}, [currentLineIndex, terminalLines]);

	const handleCommand = (command: string) => {
		switch (command) {
			case '6':
			case 'back':
				if (onBack) onBack();
				break;
			case '1':
			case 'about':
				setDisplayedLines((prev) => [
					...prev,
					'',
					'> Executing: about',
					'',
					'  Full-stack developer with expertise in modern web technologies.',
					'  Passionate about creating immersive 3D experiences and clean UIs.',
					'',
				]);
				break;
			case '5':
			case 'github':
				setDisplayedLines((prev) => [
					...prev,
					'',
					'> Opening GitHub profile...',
				]);
				setTimeout(() => {
					window.open('https://github.com', '_blank');
				}, 500);
				break;
			default:
				setDisplayedLines((prev) => [
					...prev,
					'',
					`> Error: Unknown command '${command}'`,
					'> Type a number (1-6) or command name',
					'',
				]);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			const input = e.currentTarget;
			const command = input.value.trim().toLowerCase();
			if (command) {
				setDisplayedLines((prev) => [...prev, `> ${command}`]);
				handleCommand(command);
				input.value = '';
			}
		}
	};

	return (
		<div className="terminal-landing">
			<div className="terminal-header">
				<div className="terminal-buttons">
					<span className="terminal-button close" onClick={onBack}></span>
					<span className="terminal-button minimize"></span>
					<span className="terminal-button maximize"></span>
				</div>
				<div className="terminal-title">terminal@portfolio:~$</div>
			</div>
			<div className="terminal-content">
				{displayedLines.map((line, index) => (
					<div key={index} className="terminal-line">
						{line}
					</div>
				))}
				{currentLineIndex >= terminalLines.length && (
					<div className="terminal-input-line">
						<span className="terminal-prompt">$ </span>
						<input
							type="text"
							className="terminal-input"
							onKeyPress={handleKeyPress}
						autoFocus
							placeholder="Type command..."
						/>
					</div>
				)}
			</div>
		</div>
	);
}
