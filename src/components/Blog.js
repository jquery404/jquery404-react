import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Blog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('https://api.github.com/repos/jquery404/jquery404.github.io/issues')
      .then((response) => response.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  const minRead = (length) => {
    const minutes = Math.floor(length / 200);
    const seconds = Math.floor(((length / 200) % 1) * 0.6 * 100);
    return `${minutes}.${seconds} min read`;
  };

  if (loading) {
    return (
      <div className='row'>
        <div className='col-sm-10'>
          <div className='py-5 text-center'>
            <div className='spinner-border text-primary' role='status'>
              <span className='sr-only'>Loading...</span>
            </div>
            <p className='mt-3'>Loading blog posts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='row'>
      <div className='col-sm-10'>
        <div className='py-5'>
          <h1>Blog</h1>
          <div>
            {items.map((item, i) => (
              <div key={i} className='mb-5'>
                <h3>
                  <Link to={`/blog/${item.number}`}>{item.title}</Link>
                </h3>
                <span className='meta-blog'>
                  <i>
                    by {item.user.login} - {minRead(item.body.length)}
                  </i>{' '}
                  &nbsp;<i className='fa fa-comment' aria-hidden='true'></i>&nbsp;
                  {item.comments}
                </span>
                <div className='pt-3' dangerouslySetInnerHTML={{ __html: item.body }}></div>
                <hr />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
