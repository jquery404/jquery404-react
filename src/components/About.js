import React from 'react';
import { Link } from 'react-router-dom';
import { events } from './Events';


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

class About extends React.Component
{
    constructor(props, context) {
        super(props, context);

        this.state = {
          modal: false
        };

        this.toggle = this.toggle.bind(this);
    };

    toggle() {
        this.setState({
          modal: !this.state.modal
        });
    }

	render(){
		return(
            <div className="row">
                <div className="col-sm-7">
                    <div className="py-5">
                        <h1>Hello,</h1>
                        <div className="subheading mb-5">I'm Faisal (&#934;sal)</div>
                        
                        <div className="pp"><iframe title="jquery404" className="ppp" src="https://player.vimeo.com/video/29850027?autoplay=1&loop=1&title=0&byline=0&portrait=0" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
                        
                        <p className="my-5">
                        I create software for all sorts of platforms (<i className="fab fa-windows"></i> / <i className="fab fa-apple"></i> / <i className="fab fa-linux"></i>). 
                        I use different tools depending on what the project needs (<i className="fab fa-react"></i> / <i className="fab fa-angular"></i> / <i className="fab fa-android"></i> / <i className="fab fa-unity"></i>). 
                        I've dabbled in electronics, embedded software, and even business intelligence (BI) applications before. 
                        Right now, I spend most of my days developing XR (<i className="fas fa-vr-cardboard"></i>) tools and getting lost in my thoughts about coding standards, design methodologies, usability, and accessibility. 
                        And when I'm not doing that, I'm just making some weird stuff like the kind you saw in that video. Cheers!
                        </p>
                    </div>

                    <h4>Updates</h4>
                    {
                        events.map((item, i) => i<2? <EventCard key={i} _={item} /> : '')
                    }

                    <Link to="/updates"><small>Load All...</small></Link>

                    
                    <p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>
                </div>

            </div>
		)
	}
}

export default About;