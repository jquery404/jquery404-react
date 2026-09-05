import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import ProjectMedia from './ProjectMedia';

const resolveAsset = (url) =>
  /^(https?:|\/assets)/i.test(url || '') ? url : `/assets/imgs/apps/${url}`;

const platformLabel = (p) => (p === 'ios' ? 'iOS' : p === 'android' ? 'Android' : p);

const NotFound = () => (
  <div className='projd-notfound'>
    <div className='clearfix'>
      <i className='material-icons md-48'>looks_4</i>
      <img src='assets/imgs/404.gif' width='50px' alt='' />
      <i className='material-icons md-48'>looks_4</i>
    </div>
    <p>App not found.</p>
    <p>
      Back to <NavLink to='/apps'>all apps</NavLink>.
    </p>
  </div>
);

const MetaTile = ({ label, value }) =>
  value ? (
    <div className='appd-meta-tile'>
      <span className='appd-meta-label'>{label}</span>
      <span className='appd-meta-value'>{value}</span>
    </div>
  ) : null;

const Markup = ({ hasFound, app, onBack }) => {
  if (hasFound === -1) return <NotFound />;
  if (hasFound !== 1) return <div className='projd-loading-inline'>Looking for it ...</div>;

  const platforms = (app.platform || []).map(platformLabel).join(' · ');
  const gallery = app.gallery || [];

  return (
    <article className='appd'>
      <button onClick={onBack} className='projd-back'>
        <i className='fas fa-arrow-left'></i> Back
      </button>

      <header className='appd-hero'>
        <span className='appd-icon' data-letter={(app.title || '?').charAt(0)}>
          <img
            src={resolveAsset(app.icon)}
            alt=''
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </span>
        <div className='appd-hero-body'>
          <h1 className='appd-title'>{app.title}</h1>
          {app.tagline ? <p className='appd-tagline'>{app.tagline}</p> : null}
          <p className='appd-sub'>
            {[app.category, platforms].filter(Boolean).join('  ·  ')}
          </p>
          <p className='appd-dev'>Faisal · jQuery404</p>

          <div className='appd-actions'>
            {app.android ? (
              <a className='appd-install' href={app.android} rel='noreferrer'>
                <i className='fab fa-android'></i> Download APK
              </a>
            ) : null}
            {app.ios ? (
              <a
                className='appd-install appd-install--ios'
                href={app.ios}
                target='_blank'
                rel='noreferrer'
              >
                <i className='fab fa-apple'></i> iOS — TestFlight
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className='appd-meta'>
        <MetaTile label='Version' value={app.version} />
        <MetaTile label='Size' value={app.size} />
        <MetaTile label='Updated' value={app.updated} />
        <MetaTile label='Platform' value={platforms} />
        {app.rating ? <MetaTile label='Rating' value={`★ ${app.rating}`} /> : null}
        <MetaTile label='Installs' value={app.downloads} />
      </div>

      {gallery.length ? (
        <div className='appd-shots'>
          {gallery.map((item, i) => (
            <div className={`appd-shot appd-shot--${item.ratio === 'portrait' ? 'portrait' : 'landscape'}`} key={i}>
              <ProjectMedia item={item} index={i} context='details' base='apps' />
            </div>
          ))}
        </div>
      ) : null}

      {app.desc ? (
        <section className='appd-about'>
          <h2 className='appd-about-title'>About this app</h2>
          <p>{app.desc}</p>
        </section>
      ) : null}
    </article>
  );
};

const AppDetails = () => {
  const [app, setApp] = useState(null);
  const [hasFound, setHasFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchApp = async () => {
      try {
        const response = await fetch('/assets/apps.json');
        const { apps: items } = await response.json();

        if (isMounted) {
          const found = (items || []).find((item) => item.slug === id);
          if (found) {
            setApp(found);
            setHasFound(1);
          } else {
            setHasFound(-1);
          }
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setHasFound(-1);
          setLoading(false);
          console.error('Error fetching app:', error);
        }
      }
    };

    fetchApp();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <div className='row'>
        <div className='col-sm-10'>
          <div className='py-5 text-center'>
            <div className='spinner-border text-primary' role='status'>
              <span className='sr-only'>Loading...</span>
            </div>
            <p className='mt-3'>Loading app details...</p>
          </div>
        </div>
      </div>
    );
  }

  return <Markup hasFound={hasFound} app={app} onBack={handleBack} />;
};

export default AppDetails;
