import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const VIDEO_SRC = '/assets/videos/home-scroll.mp4';

const CHAPTERS = [
  {
    id: 'intro',
    align: 'center',
    start: 0,
    end: 0.18,
    kicker: 'jQuery404',
    title: 'Faisal Zaman',
    body: 'Ph.D. in computer graphics. XR, telepresence, and real-time systems.',
  },
  {
    id: 'research',
    align: 'left',
    start: 0.22,
    end: 0.42,
    kicker: 'Research',
    title: 'Mixed reality that holds up in the real world',
    body: 'From immersive gait training to multi-user telecollaboration and live-stage VFX.',
    to: '/research',
    cta: 'Explore research',
  },
  {
    id: 'projects',
    align: 'right',
    start: 0.46,
    end: 0.66,
    kicker: 'Projects',
    title: 'Builds across web, mobile, and XR',
    body: 'Production tools and experiments that sit beside the research.',
    to: '/project',
    cta: 'See projects',
  },
  {
    id: 'also',
    align: 'center',
    start: 0.7,
    end: 0.88,
    kicker: 'Also',
    title: 'Movies, photos, adventures',
    body: 'When I am offline, I watch films, take pictures, and go looking for weird ideas.',
    to: '/movies',
    cta: 'Browse movies',
  },
  {
    id: 'end',
    align: 'center',
    start: 0.9,
    end: 1,
    kicker: 'Contact',
    title: 'Say hello',
    body: 'Open to research collaboration, XR systems work, and interesting problems.',
    to: '/contact',
    cta: 'Get in touch',
  },
];

function chapterOpacity(progress, start, end) {
  const fade = Math.min(0.06, (end - start) * 0.35);
  if (progress < start || progress > end) return 0;
  if (progress < start + fade) return (progress - start) / fade;
  if (progress > end - fade) return (end - progress) / fade;
  return 1;
}

function HomeV2() {
  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    document.body.classList.add('v2-active');
    return () => document.body.classList.remove('v2-active');
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      video.pause();
      video.currentTime = 0;
      setReady(true);
    };

    if (video.readyState >= 1) onMeta();
    else video.addEventListener('loadedmetadata', onMeta);

    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, []);

  useEffect(() => {
    if (!ready || reduceMotion) return;

    const update = () => {
      const track = trackRef.current;
      const video = videoRef.current;
      if (!track || !video || !video.duration) return;

      const rect = track.getBoundingClientRect();
      const scrollable = track.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      const p = scrolled / scrollable;
      const nextTime = p * video.duration;

      if (Math.abs(video.currentTime - nextTime) > 0.02) {
        video.currentTime = nextTime;
      }
      setProgress(p);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ready, reduceMotion]);

  return (
    <div className='home-v2'>
      <nav className='v2-menu' aria-label='Site'>
        <Link className='v2-menu-brand' to='/'>
          jQuery404
        </Link>
        <div className='v2-menu-links'>
          <Link to='/research'>Research</Link>
          <Link to='/project'>Projects</Link>
          <Link to='/contact'>Contact</Link>
          <Link to='/'>Classic</Link>
        </div>
      </nav>

      <section className='v2-scrub' ref={trackRef} aria-label='Scroll story'>
        <div className='v2-stage'>
          <video
            ref={videoRef}
            className='v2-video'
            src={VIDEO_SRC}
            muted
            playsInline
            preload='auto'
            tabIndex={-1}
          />
          <div className='v2-vignette' aria-hidden='true' />

          <div className='v2-overlays'>
            {CHAPTERS.map((chapter) => {
              const opacity = reduceMotion
                ? chapter.id === 'intro'
                  ? 1
                  : 0
                : chapterOpacity(progress, chapter.start, chapter.end);
              return (
                <article
                  key={chapter.id}
                  className={`v2-card v2-card--${chapter.align}`}
                  style={{ opacity, pointerEvents: opacity > 0.2 ? 'auto' : 'none' }}
                >
                  <p className='v2-card-kicker'>{chapter.kicker}</p>
                  <h1 className='v2-card-title'>{chapter.title}</h1>
                  <p className='v2-card-body'>{chapter.body}</p>
                  {chapter.to ? (
                    <Link className='v2-card-cta' to={chapter.to}>
                      {chapter.cta}
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className='v2-progress' aria-hidden='true'>
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>

          {!ready ? <div className='v2-loading'>Loading…</div> : null}

          {progress < 0.08 ? (
            <p className='v2-scroll-hint' aria-hidden='true'>
              Scroll
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default HomeV2;
