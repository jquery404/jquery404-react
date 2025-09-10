import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';

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

  useEffect(() => {
    fetch('/assets/portfolio.json')
      .then((res) => res.json())
      .then(({ portfolio }) => {
        setItems(portfolio);
        setTotalPage(Math.ceil(portfolio.length / itemsCountPerPage));
      })
      .catch(console.error);
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
    loop: true,
    centeredSlides: true,
    pagination: { clickable: true },
    navigation: true,
    modules: [Navigation, Pagination],
  };

  return (
    <div className='row portfolioWrap'>
      <div className='col-sm-12'>
        <ul className='nav nav-pills my-5'>
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

      <Modal isOpen={loadModal} size='lg' toggle={() => setLoadModal(false)}>
        <ModalHeader>
          {currentTodos[gallery]?.title || ''}
          <i
            style={{ position: 'absolute', right: 20, top: 20 }}
            onClick={() => setLoadModal(false)}
            className='fa fa-times'
          />
        </ModalHeader>

        <ModalBody>
          <div className='row'>
            <div className='col-sm-12 col-md-7' style={{ overflow: 'hidden' }}>
              <Swiper {...swiperParams}>
                {currentTodos[gallery]?.gallery.map((g, i) => (
                  <SwiperSlide key={i}>
                    {g.type === 'image' ? (
                      <img className='card-img-top' src={`/assets/imgs/project/${g.url}`} alt='' />
                    ) : g.url.endsWith('.mp4') ? (
                      <div className='video-container'>
                        <video autoPlay muted loop playsInline className='swiper-slide-video'>
                          <source src={`/assets/imgs/project/${g.url}`} type='video/mp4' />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : (
                      <div className='iframe-container'>
                        <iframe
                          title={i}
                          className='swiper-slide-iframe'
                          src={g.url}
                          frameBorder='0'
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <div className='col-sm-12 col-md-5'>
              <p>{currentTodos[gallery]?.desc}</p>
              <p>[{currentTodos[gallery]?.tags}]</p>
              {currentTodos[gallery]?.url && (
                <a className='nav-link-inline' target='_blank' rel='noreferrer' href={currentTodos[gallery].url}>
                  <i className='fa fa-external-link-alt'></i> Project Link
                </a>
              )}{' '}
              <NavLink className='nav-link-inline' to={`/p/${currentTodos[gallery]?.slug}`}>
                <i className='fa fa-expand'></i> Show more
              </NavLink>
            </div>
          </div>
        </ModalBody>
      </Modal>

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
  );
};

export default Project;
