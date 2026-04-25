import React from 'react';

const ProjectMedia = ({ item = {}, index = 0, context = 'modal' }) => {
  const mediaType = item.type === 'image' ? 'image' : item.url?.endsWith('.mp4') ? 'video-file' : 'embed';
  const mediaRatio = item.ratio === 'portrait' ? 'portrait' : 'landscape';

  if (context === 'details') {
    if (mediaType === 'image') {
      return <img className='p-3 img-fluid' src={`/assets/imgs/project/${item.url}`} alt='' />;
    }

    if (mediaType === 'video-file') {
      return (
        <div className='video-container'>
          <video controls muted loop playsInline className='swiper-slide-video'>
            <source src={`/assets/imgs/project/${item.url}`} type='video/mp4' />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div className={`embed-responsive ${item.ratio === 'landscape' ? 'embed-responsive-16by9' : 'embed-responsive-1by1'}`}>
        <iframe title={`gallery-${index}`} className='embed-responsive-item' src={item.url} allowFullScreen></iframe>
      </div>
    );
  }

  return (
    <div className={`project-media project-media-${mediaRatio} project-media-${mediaType}`}>
      {mediaType === 'image' ? (
        <img className='project-media-img' src={`/assets/imgs/project/${item.url}`} alt='' />
      ) : mediaType === 'video-file' ? (
        <video controls muted loop playsInline className='project-media-video'>
          <source src={`/assets/imgs/project/${item.url}`} type='video/mp4' />
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
