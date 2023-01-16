import React from 'react';
import {events} from './Events';

const EventCard = (props) => 
    <div className="update-c card mb-2">
        <div className="card-horizontal">
            <div className="img-square-wrapper" style={{backgroundImage:`url(${props._.thumb})`}}>......</div>
            <div className="update-card card-body m-0 p-1">
                <small>{props._.date}</small><br/>
                <a href={props._.url}><b className="mb-1">{props._.title}</b></a>
                <p className="mb-1">{props._.place}</p>
                <small dangerouslySetInnerHTML={{ __html: props._.html }} />
            </div>
        </div>
    </div>

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