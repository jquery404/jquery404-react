import React from 'react';
import { events } from './Events';
import { EventCard } from './Helper';

class Updates extends React.Component {
  render() {
    return (
      <>
        <header className='home-hero' style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem' }}>
          <p className='home-kicker'>Talks · demos · appearances</p>
          <h1 className='home-name' style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}>
            Updates
          </h1>
        </header>
        <div className='event-list'>
          {events.map((item, i) => (
            <EventCard key={i} data={item} />
          ))}
        </div>
      </>
    );
  }
}

export default Updates;
