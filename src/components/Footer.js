import React from 'react';

class Footer extends React.Component {
  render() {
    return (
      <footer className='site-footer'>
        <div className='site-footer-inner'>
          <div className='site-footer-links'>
            <a href='mailto:jquery404@gmail.com' aria-label='Email'>
              <i className='fa fa-envelope'></i>
            </a>
            <a href='https://twitter.com/jquery404' target='_blank' rel='noopener noreferrer' aria-label='Twitter'>
              <i className='fab fa-twitter'></i>
            </a>
            <a href='https://github.com/jquery404/' target='_blank' rel='noopener noreferrer' aria-label='GitHub'>
              <i className='fab fa-github'></i>
            </a>
            <a href='http://instagram.com/jquery404' target='_blank' rel='noopener noreferrer' aria-label='Instagram'>
              <i className='fab fa-instagram'></i>
            </a>
          </div>
          <p className='site-footer-copy'>
            &copy; {new Date().getFullYear()} Faisal Zaman · jQuery404
          </p>
        </div>
      </footer>
    );
  }
}

export default Footer;
