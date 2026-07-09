// Usage:
//   npm run daily -- "what I did today" [photo.jpg ...]
//   npm run note  -- "something notable" [photo.jpg ...]
// Prepends a dated entry (copying any image args into public/journal/),
// commits, and pushes.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { basename, extname } from 'path';

const kind = process.argv[2];
if (!['daily', 'note'].includes(kind)) {
	console.error('First arg must be "daily" or "note"');
	process.exit(1);
}

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const args = process.argv.slice(3);
const imageArgs = args.filter((a) => IMAGE_EXT.has(extname(a).toLowerCase()) && existsSync(a));
const body = args.filter((a) => !imageArgs.includes(a)).join(' ').trim();

if (!body && imageArgs.length === 0) {
	console.error(`Usage: npm run ${kind} -- "entry text" [image.jpg ...]`);
	process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const images = imageArgs.map((src) => {
	const dest = `public/journal/${today}-${basename(src)}`;
	copyFileSync(src, dest);
	execSync(`git add ${JSON.stringify(dest)}`);
	return dest.replace('public', '');
});

let file;
if (kind === 'daily') {
	file = 'public/daily.json';
	const entries = JSON.parse(readFileSync(file, 'utf8'));
	const entry = { date: today, body };
	if (images.length) entry.images = images;
	entries.unshift(entry);
	writeFileSync(file, JSON.stringify(entries, null, '\t') + '\n');
} else {
	// notes live in markdown: `## YYYY-MM-DD` section per entry (see parseNotesMarkdown in App.tsx)
	file = 'public/notes.md';
	const content = [body, ...images.map((src) => `![](${src})`)].filter(Boolean).join('\n');
	const section = `## ${today}\n\n${content}`;
	const existing = existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
	writeFileSync(file, section + (existing ? `\n\n${existing}` : '') + '\n');
}

execSync(`git add ${file}`, { stdio: 'inherit' });
execSync(`git commit -m "${kind}: ${today}"`, { stdio: 'inherit' });
execSync('git push', { stdio: 'inherit' });
console.log(`${kind} entry published.`);
