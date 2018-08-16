import React from 'react';

class Footer extends React.Component
{
	render(){
		return(
			<footer className="py-5">
				<div className="container">
        	<div className="row">
						<div className="col-12 text-center">
							<ul className="list-inline social-buttons">
	              <li className="list-inline-item">
	                  <i className="material-icons md-48">looks_3</i>
	              </li>
	              <li className="list-inline-item">
	                  <i className="material-icons md-48">looks_two</i>
	              </li>
	              <li className="list-inline-item">
	                  <i className="material-icons md-48">looks_one</i>
	              </li>
	            </ul>
						</div>
						<div className="col-12 text-center">
							&copy; {new Date().getFullYear()}. All rights reserved.
						</div>
					</div>
				</div>
			</footer>
		)
	}
}

export default Footer;