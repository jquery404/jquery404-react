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
      fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues`).then((response) => response.json()),
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
        <h1 className='home-name'>
          Hello{' '}
          <span role='img' aria-label='Waving hand'>
            👋
          </span>
        </h1>
        <div className='subheading mb-5'>I'm Faisal (Φsal)</div>
        <p className='home-lede'>
          I build solutions across multiple platforms (<i className='fab fa-windows'></i> /{' '}
          <i className='fab fa-apple'></i> / <i className='fab fa-linux'></i>) using different tools
          depending on the <Link className='pill-link' to='/project'>project</Link> needs (<i className='fab fa-react'></i>{' '}
          / <i className='fab fa-angular'></i> / <i className='fab fa-android'></i> /{' '}
          <i className='fab fa-unity'></i>).
        </p>

        <ul className='cred-row'>
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

        <div className='home-cta'>
          <Link className='btn btn-outline-navy' to='/research'>
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
          <h2>Latest research</h2>
          <Link className='section-more' to='/research'>
            All research →
          </Link>
        </div>
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
          <h2>Latest projects</h2>
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
          <h2>Once in a while,</h2>
          <Link className='section-more' to='/blog'>
            All posts →
          </Link>
        </div>
        <p className='section-intro'>
          I like making experiments that recreate interesting behaviours and patterns.
        </p>
        <div className='card-grid'>
          <BlogSection inthelab={inthelab} />
        </div>
      </section>

      <section className='home-section home-about-more'>
        <h2>And</h2>
        <p>
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

      <section className='home-section home-cheers'>
        <h2>Cheers!</h2>
      </section>
    </>
  );
}

export default About;
