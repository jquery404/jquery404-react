import React from 'react';
import Disqus from 'disqus-react';

const CONTACT_CHANNELS = [
  { href: 'mailto:jquery404@gmail.com', label: 'jquery404@gmail.com', kind: 'Email' },
  { href: 'https://github.com/jquery404/', label: 'github.com/jquery404', kind: 'GitHub', external: true },
  { href: 'https://twitter.com/jquery404', label: '@jquery404', kind: 'Twitter', external: true },
];

class Contact extends React.Component {
  render() {
    const disqusShortname = 'jQuery404';
    const disqusConfig = {
      url: 'http://jquery404.github.io/contact',
      identifier: 'contact',
      title: 'jQuery404',
    };

    return (
      <div className='row'>
        <div className='col-sm-12'>
          <div className='article py-5 contact-page'>
            <h1>Contact Me</h1>
            <p className='contact-lead'>
              Email is best for recruiting or collaboration. For questions or feedback, use the comments below, or ask the cute blue monster in the chat.
            </p>
            <ul className='contact-channels'>
              {CONTACT_CHANNELS.map((c) => (
                <li key={c.href}>
                  <span className='contact-channel-kind'>{c.kind}</span>
                  <a
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
            <Disqus.CommentCount shortname={disqusShortname} config={disqusConfig} />
            <Disqus.DiscussionEmbed shortname={disqusShortname} config={disqusConfig} />
          </div>
        </div>
      </div>
    );
  }
}

export default Contact;
