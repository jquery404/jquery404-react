import React from 'react';
import {events} from './Events';

const EventCard = (props) => 
    <div className="update-c card mb-2">
        <div className="card-horizontal">
            <div className="img-square-wrapper" style={{backgroundImage:`url(${props._.thumb})`}}>......</div>
            <div className="update-card card-body m-0 p-1">
                <a href={props._.url}>
                    <small>{props._.date}</small><br/>
                    <b className="mb-1">{props._.title}</b>
                    <p className="mb-1">{props._.place}</p>
                    <small dangerouslySetInnerHTML={{ __html: props._.html }} />
                </a>
            </div>
        </div>
    </div>

class UpdateDetail extends React.Component
{  
	render(){
        console.log(events);
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

export default UpdateDetail;