import React from 'react';
import {events, EventCard} from './Events';

class Updates extends React.Component
{  
	render(){
		return(
            <div className="row">
                <div className="col-sm-7 py-5">
                    
                    <h4>Updates</h4>
                    {
                        events.map((item, i) => <EventCard key={i} data={item} />)
                    }
                </div>

            </div>
		)
	}
}

export default Updates;