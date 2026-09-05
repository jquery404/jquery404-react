import React from 'react';

const ProjectMedia = ({ item = {}, index = 0, context = 'modal', base = 'project' }) => {
  const mediaType = item.type === 'image' ? 'image' : item.url?.endsWith('.mp4') ? 'video-file' : 'embed';
  const mediaRatio = item.ratio === 'portrait' ? 'portrait' : 'landscape';

  // Absolute URLs (http, or an already-rooted /assets path) pass through untouched;
  // otherwise resolve against the media base folder (project | apps | ...).
  const resolveSrc = (url) =>
    /^(https?:|\/assets)/i.test(url || '') ? url : `/assets/imgs/${base}/${url}`;

  if (context === 'details') {
    if (mediaType === 'image') {
      return <img className='projd-media-img' src={resolveSrc(item.url)} alt='' />;
    }

    if (mediaType === 'video-file') {
      return (
        <video controls muted loop playsInline className='projd-media-video'>
          <source src={resolveSrc(item.url)} type='video/mp4' />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <div className={`projd-media-embed projd-media-embed--${mediaRatio}`}>
        <iframe title={`gallery-${index}`} src={item.url} allowFullScreen></iframe>
      </div>
    );
  }

  return (
    <div className={`project-media project-media-${mediaRatio} project-media-${mediaType}`}>
      {mediaType === 'image' ? (
        <img className='project-media-img' src={resolveSrc(item.url)} alt='' />
      ) : mediaType === 'video-file' ? (
        <video controls muted loop playsInline className='project-media-video'>
          <source src={resolveSrc(item.url)} type='video/mp4' />
          Your browser does not support the video tag.
        </video>
      ) : (
        <iframe
          title={index}
          className='project-media-iframe'
          src={item.url}
          frameBorder='0'
          loading='lazy'
          allowFullScreen
        ></iframe>
      )}
    </div>
  );
};

export default ProjectMedia;
