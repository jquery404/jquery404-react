import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const Post = () => {
  const { id } = useParams(); // /blog/:id from the route
  const navigate = useNavigate();

  const [item, setItem] = useState({});
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    // Fetch post
    fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues/${id}`)
      .then((response) => response.json())
      .then((data) => setItem(data))
      .catch((error) => console.error(error));

    // Fetch comments
    fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues/${id}/comments`)
      .then((response) => response.json())
      .then((data) => setComments(data))
      .catch((error) => console.error(error));
  }, [id]);

  const minRead = (length) => {
    const minutes = Math.floor(length / 200);
    const seconds = Math.floor(((length / 200) % 1) * 0.6 * 100);
    return `${minutes}.${seconds} min read`;
  };

  const postComment = (e) => {
    e.preventDefault();
    fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: comment }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setComments((prev) => [...prev, data]);
        setComment('');
      })
      .catch((error) => console.error(error));
  };

  return (
    <div className='row'>
      <div className='col-sm-10'>
        <div className='py-5'>
          <div>
            <span className='pointer' onClick={() => navigate(-1)}>
              <i className='fa fa-chevron-left'></i> Back
            </span>
            <h3>{item.title}</h3>
            <span className='meta-blog'>
              <i>
                by {item.user.login} - {minRead(item.body.length)}
              </i>{' '}
              &nbsp;<i className='fa fa-comment' aria-hidden='true'></i>&nbsp;
              {item.comments}
            </span>
            {item.body && <p dangerouslySetInnerHTML={{ __html: item.body }}></p>}
          </div>
          <div>
            <hr />
            <b>Comments:</b> <br />
            <form onSubmit={postComment}>
              <input type='text' value={comment} onChange={(e) => setComment(e.target.value)} />
              <input type='submit' value='Submit' />
            </form>
            {comments.length
              ? comments.map((c, i) => (
                  <div key={i}>
                    <span className='avatar'>{c.user?.login?.charAt(0).toUpperCase()}</span> <i>{c.user?.login}</i>
                    <p dangerouslySetInnerHTML={{ __html: c.body }}></p>
                  </div>
                ))
              : ' No comments yet'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Post;
