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
                  <a href="https://twitter.com/jquery404" target="_blank" rel="noopener noreferrer">
	                  <span class="fa-stack fa-lg">
	                      <i class="fa fa-circle fa-stack-2x"></i>
	                      <i class="fa fa-twitter fa-stack-1x fa-inverse"></i>
	                  </span>
                  </a>
	              </li>
	              <li className="list-inline-item">
	              	<a href="https://github.com/jquery404/" target="_blank" rel="noopener noreferrer">
	                  <span class="fa-stack fa-lg">
	                      <i class="fa fa-circle fa-stack-2x"></i>
	                      <i class="fa fa-github fa-stack-1x fa-inverse"></i>
	                  </span>
	                </a>
	              </li>
	              <li className="list-inline-item">
	              	<a href="http://instagram.com/jquery404" target="_blank" rel="noopener noreferrer">
	                  <span class="fa-stack fa-lg">
                        <i class="fa fa-circle fa-stack-2x"></i>
                        <i class="fa fa-instagram fa-stack-1x fa-inverse"></i>
                    </span>
                  </a>
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