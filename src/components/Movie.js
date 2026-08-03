import React, { useState, useEffect, useCallback } from 'react';
import './Movie.css';

const repoOwner = 'jquery404';
const repoName = 'jquery404.github.io';
const branchName = 'master';
const folderPath = 'movies';
const dataFileName = 'movdb.json';

const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window.btoa(binary);
};

const decodeBase64Utf8 = (base64) => {
  const binary = window.atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

/** Undo Latin-1 misreads of UTF-8 (possibly applied multiple times). */
const repairMojibake = (text) => {
  if (typeof text !== 'string' || !text) return text;

  let current = text;
  for (let i = 0; i < 8; i += 1) {
    let bytes;
    try {
      bytes = Uint8Array.from(current, (ch) => {
        const code = ch.charCodeAt(0);
        if (code > 255) throw new Error('not-latin1');
        return code;
      });
    } catch {
      break;
    }

    try {
      const next = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!next || next === current) break;
      current = next;
    } catch {
      break;
    }
  }

  return current;
};

const normalizeMovieStrings = (movies = []) =>
  movies.map((movie) => ({
    ...movie,
    title: repairMojibake(movie.title),
    description: repairMojibake(movie.description),
    url: repairMojibake(movie.url),
    imageUrl: repairMojibake(movie.imageUrl),
  }));

const shuffle = (items = []) => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

const wikiTitleFromMovie = (movie) => {
  if (movie?.url) {
    try {
      const path = new URL(movie.url).pathname;
      const parts = path.split('/');
      const raw = parts[parts.length - 1] || '';
      if (raw) return decodeURIComponent(raw.replace(/_/g, ' '));
    } catch {
      // fall through
    }
  }
  return movie?.title || '';
};

const claimValues = (claims, prop) => claims?.[prop] || [];

const entityIdsFromClaims = (claims, prop, limit = 8) =>
  claimValues(claims, prop)
    .map((c) => c?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean)
    .slice(0, limit);

const stringFromClaims = (claims, prop) => {
  const v = claimValues(claims, prop)[0]?.mainsnak?.datavalue?.value;
  return typeof v === 'string' ? v : null;
};

const yearFromClaims = (claims) => {
  const times = claimValues(claims, 'P577')
    .map((c) => c?.mainsnak?.datavalue?.value?.time)
    .filter(Boolean);
  if (!times.length) return null;
  const match = times[0].match(/([+-]?\d{1,4})/);
  return match ? match[1].replace(/^\+/, '') : null;
};

const runtimeFromClaims = (claims) => {
  const amount = claimValues(claims, 'P2047')[0]?.mainsnak?.datavalue?.value?.amount;
  if (!amount) return null;
  const mins = Math.abs(parseInt(amount, 10));
  return Number.isFinite(mins) ? `${mins} min` : null;
};

const fetchEntityLabels = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const url =
    'https://www.wikidata.org/w/api.php?' +
    new URLSearchParams({
      action: 'wbgetentities',
      ids: unique.join('|'),
      props: 'labels',
      languages: 'en',
      format: 'json',
      origin: '*',
    });
  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  const labels = {};
  Object.entries(data.entities || {}).forEach(([id, ent]) => {
    labels[id] = ent?.labels?.en?.value || id;
  });
  return labels;
};

const fetchMovieExtras = async (movie) => {
  const title = wikiTitleFromMovie(movie);
  if (!title) return null;

  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  );
  const summary = summaryRes.ok ? await summaryRes.json() : null;

  const propsRes = await fetch(
    'https://en.wikipedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        prop: 'pageprops',
        titles: title,
        format: 'json',
        origin: '*',
      })
  );
  if (!propsRes.ok) {
    return {
      tagline: summary?.description || null,
      imageUrl: summary?.originalimage?.source || summary?.thumbnail?.source || movie.imageUrl,
    };
  }

  const propsData = await propsRes.json();
  const page = Object.values(propsData.query?.pages || {})[0];
  const qid = page?.pageprops?.wikibase_item;
  if (!qid) {
    return {
      tagline: summary?.description || null,
      imageUrl: summary?.originalimage?.source || summary?.thumbnail?.source || movie.imageUrl,
    };
  }

  const entRes = await fetch(
    'https://www.wikidata.org/w/api.php?' +
      new URLSearchParams({
        action: 'wbgetentities',
        ids: qid,
        props: 'claims|descriptions',
        languages: 'en',
        format: 'json',
        origin: '*',
      })
  );
  if (!entRes.ok) return { tagline: summary?.description || null };

  const entData = await entRes.json();
  const entity = entData.entities?.[qid];
  const claims = entity?.claims || {};

  const directorIds = entityIdsFromClaims(claims, 'P57', 4);
  const castIds = entityIdsFromClaims(claims, 'P161', 8);
  const genreIds = entityIdsFromClaims(claims, 'P136', 5);
  const countryIds = entityIdsFromClaims(claims, 'P495', 3);
  const languageIds = entityIdsFromClaims(claims, 'P364', 3);
  const labels = await fetchEntityLabels([
    ...directorIds,
    ...castIds,
    ...genreIds,
    ...countryIds,
    ...languageIds,
  ]);

  const mapIds = (ids) => ids.map((id) => labels[id]).filter(Boolean);
  const imdb = stringFromClaims(claims, 'P345');

  return {
    tagline: summary?.description || entity?.descriptions?.en?.value || null,
    year: yearFromClaims(claims),
    runtime: runtimeFromClaims(claims),
    directors: mapIds(directorIds),
    cast: mapIds(castIds),
    genres: mapIds(genreIds),
    countries: mapIds(countryIds),
    languages: mapIds(languageIds),
    imdbId: imdb,
    imdbUrl: imdb ? `https://www.imdb.com/title/${imdb}/` : null,
    imageUrl: summary?.originalimage?.source || summary?.thumbnail?.source || movie.imageUrl,
    wikidataId: qid,
  };
};

const MoviePoster = ({ title, imageUrl }) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  if (!showImage) {
    return (
      <div className='movie-tile-placeholder' aria-hidden='true'>
        {(title || '?').charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=''
      loading='lazy'
      onError={() => setFailed(true)}
    />
  );
};

const Fact = ({ label, value }) => {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  const text = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div className='movie-fact'>
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  );
};

const Movie = () => {
  const [localMovies, setLocalMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [wikiTitle, setWikiTitle] = useState('');
  const [status, setStatus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [extras, setExtras] = useState(null);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const extrasCache = React.useRef({});

  const fetchMovieFiles = useCallback(async () => {
    try {
      // Prefer local UTF-8 JSON; fall back to GitHub contents API
      let movies = null;
      try {
        const localResp = await fetch(`/movies/movdb.json?_=${Date.now()}`);
        if (localResp.ok) {
          movies = normalizeMovieStrings(await localResp.json());
        }
      } catch {
        // ignore and try GitHub
      }

      if (!movies) {
        const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}/${dataFileName}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch movie data');
        const { content } = await response.json();
        const decodedContent = decodeBase64Utf8(content);
        movies = normalizeMovieStrings(JSON.parse(decodedContent));
      }

      setLocalMovies(shuffle(movies));
    } catch (error) {
      console.error(error);
      setStatus('Error loading movies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovieFiles();
  }, [fetchMovieFiles]);

  const handleAddFromWikipedia = async () => {
    if (!wikiTitle) return alert('Enter a Wikipedia title!');

    try {
      const wikiResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`
      );
      if (!wikiResponse.ok) throw new Error('Wikipedia page not found');

      const wikiData = await wikiResponse.json();
      const newMovie = {
        id: wikiData.pageid,
        title: wikiData.title,
        description: wikiData.extract,
        imageUrl: wikiData.thumbnail?.source || null,
        url: wikiData.content_urls?.desktop.page || null,
      };

      setLocalMovies((prev) => shuffle([newMovie, ...prev]));
      setWikiTitle('');
      setStatus(`Added "${newMovie.title}" locally`);
    } catch (err) {
      console.error(err);
      setStatus('Error fetching from Wikipedia');
    }
  };

  const handleDeleteMovie = (id) => {
    setLocalMovies((prev) => prev.filter((movie) => movie.id !== id));
    setSelected((prev) => (prev && prev.id === id ? null : prev));
    setStatus('Movie removed locally');
  };

  useEffect(() => {
    if (!selected) {
      setExtras(null);
      setExtrasLoading(false);
      return undefined;
    }

    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    const cacheKey = String(selected.id || selected.title);
    let cancelled = false;

    if (extrasCache.current[cacheKey]) {
      setExtras(extrasCache.current[cacheKey]);
      setExtrasLoading(false);
    } else {
      setExtras(null);
      setExtrasLoading(true);
      fetchMovieExtras(selected)
        .then((data) => {
          if (cancelled) return;
          const payload = data || {};
          extrasCache.current[cacheKey] = payload;
          setExtras(payload);
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) setExtras({});
        })
        .finally(() => {
          if (!cancelled) setExtrasLoading(false);
        });
    }

    return () => {
      cancelled = true;
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  const uploadToGitHub = async () => {
    const gitAccessToken = prompt('AccessToken:');
    if (!gitAccessToken) {
      alert('Upload cancelled - no token provided');
      return;
    }
    try {
      const filePath = `${folderPath}/${dataFileName}`;
      const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

      const getResp = await fetch(getUrl, {
        headers: {
          Authorization: `token ${gitAccessToken}`,
        },
      });

      if (!getResp.ok) throw new Error('Failed to fetch current file');

      const { sha } = await getResp.json();

      const normalizedMovies = normalizeMovieStrings(localMovies);
      const content = utf8ToBase64(JSON.stringify(normalizedMovies, null, 2));

      const putResp = await fetch(getUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${gitAccessToken}` },
        body: JSON.stringify({
          message: `Updated movies list`,
          content: content,
          sha: sha,
          branch: branchName,
        }),
      });
      if (putResp.ok) {
        setStatus('Successfully updated movies on GitHub!');
        fetchMovieFiles();
      } else {
        setStatus('Failed to update on GitHub');
      }
    } catch (err) {
      console.error(err);
      setStatus('Error uploading to GitHub');
    }
  };

  const toastType = status
    ? status.toLowerCase().includes('success')
      ? 'success'
      : status.toLowerCase().includes('error')
      ? 'error'
      : 'info'
    : null;

  return (
    <div className='movie-page'>
      <div className='movie-hero'>
        <h1>Movies</h1>
        <p>
          A curated list of films I love — spanning genres, languages, and decades. Click a poster
          for cast, director, year, and more.
        </p>
        <div className='movie-hero-controls'>
          <button className='btn-movie btn-movie--ghost' onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '✕ Cancel' : '+ Add Movie'}
          </button>
          <button className='btn-movie btn-movie--accent' onClick={uploadToGitHub} disabled={loading}>
            ↑ Save to GitHub
          </button>
          {!loading && <span className='movie-hero-count'>{localMovies.length} films</span>}
        </div>
      </div>

      {showAdd && (
        <div className='movie-add-bar'>
          <input
            type='text'
            placeholder='Wikipedia title — e.g. Spirited Away, Parasite, Amélie'
            value={wikiTitle}
            onChange={(e) => setWikiTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFromWikipedia()}
            autoFocus
          />
          <button className='btn-movie btn-movie--accent' onClick={handleAddFromWikipedia}>
            Add
          </button>
        </div>
      )}

      {loading ? (
        <div className='movie-loading'>
          <div className='movie-spinner' />
          <span>Loading movies…</span>
        </div>
      ) : (
        <div className='movie-mosaic'>
          {localMovies.map((movie, index) => (
            <button
              type='button'
              key={movie.id}
              className={`movie-tile${index % 7 === 0 ? ' movie-tile--featured' : ''}${
                selected?.id === movie.id ? ' is-active' : ''
              }`}
              onClick={() => setSelected(movie)}
            >
              <MoviePoster title={movie.title} imageUrl={movie.imageUrl} />
              <div className='movie-tile-overlay'>
                <h3 className='movie-tile-title'>{movie.title}</h3>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className='movie-detail' role='dialog' aria-modal='true' aria-label={selected.title}>
          <button
            type='button'
            className='movie-detail-backdrop'
            aria-label='Close'
            onClick={() => setSelected(null)}
          />
          <aside className='movie-detail-panel'>
            <button
              type='button'
              className='movie-detail-close'
              onClick={() => setSelected(null)}
              aria-label='Close'
            >
              ✕
            </button>
            <div className='movie-detail-scroll'>
              <div className='movie-detail-poster'>
                <MoviePoster
                  title={selected.title}
                  imageUrl={extras?.imageUrl || selected.imageUrl}
                />
              </div>
              <div className='movie-detail-body'>
                <h2>{selected.title}</h2>
                {extras?.tagline && <p className='movie-detail-tagline'>{extras.tagline}</p>}

                {extrasLoading && (
                  <p className='movie-detail-loading'>Loading film details…</p>
                )}

                {!extrasLoading && extras && (
                  <dl className='movie-facts'>
                    <Fact label='Year' value={extras.year} />
                    <Fact label='Runtime' value={extras.runtime} />
                    <Fact label='Director' value={extras.directors} />
                    <Fact label='Cast' value={extras.cast} />
                    <Fact label='Genre' value={extras.genres} />
                    <Fact label='Country' value={extras.countries} />
                    <Fact label='Language' value={extras.languages} />
                  </dl>
                )}

                <h3 className='movie-detail-section'>Synopsis</h3>
                <div className='movie-detail-text'>
                  {selected.description || 'No synopsis available.'}
                </div>

                <div className='movie-detail-actions'>
                  {selected.url && (
                    <a
                      href={selected.url}
                      target='_blank'
                      rel='noreferrer'
                      className='btn-movie btn-movie--ghost'
                    >
                      Wikipedia
                    </a>
                  )}
                  {extras?.imdbUrl && (
                    <a
                      href={extras.imdbUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='btn-movie btn-movie--ghost'
                    >
                      IMDb
                    </a>
                  )}
                  <button
                    type='button'
                    className='btn-movie btn-movie--accent'
                    onClick={() => handleDeleteMovie(selected.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {status && (
        <div className={`movie-toast movie-toast--${toastType}`}>
          <span>{status}</span>
          <button className='movie-toast__close' onClick={() => setStatus(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default Movie;
