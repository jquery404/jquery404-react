import React from 'react';
import {events, EventCard} from './Events';



class UpdateDetails extends React.Component
{  
	render(){
        
		return(
            <div className="row">
                <div className="col-sm-7 py-5">
                    
                    <h4>Updates</h4>
                    {
                        events.map((item, i) => <EventCard key={i} _={item} />)
                    }
                </div>

            </div>
		)
	}
}

export default UpdateDetails;