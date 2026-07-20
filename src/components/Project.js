import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import ProjectMedia from './ProjectMedia';

const Portfolio = ({ portfolio, gallery }) => (
  <div className='col-sm-4' onClick={gallery}>
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
  </div>
);

const Project = () => {
  const [items, setItems] = useState([]);
  const [gallery, setGallery] = useState(0);
  const [categories] = useState(['All', 'Web', 'Android', '3D', 'Game', 'Animation']);
  const [filter, setFilter] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [itemsCountPerPage] = useState(6);
  const [totalPage, setTotalPage] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [loadModal, setLoadModal] = useState(false);
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

  const swiperParams = {
    loop: Boolean(currentTodos[gallery]?.gallery?.length > 1),
    centeredSlides: true,
    pagination: { clickable: true },
    navigation: true,
    modules: [Navigation, Pagination],
  };

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

      <Modal isOpen={loadModal} size='xl' className='project-modal' toggle={() => setLoadModal(false)}>
        <ModalHeader>
          {currentTodos[gallery]?.title || ''}
          <button
            type='button'
            className='project-modal-close'
            aria-label='Close'
            onClick={() => setLoadModal(false)}
          >
            ✕
          </button>
        </ModalHeader>

        <ModalBody className='project-modal-body'>
          <div className='row project-modal-layout'>
            <div className='col-12 project-modal-media-col'>
              <Swiper {...swiperParams} key={`${currentTodos[gallery]?.slug || 'project'}-${gallery}`}>
                {currentTodos[gallery]?.gallery.map((g, i) => {
                  return (
                  <SwiperSlide key={i}>
                    <ProjectMedia item={g} index={i} context='modal' />
                  </SwiperSlide>
                );
                })}
              </Swiper>
            </div>

            <div className='col-12 project-modal-content-col'>
              <p>{currentTodos[gallery]?.desc}</p>
              <p className='project-modal-tags'>[{currentTodos[gallery]?.tags}]</p>
              <div className='project-modal-actions'>
                {currentTodos[gallery]?.url && (
                  <a
                    className='btn-modal-action'
                    target='_blank'
                    rel='noreferrer'
                    href={currentTodos[gallery].url}
                  >
                    <i className='fa fa-external-link-alt'></i> Project Link
                  </a>
                )}
                <NavLink className='btn-modal-action btn-modal-action--primary' to={`/p/${currentTodos[gallery]?.slug}`}>
                  <i className='fa fa-expand'></i> Show more
                </NavLink>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>

      <div className='row'>
        {currentTodos.map((item, i) => (
          <Portfolio
            key={i}
            gallery={() => {
              setGallery(i);
              setLoadModal(true);
            }}
            portfolio={item}
          />
        ))}
      </div>
    </div>
  );
};

export default Project;
