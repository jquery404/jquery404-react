import React, { useState, useEffect } from 'react';

const repoOwner = 'jquery404';
const repoName = 'jquery404.github.io';
const branchName = 'master';
const folderPath = 'movies';
const dataFileName = 'movdb.json';
const gitAccessToken = 'x';

const Movie = () => {
  const [localMovies, setLocalMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [wikiTitle, setWikiTitle] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchMovieFiles();
  }, []);

  const utf8ToBase64 = (str) => {
    return window.btoa(unescape(encodeURIComponent(str)));
  };

  const fetchMovieFiles = async () => {
    try {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}/${dataFileName}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch movie data');

      const { content } = await response.json();
      const decodedContent = atob(content);
      const movies = JSON.parse(decodedContent);

      setLocalMovies(movies);
    } catch (error) {
      console.error(error);
      setStatus('Error loading movies');
    } finally {
      setLoading(false);
    }
  };

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

      // Fix: Properly encode UTF-8 strings to base64
      const content = utf8ToBase64(JSON.stringify(localMovies, null, 2));
      // Alternative if Buffer is not available:
      // const content = window.btoa(unescape(encodeURIComponent(JSON.stringify(localMovies, null, 2))));

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

  return (
    <div className='container'>
      <h1>Movies</h1>
      <p>
        I'm a big fan of movies and have probably seen hundreds, if not thousands of them! This page shows my favorites
        with the ability to edit them locally before uploading.
      </p>

      <div className='mb-4'>
        <button className='btn btn-primary me-2' onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Hide Add Form' : 'Add New Movie'}
        </button>

        <button className='btn btn-success' onClick={uploadToGitHub} disabled={loading}>
          Upload All Changes to GitHub
        </button>
      </div>

      {showAdd && (
        <div className='card mb-4 p-3'>
          <div className='form-group'>
            <input
              type='text'
              className='form-control mb-2'
              placeholder="Wikipedia title (e.g., 'Inception')"
              value={wikiTitle}
              onChange={(e) => setWikiTitle(e.target.value)}
            />
            <button className='btn btn-secondary' onClick={handleAddFromWikipedia}>
              Add from Wikipedia
            </button>
          </div>
        </div>
      )}

      {status && (
        <div className={`alert ${status.includes('Success') ? 'alert-success' : 'alert-info'} mb-4`}>{status}</div>
      )}

      {loading ? (
        <div className='text-center'>Loading movies...</div>
      ) : (
        <div className='row'>
          {localMovies.map((movie) => (
            <div key={movie.id} className='col-md-4 col-lg-3 mb-4'>
              <div className='card h-100'>
                {movie.imageUrl && (
                  <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className='card-img-top'
                    style={{ height: 'auto', objectFit: 'cover' }}
                  />
                )}
                <div className='card-body d-flex flex-column'>
                  <h5 className='card-title'>{movie.title}</h5>
                  <p className='card-text flex-grow-1'>{movie.description?.substring(0, 150)}...</p>
                  <div className='d-flex justify-content-between align-items-center mt-2'>
                    {movie.url && (
                      <a href={movie.url} target='_blank' rel='noreferrer' className='btn btn-sm btn-outline-primary'>
                        Read More
                      </a>
                    )}
                    <button onClick={() => handleDeleteMovie(movie.id)} className='btn btn-sm btn-danger'>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Movie;
