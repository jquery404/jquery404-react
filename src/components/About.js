import React from 'react';



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
                        
                        <p className="my-5">I design and develop software for various platforms (Mobile/PC/Web), using different SDKs and tools (React/Angular/Android/Unity) based on the projects needs. I enjoy the challenge of creating engaging solutions and achieving results-driven objectives.
                        I have also worked in electronics, embedded software, and data-driven design using machine learning.</p>
                            
                        <p>Nowadays I get my hands dirty with both frontend and backend development and like to ponder stuff like coding standards, design methodologies, usability, and accessibility.</p>
                    </div>

                    <p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>
                </div>

            </div>
		)
	}
}

export default About;