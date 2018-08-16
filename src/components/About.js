import React from 'react';
import {Modal, Button, ButtonToolbar} from 'react-bootstrap';


class MyLargeModal extends React.Component {
  render() {
    return (
      <Modal
        {...this.props}
        bsSize="large"
        aria-labelledby="contained-modal-title-lg"
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-lg">Modal heading</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h4>Wrapped Text</h4>
          <p>
            Cras mattis consectetur purus sit amet fermentum. Cras justo odio,
            dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta
            ac consectetur ac, vestibulum at eros.
          </p>
          <p>
            Praesent commodo cursus magna, vel scelerisque nisl consectetur et.
            Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor
            auctor.
          </p>
          <p>
            Aenean lacinia bibendum nulla sed consectetur. Praesent commodo
            cursus magna, vel scelerisque nisl consectetur et. Donec sed odio
            dui. Donec ullamcorper nulla non metus auctor fringilla.
          </p>
          <p>
            Cras mattis consectetur purus sit amet fermentum. Cras justo odio,
            dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta
            ac consectetur ac, vestibulum at eros.
          </p>
          <p>
            Praesent commodo cursus magna, vel scelerisque nisl consectetur et.
            Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor
            auctor.
          </p>
          <p>
            Aenean lacinia bibendum nulla sed consectetur. Praesent commodo
            cursus magna, vel scelerisque nisl consectetur et. Donec sed odio
            dui. Donec ullamcorper nulla non metus auctor fringilla.
          </p>
          <p>
            Cras mattis consectetur purus sit amet fermentum. Cras justo odio,
            dapibus ac facilisis in, egestas eget quam. Morbi leo risus, porta
            ac consectetur ac, vestibulum at eros.
          </p>
          <p>
            Praesent commodo cursus magna, vel scelerisque nisl consectetur et.
            Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor
            auctor.
          </p>
          <p>
            Aenean lacinia bibendum nulla sed consectetur. Praesent commodo
            cursus magna, vel scelerisque nisl consectetur et. Donec sed odio
            dui. Donec ullamcorper nulla non metus auctor fringilla.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}


class About extends React.Component
{
    constructor(props, context) {
        super(props, context);

        this.state = {
          smShow: false,
          lgShow: false
        };
    };

	render(){
        let smClose = () => this.setState({ smShow: false });
        let lgClose = () => this.setState({ lgShow: false });

		return(
			<div className="py-5">
                <h1>Hello,</h1>
                <div className="subheading mb-5">I'm Faisal (&#934;sal)</div>
                <p className="mb-5">
                	I design and develop software for various platforms (Mobile/PC/Web), using different SDKs and tools (React/Angular/Android/Unity) based on the projects needs. I enjoy the challenge of creating engaging solutions and achieving results-driven objectives.
                	I also worked in electronics, embedded software and designing data-driven solutions using machine learning.
                </p>
                
                <p>Nowadays I get my hands dirty with both frontend and backend development and like to ponder stuff like coding standards, design methodologies, usability, and accessibility.</p>
        				
        		<p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>

                <ButtonToolbar>
                    <Button
                      bsStyle="primary"
                      onClick={() => this.setState({ smShow: true })}
                    >
                      Launch small demo modal
                    </Button>
                    <Button
                      bsStyle="primary"
                      onClick={() => this.setState({ lgShow: true })}
                    >
                      Launch large demo modal
                    </Button>

                    <MyLargeModal show={this.state.lgShow} onHide={lgClose} />
                </ButtonToolbar>

            </div>
		)
	}
}

export default About;