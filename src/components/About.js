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
                <div className="col-sm-10">
                    <div className="py-5">
                        <h1>Hello,</h1>
                        <div className="subheading mb-5">I'm Faisal (&#934;sal)</div>
                        <p className="mb-5">I design and develop software for various platforms (Mobile/PC/Web), using different SDKs and tools (React/Angular/Android/Unity) based on the projects needs. I enjoy the challenge of creating engaging solutions and achieving results-driven objectives.
                        I also worked in electronics, embedded software and designing data-driven solutions using machine learning.</p>
                            
                        <p>Nowadays I get my hands dirty with both frontend and backend development and like to ponder stuff like coding standards, design methodologies, usability, and accessibility.</p>
                    </div>

                    <p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>
                </div>

            </div>
		)
	}
}

export default About;