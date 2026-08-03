import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useMatch } from 'react-router-dom';

const links = [
  { to: '/', label: 'About', end: true },
  { to: '/research', label: 'Research', child: 'research' },
  { to: '/project', label: 'Projects', child: 'project' },
  { to: '/blog', label: 'Blog' },
  { to: '/photo', label: 'Photo' },
  { to: '/contact', label: 'Contact' },
];

function Header() {
  const [collapsed, setCollapsed] = useState(true);
  const [projectTitle, setProjectTitle] = useState('');
  const [researchTitle, setResearchTitle] = useState('');
  const location = useLocation();
  const projectMatch = useMatch('/p/:id');
  const researchMatch = useMatch('/r/:id');

  const toggleNavbar = () => setCollapsed((c) => !c);
  const closeNavbar = () => setCollapsed(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const slug = projectMatch?.params?.id;
    if (!slug) {
      setProjectTitle('');
      return;
    }

    let cancelled = false;
    fetch('/assets/portfolio.json')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const found = (data.portfolio || []).find((p) => p.slug === slug);
        setProjectTitle(found?.title || slug);
      })
      .catch(() => {
        if (!cancelled) setProjectTitle(slug);
      });

    return () => {
      cancelled = true;
    };
  }, [projectMatch?.params?.id]);

  useEffect(() => {
    const slug = researchMatch?.params?.id;
    if (!slug) {
      setResearchTitle('');
      return;
    }

    let cancelled = false;
    fetch('/assets/research.json')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const found = (data.research || []).find((item) => item.slug === slug);
        setResearchTitle(found?.title || slug);
      })
      .catch(() => {
        if (!cancelled) setResearchTitle(slug);
      });

    return () => {
      cancelled = true;
    };
  }, [researchMatch?.params?.id]);

  const navBtnClass = collapsed ? 'navbar-toggler collapsed' : 'navbar-toggler';
  const navChildClass = collapsed
    ? 'navbar-toggle navbar-collapse collapse'
    : 'navbar-toggle navbar-collapse collapse show';

  const childByKey = {
    project: {
      match: projectMatch,
      title: projectTitle,
      sectionActive: location.pathname === '/project' || !!projectMatch,
    },
    research: {
      match: researchMatch,
      title: researchTitle,
      sectionActive: location.pathname === '/research' || !!researchMatch,
    },
  };

  return (
    <nav className='navbar navbar-expand-lg navbar-light fixed-top' id='sideNav'>
      <NavLink className='navbar-brand js-scroll-trigger' to='/'>
        <span className='d-flex d-lg-none align-items-center brand-mobile'>
          <img className='brand-mark-sm' src='/assets/imgs/logo.png' alt='jQuery404' />
        </span>
        <span className='d-none d-lg-flex brand-lockup'>
          <img className='img-fluid brand-mark' src='/assets/imgs/logo.png' alt='jQuery404' />
        </span>
      </NavLink>

      <button
        onClick={toggleNavbar}
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
          {links.map((link) => {
            const child = link.child ? childByKey[link.child] : null;
            const showChild = child?.match;
            const sectionActive = !!child?.sectionActive;

            return (
              <li className='nav-item' key={link.to}>
                <NavLink
                  end={link.end}
                  className={({ isActive }) =>
                    `nav-link js-scroll-trigger${isActive || sectionActive ? ' active' : ''}`
                  }
                  to={link.to}
                >
                  <div onClick={closeNavbar}>{link.label}</div>
                </NavLink>
                {showChild ? (
                  <ul className='nav-submenu'>
                    <li className='nav-submenu-item'>
                      <span className='nav-sublink' title={child.title}>
                        {child.title || '…'}
                      </span>
                    </li>
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default Header;
