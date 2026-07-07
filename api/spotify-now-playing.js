const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

async function getLastPlayed(accessToken) {
	const res = await fetch(RECENTLY_PLAYED_ENDPOINT, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) return null;
	const data = await res.json();
	const item = data.items?.[0]?.track;
	if (!item) return null;
	return {
		isPlaying: false,
		title: item.name,
		artist: item.artists?.map((artist) => artist.name).join(', ') ?? 'Unknown artist',
		album: item.album?.name ?? 'Unknown album',
		albumArt: item.album?.images?.[0]?.url ?? '',
		url: item.external_urls?.spotify ?? '',
		progressMs: 0,
		durationMs: item.duration_ms ?? 0,
		id: item.id ?? '',
	};
}

function json(response, status, payload) {
	response.statusCode = status;
	response.setHeader('Content-Type', 'application/json');
	response.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');
	response.end(JSON.stringify(payload));
}

async function getAccessToken() {
	const clientId = process.env.SPOTIFY_CLIENT_ID;
	const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
	const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error('Missing Spotify credentials');
	}

	const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
	const response = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${basic}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		throw new Error(`Spotify token request failed: ${response.status}`);
	}

	const data = await response.json();
	return data.access_token;
}

export default async function handler(_request, response) {
	try {
		const accessToken = await getAccessToken();
		const spotifyResponse = await fetch(NOW_PLAYING_ENDPOINT, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (spotifyResponse.status === 204 || spotifyResponse.status === 202) {
			const last = await getLastPlayed(accessToken);
			json(response, 200, last ?? { isPlaying: false });
			return;
		}

		if (!spotifyResponse.ok) {
			throw new Error(`Spotify now playing request failed: ${spotifyResponse.status}`);
		}

		const data = await spotifyResponse.json();
		const item = data.item;

		if (!item) {
			const last = await getLastPlayed(accessToken);
			json(response, 200, last ?? { isPlaying: false });
			return;
		}

		json(response, 200, {
			isPlaying: Boolean(data.is_playing),
			title: item.name,
			artist: item.artists?.map((artist) => artist.name).join(', ') ?? 'Unknown artist',
			album: item.album?.name ?? 'Unknown album',
			albumArt: item.album?.images?.[0]?.url ?? '',
			url: item.external_urls?.spotify ?? '',
			progressMs: data.progress_ms ?? 0,
			durationMs: item.duration_ms ?? 0,
			id: item.id ?? '',
			previewUrl: item.preview_url ?? '',
		});
	} catch (error) {
		json(response, 500, {
			isPlaying: false,
			error: error instanceof Error ? error.message : 'Spotify request failed',
		});
	}
}
