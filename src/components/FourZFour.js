import React from "react";
import {NavLink} from 'react-router-dom';

class FourZFour extends React.Component{
	render(){
		return(
			<div className="container">
        		<div className="row">
					<div className="col-12 text-center pt-5" style={{height: '75vh'}}>
						
						<div className="clearfix">
							<i className="material-icons md-48">looks_4</i>
							<img src="assets/imgs/404.gif" width="50px" alt="" />
							<i className="material-icons md-48">looks_4</i>
						</div>
						<p>Page not found.<br/> 
						Don't worry let me bring you back to <NavLink exact={true} activeClassName="active" className="nav-link js-scroll-trigger" to="/">About</NavLink></p>
					</div>
				</div>
			</div>
		)
	}
}

export default FourZFour;