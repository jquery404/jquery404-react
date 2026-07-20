import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'About', end: true },
  { to: '/research', label: 'Research' },
  { to: '/project', label: 'Projects' },
  { to: '/blog', label: 'Blog' },
  { to: '/photo', label: 'Photo' },
  { to: '/movies', label: 'Movies' },
  { to: '/contact', label: 'Contact' },
];

class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = { collapsed: true };
    this.toggleNavbar = this.toggleNavbar.bind(this);
  }

  toggleNavbar() {
    this.setState({ collapsed: !this.state.collapsed });
  }

  componentDidUpdate() {
    window.scrollTo(0, 0);
  }

  render() {
    const { collapsed } = this.state;
    const navBtnClass = collapsed ? 'navbar-toggler collapsed' : 'navbar-toggler';
    const navChildClass = collapsed
      ? 'navbar-toggle navbar-collapse collapse'
      : 'navbar-toggle navbar-collapse collapse show';

    return (
      <nav className='navbar navbar-expand-lg navbar-dark bg-primary fixed-top' id='sideNav'>
        <NavLink className='navbar-brand js-scroll-trigger' to='/'>
          <span className='d-flex d-lg-none align-items-center brand-mobile'>
            <img className='brand-mark-sm' src='/assets/imgs/logo-mark.png' alt='' />
            <span className='brand-title-sm'>jQuery404</span>
          </span>
          <span className='d-none d-lg-flex brand-lockup'>
            <img className='img-fluid brand-mark' src='/assets/imgs/logo-mark.png' alt='' />
            <span className='brand-title'>jQuery404</span>
            <span className='brand-tagline'>XR · Graphics · Systems</span>
          </span>
        </NavLink>

        <button
          onClick={this.toggleNavbar}
          className={navBtnClass}
          type='button'
          data-toggle='collapse'
          data-target='#navbarSupportedContent'
          aria-controls='navbarSupportedContent'
          aria-expanded={!collapsed}
          aria-label='Toggle navigation'
        >
          <span className='navbar-toggler-icon'></span>
        </button>

        <div className={navChildClass} id='navbarSupportedContent'>
          <ul className='navbar-nav'>
            {links.map((link) => (
              <li className='nav-item' key={link.to}>
                <NavLink
                  end={link.end}
                  className={({ isActive }) =>
                    `nav-link js-scroll-trigger${isActive ? ' active' : ''}`
                  }
                  to={link.to}
                >
                  <div onClick={this.toggleNavbar}>{link.label}</div>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    );
  }
}

export default Header;
