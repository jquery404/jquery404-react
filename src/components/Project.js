import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';

const Portfolio = ({ portfolio }) => (
  <div className='col-sm-4'>
    <NavLink className='jq-project-link' to={`/p/${portfolio.slug}`}>
      <div className='mb-2 jq-project'>
        <div className='jq-project-img-wrap'>
          <img className='card-img-top' src={`/assets/imgs/project/${portfolio.thumbnail}`} alt='' />
        </div>
        <div className='card-body'>
          <h4 className='card-title'>{portfolio.title}</h4>
          <p className='card-text'>
            {portfolio.desc.length > 200 ? portfolio.desc.slice(0, 200) + '...' : portfolio.desc}
          </p>
        </div>
      </div>
    </NavLink>
  </div>
);

const Project = () => {
  const [items, setItems] = useState([]);
  const [categories] = useState(['All', 'Web', 'Android', '3D', 'Game', 'Animation']);
  const [filter, setFilter] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [itemsCountPerPage] = useState(6);
  const [totalPage, setTotalPage] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/assets/portfolio.json')
      .then((res) => res.json())
      .then(({ portfolio }) => {
        setItems(portfolio);
        setTotalPage(Math.ceil(portfolio.length / itemsCountPerPage));
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, [itemsCountPerPage]);

  const handleScroll = useCallback(() => {
    const handlePageChange = () => {
      setScrolling(true);
      if (activePage < totalPage) {
        setActivePage((prev) => prev + 1);
        setScrolling(false);
      }
    };
    if (scrolling || totalPage <= activePage) return;
    const cardWrap = document.querySelector('.portfolioWrap');
    if (!cardWrap) return;
    const cardWrapOffset = cardWrap.clientHeight || 100;
    const pageOffset = window.pageYOffset + window.innerHeight;
    if (pageOffset > cardWrapOffset + 20) handlePageChange();
  }, [scrolling, totalPage, activePage]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const filterItems = (value) => {
    if (value.toLowerCase() === 'all') setFilter(null);
    else setFilter(value);
  };

  const filteredItems = filter ? items.filter((item) => item.tags.toLowerCase().includes(filter.toLowerCase())) : items;

  const indexOfLast = activePage * itemsCountPerPage;
  const currentTodos = filteredItems.slice(0, indexOfLast);

  if (loading) {
    return (
      <div className='row'>
        <div className='col-sm-12'>
          <div className='py-5 text-center'>
            <div className='spinner-border text-primary' role='status'>
              <span className='sr-only'>Loading...</span>
            </div>
            <p className='mt-3'>Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='portfolioWrap'>
      <div className='project-filter-bar'>
        <ul className='nav nav-pills project-filter-pills'>
          {categories.map((item) => (
            <li
              key={item}
              className={filter === item || (filter === null && item === 'All') ? 'active px-2' : 'px-2'}
              onClick={(e) => {
                e.preventDefault();
                filterItems(item);
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className='row'>
        {currentTodos.map((item, i) => (
          <Portfolio key={i} portfolio={item} />
        ))}
      </div>
    </div>
  );
};

export default Project;
