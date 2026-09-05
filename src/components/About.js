import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { events } from './Events';
import { EventCard, ResearchCard, ProjectCard, BlogCard } from './Helper';
import { useAgentOptional } from '../agent/AgentContext';

function SceneShowcase({ slides }) {
  const list = useMemo(() => (slides || []).filter(Boolean), [slides]);
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
  }, [list]);

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const id = setInterval(() => setI((a) => (a + 1) % list.length), 3500);
    return () => clearInterval(id);
  }, [list.length]);

  if (list.length === 0) return null;

  return (
    <div className='showcase'>
      <div className='showcase-stage'>
        {list.map((slide, idx) => (
          <div
            key={slide.key || idx}
            className={`showcase-slide ${idx === i ? 'is-active' : ''}`}
            aria-hidden={idx !== i}
          >
            {slide.render(idx === i)}
          </div>
        ))}
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
  const agent = useAgentOptional();
  const [project, setProject] = useState([]);
  const [research, setResearch] = useState([]);
  const [homeResearch, setHomeResearch] = useState([]);
  const [blog, setBlog] = useState([]);

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

  const researchPool = useMemo(() => {
    const flat = research.flatMap((it) => it.publications || []);
    if (homeResearch && homeResearch.length) {
      return homeResearch.map((u) => flat.find((x) => x.url === u || x.links?.project === u)).filter(Boolean);
    }
    return flat;
  }, [research, homeResearch]);
  const researchItems = useMemo(() => researchPool.slice(0, 2), [researchPool]);
  const projectItems = useMemo(() => project.slice(0, 2), [project]);
  const blogItems = useMemo(() => blog.slice(0, 2), [blog]);

  const scene1Slides = useMemo(
    () =>
      researchItems.map((item) => ({
        key: `research-${item.id || item.slug || item.title}`,
        render: (isActive) => <ResearchCard item={item} isActive={isActive} />,
      })),
    [researchItems],
  );
  const scene2Slides = useMemo(
    () =>
      projectItems.map((item) => ({
        key: `project-${item.id || item.slug || item.title}`,
        render: (isActive) => <ProjectCard item={item} isActive={isActive} />,
      })),
    [projectItems],
  );
  const scene4Slides = useMemo(
    () =>
      blogItems.map((item) => ({
        key: `blog-${item.id || item.number || item.title}`,
        render: (isActive) => <BlogCard item={item} isActive={isActive} />,
      })),
    [blogItems],
  );

  return (
    <>
      <div className='home-statement'>
        <div className='hs-left'>
          <section className='hs-scene'>
            <div className='hs-id'>
              <h1 className='hs-name'>
                Faisal <span>(Φsal)</span>
              </h1>
              <p className='hs-role'>Computer graphics · XR · HCI</p>
            </div>

            <p className='hs-statement'>
              I build solutions across multiple platforms (<i className='fab fa-windows'></i> /{' '}
              <i className='fab fa-apple'></i> / <i className='fab fa-linux'></i>) using different tools (
              <i className='fab fa-react'></i> / <i className='fab fa-angular'></i> / <i className='fab fa-android'></i>{' '}
              / <i className='fab fa-unity'></i>), bridging academic research (
              <i className='fa fa-vr-cardboard'></i>) and real-world applications.
            </p>

            <div className='hs-recognitions'>
              <p className='hs-rec-label'>Recognitions:</p>
              <ul>
                <li>
                  <i className='fa fa-graduation-cap'></i> <Link to='/r/thesis'>Ph.D., Computer Graphics</Link>
                </li>
                <li>
                  <i className='fab fa-aws'></i>{' '}
                  <a href='https://www.credly.com/users/fzaman' target='_blank' rel='noreferrer'>
                    AWS Solutions Architect – Professional
                  </a>
                </li>
                <li>
                  <i className='fa fa-award'></i> <Link to='/r/rtstage'>SIGGRAPH Real-Time Live!</Link>
                </li>
              </ul>
            </div>

            {agent?.enabled ? (
              <div className='hs-agent-starters' aria-label='Ask jQuery404'>
                <p className='hs-rec-label'>Ask me:</p>
                <div className='hs-agent-starter-row'>
                  {(agent.starterPrompts || []).map((p) => (
                    <button
                      key={p.id}
                      type='button'
                      className='hs-agent-starter'
                      disabled={agent.busy || agent.available === false}
                      onClick={() => agent.sendMessage(p.label)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {agent.available === false ? (
                  <p className='hs-agent-offline'>
                    AI bridge offline — browse the site as usual, or run <code>npm run agent:bridge</code>.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className='hs-scene'>
            <h2 className='hs-heading'>Research</h2>

            <SceneShowcase slides={scene1Slides} />
            <Link className='event-stack-more' to='/research'>
              See all research
            </Link>
          </section>

          <section className='hs-scene'>
            <h2 className='hs-heading'>Projects</h2>

            <SceneShowcase slides={scene2Slides} />
            <Link className='event-stack-more' to='/project'>
              See all projects
            </Link>
          </section>

          <section className='hs-scene'>
            <h2 className='hs-heading'>Selected talks &amp; demos</h2>
            <div className='event-list event-stack'>
              {events.slice(0, 4).map((item, i) => (
                <EventCard key={i} data={item} />
              ))}
              <Link className='event-stack-more' to='/updates'>
                See all updates
              </Link>
            </div>
          </section>

          <section className='hs-scene'>
            <h2 className='hs-heading'>Once in a while,</h2>
            <SceneShowcase slides={scene4Slides} />

            <Link className='event-stack-more' to='/blog'>
              See all posts
            </Link>
          </section>
        </div>

        <div className='hs-right'>
          <div className='hs-mascot-slot' aria-hidden='true' />
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

      <p className='about-closing'>
        Copyright &copy; {new Date().getFullYear()} jQuery404. Thanks for dropping by, bye{' '}
        <i className='fa fa-smile' aria-hidden='true'></i>
      </p>
    </>
  );
}

export default About;
