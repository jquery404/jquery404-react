import React from 'react';
import { Link } from 'react-router-dom';


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
                            I make software for different platforms (<i className="fab fa-windows"></i> / <i className="fab fa-apple"></i> / <i className="fab fa-linux"></i>) 
                            using different tools (<i className="fab fa-react"></i> / <i className="fab fa-angular"></i> / <i className="fab fa-android"></i> / <i className="fab fa-unity"></i>) 
                            depending on the project needs. 
                            In the past, I have worked in electronics, embedded software and business intelligence (BI) applications.
                            Currently, I spent most of my time developing XR (<i className="fas fa-vr-cardboard"></i>) tools and love thinking about things like coding standards, design methodologies, usability, and accessibility.
                        </p>
                    </div>

                    <h4>Updates</h4>

                    <div className="update-c card mb-2">
                        <div className="card-horizontal">
                            <div className="img-square-wrapper" style={{backgroundImage:`url('assets/imgs/gisnz.jpg')`}}>......</div>
                            <div className="update-card card-body m-0 p-1">
                                <a href="https://tinyurl.com/6jaj765v">
                                    <small>17-18 Apr'21</small><br/>
                                    <b className="mb-1">TakiWaehere – New Zealand Geospatial Hackathon</b>
                                    <p className="mb-1">by MBIE and Maxar</p>
                                    <small><i className="fa fa-github"></i> https://tinyurl.com/y5ce3s7f</small>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="update-c card mb-2">
                        <div className="card-horizontal">
                            <div className="img-square-wrapper" style={{backgroundImage:`url('assets/imgs/aucxr.jpg')`}}>......</div>
                            <div className="update-card card-body m-0 p-1">
                                <a href="https://tinyurl.com/6jaj765v">
                                    <small>9-12 Feb'21</small><br/>
                                    <b className="mb-1">International XR (AR/VR) Workshop</b>
                                    <p className="mb-1">Auckland, University of Auckland</p>
                                    <small><i className="fa fa-github"></i> https://tinyurl.com/6jaj765v</small>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="update-c card mb-2">
                        <div className="card-horizontal">
                            <div className="img-square-wrapper" style={{backgroundImage:`url('https://github.com/jquery404/ccrpg/raw/main/resources/1.jpg')`}}>......</div>
                            <div className="update-card card-body m-0 p-1">
                                <a href="https://tinyurl.com/zac5dde3">
                                    <small>16 Aug'20</small><br/>
                                    <b className="mb-1">SWEN 422: CCRPG</b>
                                    <p className="mb-1">Victoria University of Wellington</p>
                                    <small><i className="fa fa-github"></i> https://tinyurl.com/zac5dde3</small>
                                </a>
                            </div>
                        </div>
                    </div>

                    <Link to="/updates"><small>Load All...</small></Link>

                    
                    <p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>
                </div>

            </div>
		)
	}
}

export default About;