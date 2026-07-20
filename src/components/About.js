import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events } from './Events';
import { EventCard } from './Helper';

import ResearchSection from '../sections/ResearchSection';
import ProjectSection from '../sections/ProjectSection';
import BlogSection from '../sections/BlogSection';

function About() {
  const [project, setProject] = useState([]);
  const [research, setResearch] = useState([]);
  const [inthelab, setInthelab] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/assets/research.json`).then((response) => response.json()),
      fetch(`/assets/portfolio.json`).then((response) => response.json()),
      fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues`).then((response) =>
        response.json()
      ),
    ])
      .then(([researchData, projectData, blogData]) => {
        setResearch(researchData.project || []);
        setProject(projectData.portfolio || []);
        setInthelab(blogData || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className='page-loading'>
        <div className='spinner-border text-primary' role='status'>
          <span className='sr-only'>Loading...</span>
        </div>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <header className='home-hero'>
        <p className='home-kicker'>Computer graphics · XR · systems</p>
        <h1 className='home-name'>Faisal Zaman</h1>
        <p className='home-lede'>
          Ph.D. in computer graphics from Victoria University of Wellington. I build real-time XR
          platforms and research tools that connect academic work with production systems.
        </p>

        <ul className='cred-row'>
          <li>
            <i className='fa fa-graduation-cap'></i> Ph.D., Computer Graphics
          </li>
          <li>
            <i className='fab fa-aws'></i>{' '}
            <a href='https://www.credly.com/users/fzaman' target='_blank' rel='noreferrer'>
              AWS Solutions Architect – Professional
            </a>
          </li>
          <li>
            <i className='fa fa-award'></i> SIGGRAPH Real-Time Live! Audience Choice
          </li>
        </ul>

        <div className='home-cta'>
          <Link className='btn btn-primary' to='/research'>
            Research
          </Link>
          <Link className='btn btn-outline-navy' to='/project'>
            Projects
          </Link>
          <Link className='btn btn-outline-navy' to='/contact'>
            Contact
          </Link>
        </div>
      </header>

      <section className='home-section'>
        <div className='section-head'>
          <h2>Research</h2>
          <Link className='section-more' to='/research'>
            All research →
          </Link>
        </div>
        <p className='section-intro'>
          Recent work on mixed reality, telepresence, and real-time visual effects for live
          performances.
        </p>
        <div className='card-grid'>
          <ResearchSection research={research} />
        </div>
      </section>

      <section className='home-section'>
        <div className='section-head'>
          <h2>Selected talks &amp; demos</h2>
          <Link className='section-more' to='/updates'>
            All updates →
          </Link>
        </div>
        <div className='event-list'>
          {events.slice(0, 4).map((item, i) => (
            <EventCard key={i} data={item} />
          ))}
        </div>
      </section>

      <section className='home-section'>
        <div className='section-head'>
          <h2>Projects</h2>
          <Link className='section-more' to='/project'>
            All projects →
          </Link>
        </div>
        <div className='card-grid'>
          <ProjectSection project={project} />
        </div>
      </section>

      <section className='home-section'>
        <div className='section-head'>
          <h2>Notes from the lab</h2>
          <Link className='section-more' to='/blog'>
            All posts →
          </Link>
        </div>
        <div className='card-grid'>
          <BlogSection inthelab={inthelab} />
        </div>
      </section>

      <section className='home-section home-about-more'>
        <h2>Also</h2>
        <p>
          I work across platforms and stacks depending on the problem — React, Unity, Android, AWS —
          and I still make the occasional weird experiment. When I&apos;m offline:{' '}
          <Link to='/movies'>movies</Link>, <Link to='/photo'>photos</Link>, and{' '}
          <Link to='/travel'>travel</Link>.
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
