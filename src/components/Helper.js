import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const useCardNavigation = () => {
  const navigate = useNavigate();

  return (url) => {
    const isExternalOrStatic = url.includes('https') || url.startsWith('/assets');

    if (isExternalOrStatic) {
      window.location.href = url;
    } else {
      navigate(url);
    }
  };
};

const RenderLinkComponent = (url, content, isExternalOrStatic) =>
  isExternalOrStatic ? (
    <a href={url} target='_blank' rel='noopener noreferrer'>
      {content}
    </a>
  ) : (
    <NavLink to={url}>{content}</NavLink>
  );

const RenderLink = (type, url, icon, label) => {
  const isExternalOrStatic = url.includes('https') || url.startsWith('/assets');
  const content = (
    <span className='badge badge-dark tooltips'>
      <i className={icon}></i> {label}
    </span>
  );

  return (
    <React.Fragment key={type}>
      {RenderLinkComponent(url, content, isExternalOrStatic)}
      &nbsp;
    </React.Fragment>
  );
};

const RenderShortLink = (type, url, content) => {
  const isExternalOrStatic = url.includes('https') || url.startsWith('/assets');

  return (
    <React.Fragment key={type}>
      {RenderLinkComponent(url, content, isExternalOrStatic)}
      &nbsp;
    </React.Fragment>
  );
};

const EventCard = ({ data }) => (
  <a className='event-row' href={data.url} target='_blank' rel='noreferrer'>
    <div className='event-thumb' style={{ backgroundImage: `url(${data.thumb})` }} aria-hidden='true' />
    <div className='event-body'>
      <div className='event-meta'>
        <span>{data.date}</span>
        <span className={`event-role ${data.role === 'presented' ? 'is-presented' : 'is-other'}`}>
          {data.role}
        </span>
      </div>
      <h3 className='event-title'>
        {data.title}
        {data.award ? <i className='fa fa-award event-award-inline' title={data.award}></i> : null}
      </h3>
      <p className='event-place'>{data.place}</p>
    </div>
  </a>
);

const ResearchCard = ({ item }) => {
  const handleNavigation = useCardNavigation();

  return (
    <article
      className='work-card'
      onClick={() => handleNavigation(item.url)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigation(item.url);
        }
      }}
      role='link'
      tabIndex={0}
    >
      <div className='work-card-media'>
        <img src={`/assets/imgs/research/${item.thumbnail}`} alt='' />
      </div>
      <div className='work-card-body'>
        <h3>{item.title}</h3>
        {item.venue || item.journal ? (
          <p className='work-card-meta'>{item.venue || item.journal}</p>
        ) : null}
      </div>
    </article>
  );
};

const ProjectCard = ({ item }) => {
  const handleNavigation = useCardNavigation();

  return (
    <article
      className='work-card'
      onClick={() => handleNavigation('/p/' + item.slug)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigation('/p/' + item.slug);
        }
      }}
      role='link'
      tabIndex={0}
    >
      <div className='work-card-media'>
        <img src={`/assets/imgs/project/${item.thumbnail}`} alt='' />
      </div>
      <div className='work-card-body'>
        <h3>{item.title}</h3>
        {item.tags ? <p className='work-card-meta'>{item.tags}</p> : null}
      </div>
    </article>
  );
};

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function firstImageFromBody(body) {
  if (!body) return null;
  const match = body.match(/<img[^>]+src=["']([^"']+)["']/i) || body.match(/!\[[^\]]*]\(([^)]+)\)/);
  return match ? match[1] : null;
}

const BlogCard = ({ item }) => {
  const handleNavigation = useCardNavigation();
  const thumb = firstImageFromBody(item.body);

  return (
    <article
      className='work-card'
      onClick={() => handleNavigation(`/blog/${item.number}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigation(`/blog/${item.number}`);
        }
      }}
      role='link'
      tabIndex={0}
    >
      <div className='work-card-media'>
        {thumb ? (
          <img src={thumb} alt='' />
        ) : (
          <div className='work-card-placeholder' aria-hidden='true'>
            {item.title?.charAt(0) || 'N'}
          </div>
        )}
      </div>
      <div className='work-card-body'>
        <h3>{item.title}</h3>
        <p className='work-card-meta'>{formatDate(item.created_at)}</p>
      </div>
    </article>
  );
};

export { RenderLink, RenderShortLink, useCardNavigation, EventCard, ResearchCard, ProjectCard, BlogCard };
