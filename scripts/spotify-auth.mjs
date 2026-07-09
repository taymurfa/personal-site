// One-time: mint a refresh token with the scopes the API needs.
// 1. node scripts/spotify-auth.mjs            → prints the authorize URL, open it, approve
// 2. node scripts/spotify-auth.mjs <code>     → paste the ?code= from the redirect, prints the refresh token
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
	readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => l.includes('='))
		.map((l) => l.split('=').map((s) => s.trim()))
);
const clientId = env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;
const clientSecret = env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT = 'http://127.0.0.1:8888/callback'; // must match a redirect URI registered in the Spotify app
const SCOPES = 'user-read-currently-playing user-read-recently-played';

const code = process.argv[2];
if (!code) {
	const url = new URL('https://accounts.spotify.com/authorize');
	url.search = new URLSearchParams({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: REDIRECT,
		scope: SCOPES,
	}).toString();
	console.log('Open this URL, approve, then rerun with the ?code= value from the redirect:\n');
	console.log(url.toString());
} else {
	const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT }),
	});
	const data = await res.json();
	if (!data.refresh_token) {
		console.error('Failed:', JSON.stringify(data));
		process.exit(1);
	}
	console.log('New SPOTIFY_REFRESH_TOKEN (update .env.local and Vercel env):\n');
	console.log(data.refresh_token);
}
