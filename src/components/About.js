import React from 'react';
import { Link } from 'react-router-dom';
import { events, EventCard } from './Events';

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
                        <h1>Hello <span role="img" aria-label="Waving hand">👋</span></h1>
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
                        events.map((item, i) => i<4? <EventCard key={i} data={item} /> : '')
                    }

                    <Link to="/updates"><small>Show All...</small></Link>

                    {/* <div className="my-5">
                        <b>Procedural Animation:</b>
                        <p>I specialize in simulating a wide range of effects, from simple movements like swaying grass to complex behaviors such as simulating crowds of characters or natural phenomena.</p>
                    
                    
                        <img alt="" className="img-fluid" src="https://unity.com/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Ffuvbjjlp%2Fproduction%2Fcf8c05c7945039784b4b739e8ae76810bff067be-1200x900.png&w=750&q=75"/>
                        
                    </div> */}

                    
                    <p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>
                </div>

            </div>
		)
	}
}

export default About;