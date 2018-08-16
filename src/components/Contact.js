import React from 'react';
import Disqus from 'disqus-react';

class Contact extends React.Component
{
	render(){
		const disqusShortname = 'jQuery404';
	  const disqusConfig = {
	      url: 'http://jquery404.github.io/contact',
	      identifier: 'contact',
	      title: 'jQuery404',
	  };

	  
		return(
			<div className="row">
				<div className="col-sm-12">
						<div className="article py-5">
              <h1>Contact Me</h1>
              <Disqus.CommentCount shortname={disqusShortname} config={disqusConfig}>
              </Disqus.CommentCount>
              <p>If you have any query feel free to leave a message.</p>
              <Disqus.DiscussionEmbed shortname={disqusShortname} config={disqusConfig} />
            </div>
				</div>
			</div>
		)
	}
}

export default Contact;