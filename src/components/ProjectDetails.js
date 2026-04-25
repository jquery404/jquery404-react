import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import ProjectMedia from './ProjectMedia';

const Markup = ({ hasFound, project, onBack }) => {
  if (hasFound === -1) {
    return (
      <div className='row'>
        <div className='col-sm-7'>
          <div className='py-5'>
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
        </div>
      </div>
    );
  }

  if (hasFound === 1) {
    return (
      <div className='row'>
        <div className='col-sm-10 pt-5'>
          <button onClick={onBack} className='btn btn-outline mb-4'>
            <i className='fas fa-arrow-left me-2'></i> Back to Projects
          </button>
          <img className='card-img-top' src={`/assets/imgs/project/${project.thumbnail}`} alt={project.title} />
          <h2 className='projd-title mt-5 pb-3'>{project.title}</h2>
        </div>

        <div className='col-sm-8'>
          {project.desc}
          {project.url !== '' && (
            <a className='nav-link' href={project.url} target='_blank' rel='noreferrer'>
              <i className='fa fa-external-link-alt'></i> Project Link
            </a>
          )}
          <div className='row'>
            {project.gallery.map((gallery, i) => (
              <div
                key={i}
                className={
                  gallery.type === 'image' ? 'col-sm-6' : gallery.ratio === 'landscape' ? 'col-sm-12' : 'col-sm-6'
                }
              >
                <ProjectMedia item={gallery} index={i} context='details' />
              </div>
            ))}
          </div>
        </div>
        <div
          className='col-sm-2 text-right projd-tags'
          dangerouslySetInnerHTML={{ __html: project.tags.split(',').join('<br/>') }}
        ></div>
      </div>
    );
  }

  return <div className='row'>Looking for it ...</div>;
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
