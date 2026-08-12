import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { events } from './Events';
import { EventCard, ResearchCard, ProjectCard, BlogCard } from './Helper';

function SceneShowcase({ items, renderCard }) {
  const list = (items || []).slice(0, 2);
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
  }, [items]);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const id = setInterval(() => setI((a) => (a + 1) % list.length), 3500);
    return () => clearInterval(id);
  }, [list.length]);

  if (list.length === 0) return null;

  return (
    <div className='showcase'>
      <div className='showcase-anim' key={i}>
        {renderCard(list[i])}
      </div>
      {list.length > 1 ? (
        <div className='showcase-dots'>
          {list.map((_, idx) => (
            <span key={idx} className={`showcase-dot ${idx === i ? 'is-active' : ''}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function About() {
  const [project, setProject] = useState([]);
  const [research, setResearch] = useState([]);
  const [homeResearch, setHomeResearch] = useState([]);
  const [blog, setBlog] = useState([]);
  const [scene, setScene] = useState(0);
  const sceneRefs = useRef([]);

  useEffect(() => {
    Promise.all([
      fetch(`/assets/research.json`).then((r) => r.json()),
      fetch(`/assets/portfolio.json`).then((r) => r.json()),
      fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues`).then((r) => r.json()),
    ])
      .then(([researchData, projectData, blogData]) => {
        setResearch(researchData.project || []);
        setHomeResearch(researchData.homeResearch || []);
        setProject(projectData.portfolio || []);
        setBlog(Array.isArray(blogData) ? blogData : []);
      })
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  useEffect(() => {
    const els = sceneRefs.current.filter(Boolean);
    if (!els.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setScene(Number(e.target.dataset.scene));
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const researchItems = useMemo(() => {
    const flat = research.flatMap((it) => it.publications || []);
    if (homeResearch && homeResearch.length) {
      return homeResearch
        .map((u) => flat.find((x) => x.url === u || x.links?.project === u))
        .filter(Boolean)
        .slice(0, 2);
    }
    return flat.slice(0, 2);
  }, [research, homeResearch]);
  const projectItems = useMemo(() => project.slice(0, 2), [project]);
  const blogItems = useMemo(() => blog.slice(0, 2), [blog]);

  const sets = [
    { items: researchItems, render: (it) => <ResearchCard item={it} /> },
    { items: projectItems, render: (it) => <ProjectCard item={it} /> },
    { items: blogItems, render: (it) => <BlogCard item={it} /> },
  ];
  const active = sets[scene] || sets[0];

  return (
    <>
      <div className='home-statement'>
      <div className='hs-left'>
        <section className='hs-scene' data-scene='0' ref={(el) => (sceneRefs.current[0] = el)}>
          <div className='hs-id'>
            <img className='hs-logo' src='/assets/imgs/logo.png' alt='' />
            <h1 className='hs-name'>
              Faisal <span>(Φsal)</span>
            </h1>
            <p className='hs-role'>Computer graphics · XR · systems</p>
            <div className='hs-actions'>
              <Link className='hs-btn' to='/contact' aria-label='Contact'>
                <i className='fa fa-envelope'></i>
              </Link>
              <Link className='hs-btn' to='/project' aria-label='Projects'>
                <i className='fa fa-th-large'></i>
              </Link>
            </div>
          </div>

          <p className='hs-statement'>
            I build solutions across multiple platforms (<i className='fab fa-windows'></i> /{' '}
            <i className='fab fa-apple'></i> / <i className='fab fa-linux'></i>) using different tools
            depending on the <Link className='pill-link' to='/project'>project</Link> needs (<i className='fab fa-react'></i>{' '}
            / <i className='fab fa-angular'></i> / <i className='fab fa-android'></i> /{' '}
            <i className='fab fa-unity'></i>).
          </p>

          <div className='hs-recognitions'>
            <p className='hs-rec-label'>Recognitions:</p>
            <ul>
              <li>
                <i className='fa fa-graduation-cap'></i>{' '}
                <Link to='/r/thesis'>Ph.D., Computer Graphics</Link>
              </li>
              <li>
                <i className='fab fa-aws'></i>{' '}
                <a href='https://www.credly.com/users/fzaman' target='_blank' rel='noreferrer'>
                  AWS Solutions Architect – Professional
                </a>
              </li>
              <li>
                <i className='fa fa-award'></i>{' '}
                <Link to='/r/rtstage'>SIGGRAPH Real-Time Live!</Link>
              </li>
            </ul>
          </div>
        </section>

        <section className='hs-scene' data-scene='1' ref={(el) => (sceneRefs.current[1] = el)}>
          <h2 className='hs-heading'>Selected talks &amp; demos</h2>
          <div className='event-list'>
            {events.slice(0, 4).map((item, i) => (
              <EventCard key={i} data={item} />
            ))}
          </div>
        </section>

        <section className='hs-scene' data-scene='2' ref={(el) => (sceneRefs.current[2] = el)}>
          <h2 className='hs-heading'>Once in a while,</h2>
          <p className='hs-statement'>
            I like making experiments that recreate interesting behaviours and patterns.
          </p>
          <Link className='pill-link' to='/blog'>
            All posts →
          </Link>
        </section>
      </div>

      <div className='hs-right'>
        <SceneShowcase items={active.items} renderCard={active.render} />
      </div>
      </div>

      <section className='hs-outro'>
        <h2 className='hs-heading'>And</h2>
        <p className='hs-statement'>
          when I&apos;m not doing that, I watch{' '}
          <Link className='pill-link' to='/movies'>
            movies
          </Link>
          , take{' '}
          <Link className='pill-link' to='/photo'>
            pictures
          </Link>
          , go on{' '}
          <Link className='pill-link' to='/travel'>
            adventures
          </Link>
          , or create weird stuff like this ....
        </p>
        <div className='pp home-video'>
          <iframe
            title='jquery404'
            className='ppp'
            src='https://player.vimeo.com/video/29850027?autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0'
            frameBorder='0'
            allow='autoplay; fullscreen'
            allowFullScreen
          ></iframe>
        </div>
      </section>
    </>
  );
}

export default About;
