import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { events } from './Events';
import { EventCard } from './Helper'; // Assuming EventCard is default export or import correctly

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
      <div className='row'>
        <div className='col-12 col-md-10 col-lg-8'>
          <div className='py-5 text-center'>
            <div className='spinner-border text-primary' role='status'>
              <span className='sr-only'>Loading...</span>
            </div>
            <p className='mt-3'>Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='row'>
      <div className='col-12 col-md-10 col-lg-8'>
        <div className='py-5'>
          <h1>
            Hello{' '}
            <span role='img' aria-label='Waving hand'>
              👋
            </span>
          </h1>
          <div className='subheading mb-5'>I'm Faisal (&#934;sal)</div>

          <div className='pp'>
            <iframe
              title='jquery404'
              className='ppp'
              src='https://player.vimeo.com/video/29850027?autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0'
              frameBorder='0'
              allow='autoplay; fullscreen'
              allowFullScreen
            ></iframe>
          </div>

          <p className='my-5'>
            I build solutions across multiple platforms (<i className='fab fa-windows'></i> /{' '}
            <i className='fab fa-apple'></i> / <i className='fab fa-linux'></i>) using different tools depending on the{' '}
            <Link to='/project'>project</Link> needs (<i className='fab fa-react'></i> /{' '}
            <i className='fab fa-angular'></i> / <i className='fab fa-android'></i> / <i className='fab fa-unity'></i>).
            <br />
            <br />I have a Ph.D. in computer graphics (<i className='fa fa-graduation-cap'></i>) from Victoria
            University of Wellington, New Zealand, and I'm also an AWS Certified (<i className='fab fa-aws'></i>){' '}
            <a href='https://www.credly.com/users/fzaman' target='_blank' rel='noreferrer'>
              Solutions Architect – Professional
            </a>
            . Right now, I spend most of my days <Link to='/research'>researching</Link> XR (
            <i className='fas fa-vr-cardboard'></i>) tools, and applying best practices in coding, design, usability,
            and accessibility to bridge research with real-world applications.
            <br />
            <br />
            And when I'm not doing that, I watch <Link to='/movies'>movies</Link>, take{' '}
            <Link to='/photo'>pictures</Link>, go on <Link to='/travel'>adventures</Link>, or create weird stuff like
            the kind you saw in that video. Cheers!
          </p>
        </div>

        <h4>Updates</h4>
        {events.slice(0, 4).map((item, i) => (
          <EventCard key={i} data={item} />
        ))}

        <Link to='/updates'>
          <small>Show All...</small>
        </Link>

        <div className='py-5'></div>

        <h4>Latest research</h4>
        <div className='row'>
          <ResearchSection research={research} />
        </div>

        <div className='py-5'></div>

        <h4>Latest project</h4>
        <div className='row'>
          <ProjectSection project={project} />
        </div>

        <div className='py-5'></div>

        <h4>In the lab</h4>
        <BlogSection inthelab={inthelab} />

        <p className='my-5'>
          <i className='material-icons'>face</i>
          <i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i>
          <i className='material-icons'>format_quote</i>
        </p>
      </div>
    </div>
  );
}

export default About;
