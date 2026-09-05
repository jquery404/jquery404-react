import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';

// Absolute URLs / already-rooted /assets paths pass through; otherwise resolve
// against the apps image folder.
const resolveAsset = (url) =>
  /^(https?:|\/assets)/i.test(url || '') ? url : `/assets/imgs/apps/${url}`;

const platformIcon = (p) =>
  p === 'ios' ? 'fab fa-apple' : p === 'android' ? 'fab fa-android' : 'fas fa-desktop';

const AppCard = ({ app }) => (
  <NavLink className='app-card' to={`/a/${app.slug}`}>
    <span className='app-card-iconwrap' data-letter={(app.title || '?').charAt(0)}>
      <img
        className='app-card-icon'
        src={resolveAsset(app.icon)}
        alt=''
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </span>
    <div className='app-card-body'>
      <h3 className='app-card-title'>{app.title}</h3>
      <p className='app-card-cat'>{app.category}</p>
      {app.tagline ? <p className='app-card-tagline'>{app.tagline}</p> : null}
      <div className='app-card-foot'>
        <span className='app-card-platforms'>
          {(app.platform || []).map((p) => (
            <i key={p} className={platformIcon(p)} title={p} />
          ))}
        </span>
        <span className='app-card-get'>Get</span>
      </div>
    </div>
  </NavLink>
);

const Apps = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    fetch('/assets/apps.json')
      .then((res) => res.json())
      .then(({ apps: list }) => {
        setApps(Array.isArray(list) ? list : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching apps:', error);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(apps.map((a) => a.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      const inCategory = filter === 'All' || a.category === filter;
      const inQuery =
        !q ||
        `${a.title} ${a.tagline || ''} ${a.tags || ''} ${a.category || ''}`.toLowerCase().includes(q);
      return inCategory && inQuery;
    });
  }, [apps, query, filter]);

  if (loading) {
    return (
      <div className='row'>
        <div className='col-sm-12'>
          <div className='py-5 text-center'>
            <div className='spinner-border text-primary' role='status'>
              <span className='sr-only'>Loading...</span>
            </div>
            <p className='mt-3'>Loading apps...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='apps-page'>
      <header className='apps-header'>
        <h1 className='apps-title'>App Store</h1>
        <p className='apps-intro'>Apps I've built, ready to install.</p>
        <div className='apps-search'>
          <i className='fas fa-search'></i>
          <input
            type='search'
            placeholder='Search apps…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label='Search apps'
          />
        </div>
        <div className='apps-filter'>
          {categories.map((cat) => (
            <button
              key={cat}
              type='button'
              className={`apps-chip${filter === cat ? ' is-active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className='apps-empty'>No apps match your search.</p>
      ) : (
        <div className='apps-grid'>
          {filtered.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Apps;
