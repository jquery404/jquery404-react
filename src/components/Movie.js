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

const tryRepairMojibake = (text) => {
  if (typeof text !== 'string') return text;
  if (!/[ÃÂâ]/.test(text)) return text;

  let fixed = text;
  for (let i = 0; i < 3; i += 1) {
    if (!/[ÃÂâ]/.test(fixed)) break;
    try {
      const next = decodeURIComponent(escape(fixed));
      if (!next || next === fixed) break;
      fixed = next;
    } catch {
      break;
    }
  }

  return fixed;
};

const normalizeMovieStrings = (movies = []) =>
  movies.map((movie) => ({
    ...movie,
    title: tryRepairMojibake(movie.title),
    description: tryRepairMojibake(movie.description),
    url: tryRepairMojibake(movie.url),
    imageUrl: tryRepairMojibake(movie.imageUrl),
  }));

const Movie = () => {
  const [localMovies, setLocalMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [wikiTitle, setWikiTitle] = useState('');
  const [status, setStatus] = useState(null);

  const fetchMovieFiles = useCallback(async () => {
    try {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}/${dataFileName}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch movie data');

      const { content } = await response.json();
      const decodedContent = decodeBase64Utf8(content);
      const movies = normalizeMovieStrings(JSON.parse(decodedContent));

      setLocalMovies(movies);
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

      setLocalMovies((prev) => [newMovie, ...prev]);
      setWikiTitle('');
      setStatus(`Added "${newMovie.title}" locally`);
    } catch (err) {
      console.error(err);
      setStatus('Error fetching from Wikipedia');
    }
  };

  const handleDeleteMovie = (id) => {
    setLocalMovies((prev) => prev.filter((movie) => movie.id !== id));
    setStatus('Movie removed locally');
  };

  const uploadToGitHub = async () => {
    const gitAccessToken = prompt('AccessToken:');
    if (!gitAccessToken) {
      alert('Upload cancelled - no token provided');
      return;
    }
    try {
      const filePath = `${folderPath}/${dataFileName}`;
      const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

      // First get current file to get SHA
      const getResp = await fetch(getUrl, {
        headers: {
          Authorization: `token ${gitAccessToken}`,
        },
      });

      if (!getResp.ok) throw new Error('Failed to fetch current file');

      const { sha } = await getResp.json();

      // Always normalize text before persisting to avoid writing mojibake back into movdb.json
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
        fetchMovieFiles(); // Refresh to confirm changes
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
      {/* Hero header */}
      <div className='movie-hero'>
        <h1>Movies</h1>
        <p>
          A curated list of films I love — spanning genres, languages, and decades. Hover any poster to learn more.
        </p>
        <div className='movie-hero-controls'>
          <button className='btn-movie btn-movie--ghost' onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '✕ Cancel' : '+ Add Movie'}
          </button>
          <button className='btn-movie btn-movie--red' onClick={uploadToGitHub} disabled={loading}>
            ↑ Save to GitHub
          </button>
          {!loading && (
            <span className='movie-hero-count'>{localMovies.length} films</span>
          )}
        </div>
      </div>

      {/* Add from Wikipedia */}
      {showAdd && (
        <div className='movie-add-bar'>
          <input
            type='text'
            placeholder="Wikipedia title — e.g. Spirited Away, Parasite, Amélie"
            value={wikiTitle}
            onChange={(e) => setWikiTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFromWikipedia()}
            autoFocus
          />
          <button className='btn-movie btn-movie--red' onClick={handleAddFromWikipedia}>
            Add
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className='movie-loading'>
          <div className='movie-spinner' />
          <span>Loading movies…</span>
        </div>
      ) : (
        <div className='movie-mosaic'>
          {localMovies.map((movie, index) => (
            <div
              key={movie.id}
              className={`movie-tile${index % 7 === 0 ? ' movie-tile--featured' : ''}`}
            >
              {movie.imageUrl ? (
                <img src={movie.imageUrl} alt={movie.title} loading='lazy' />
              ) : (
                <div className='movie-tile-placeholder'>
                  {movie.title.charAt(0)}
                </div>
              )}
              <div className='movie-tile-overlay'>
                <h3 className='movie-tile-title'>{movie.title}</h3>
                <p className='movie-tile-desc'>{movie.description}</p>
                <div className='movie-tile-actions'>
                  {movie.url && (
                    <a href={movie.url} target='_blank' rel='noreferrer' className='btn-tile btn-tile--wiki'>
                      Wikipedia
                    </a>
                  )}
                  <button onClick={() => handleDeleteMovie(movie.id)} className='btn-tile btn-tile--del'>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast notification */}
      {status && (
        <div className={`movie-toast movie-toast--${toastType}`}>
          <span>{status}</span>
          <button className='movie-toast__close' onClick={() => setStatus(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default Movie;
