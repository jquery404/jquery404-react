import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import ProjectMedia from './ProjectMedia';

const NotFound = () => (
  <div className='projd-notfound'>
    <div className='clearfix'>
      <i className='material-icons md-48'>looks_4</i>
      <img src='assets/imgs/404.gif' width='50px' alt='' />
      <i className='material-icons md-48'>looks_4</i>
    </div>
    <p>Page not found.</p>
    <p>
      Don't worry let me bring you back to{' '}
      <NavLink exact={true} activeClassName='active' className='nav-link js-scroll-trigger' to='/'>
        About
      </NavLink>
    </p>
  </div>
);

// Lay the gallery out as a magazine spread: a repeating editorial rhythm of
// full-bleed plates, offset asides and side-by-side duos rather than a grid dump.
const buildSpread = (gallery = []) => {
  const rhythm = ['plate', 'aside', 'duo', 'plate', 'aside'];
  const blocks = [];
  let i = 0;
  let r = 0;

  while (i < gallery.length) {
    const item = gallery[i];
    const isImage = item.type === 'image';
    const kind = rhythm[r % rhythm.length];

    if (isImage && kind === 'duo' && gallery[i + 1]?.type === 'image') {
      blocks.push({ kind: 'duo', items: [item, gallery[i + 1]], n: i });
      i += 2;
    } else if (isImage && kind === 'aside') {
      blocks.push({ kind: 'aside', items: [item], n: i, side: r % 2 === 0 ? 'right' : 'left' });
      i += 1;
    } else {
      // videos / embeds always read best full width
      blocks.push({ kind: 'plate', items: [item], n: i });
      i += 1;
    }
    r += 1;
  }
  return blocks;
};

const plate = (n) => String(n + 1).padStart(2, '0');

const SpreadBlock = ({ block }) => {
  if (block.kind === 'duo') {
    return (
      <div className='projd-block projd-duo'>
        {block.items.map((item, k) => (
          <figure key={k} className='projd-frame'>
            <ProjectMedia item={item} index={block.n + k} context='details' />
          </figure>
        ))}
      </div>
    );
  }

  if (block.kind === 'aside') {
    return (
      <div className={`projd-block projd-aside projd-aside--${block.side}`}>
        <figure className='projd-frame'>
          <ProjectMedia item={block.items[0]} index={block.n} context='details' />
        </figure>
        <div className='projd-aside-meta'>
          <span className='projd-plate-no'>{plate(block.n)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className='projd-block projd-plate'>
      <figure className='projd-frame'>
        <ProjectMedia item={block.items[0]} index={block.n} context='details' />
      </figure>
    </div>
  );
};

const Markup = ({ hasFound, project, onBack }) => {
  if (hasFound === -1) return <NotFound />;
  if (hasFound !== 1) return <div className='projd-loading-inline'>Looking for it ...</div>;

  const tags = project.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const spread = buildSpread(project.gallery);

  return (
    <article className='projd'>
      <button onClick={onBack} className='projd-back'>
        <i className='fas fa-arrow-left'></i> Back
      </button>

      <header className='projd-masthead'>
        <p className='projd-kicker'>{tags.join(' — ') || 'Feature'}</p>
        <h1 className='projd-title'>{project.title}</h1>
        <p className='projd-standfirst'>{project.desc}</p>
      </header>

      <div className='projd-spread'>
        {spread.map((block, i) => (
          <SpreadBlock key={i} block={block} />
        ))}
      </div>

      <footer className='projd-colophon'>
        <span className='projd-colophon-tags'>{tags.join(' · ')}</span>
        {project.url && (
          <a className='projd-colophon-link' href={project.url} target='_blank' rel='noreferrer'>
            Visit project <i className='fa fa-arrow-right'></i>
          </a>
        )}
      </footer>
    </article>
  );
};

const ProjectDetails = () => {
  const [project, setProject] = useState(null);
  const [hasFound, setHasFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchProject = async () => {
      try {
        const response = await fetch('/assets/portfolio.json');
        const { portfolio: items } = await response.json();

        if (isMounted) {
          const foundItem = items.find((item) => item.slug === id);
          if (foundItem) {
            setProject(foundItem);
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
          console.error('Error fetching project:', error);
        }
      }
    };

    fetchProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className='row'>
        <div className='col-sm-10'>
          <div className='py-5 text-center'>
            <div className='spinner-border text-primary' role='status'>
              <span className='sr-only'>Loading...</span>
            </div>
            <p className='mt-3'>Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  return <Markup hasFound={hasFound} project={project} onBack={handleBack} />;
};

export default ProjectDetails;
