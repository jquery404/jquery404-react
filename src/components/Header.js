import React from 'react';
import {NavLink} from 'react-router-dom';

class Header extends React.Component
{
	render(){
		return(
	      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top" id="sideNav">
		      <NavLink className="navbar-brand js-scroll-trigger" to="/">
		        <span className="d-block d-lg-none">jQuery404</span>
		        <span className="d-none d-lg-block">
		          <img className="img-fluid img-profile mx-auto mb-2" src="/assets/imgs/logo.png" alt=""/>
		        </span>
		      </NavLink>
		      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
		        <span className="navbar-toggler-icon"></span>
		      </button>
		      <div className="collapse navbar-toggle navbar-collapse" id="navbarSupportedContent">
		        <ul className="navbar-nav">
		          <li className="nav-item">
		            <NavLink exact={true} activeClassName="active" className="nav-link js-scroll-trigger" to="/">About</NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/project">Project</NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/research">Research</NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/contact">Contact</NavLink>
		          </li>
		        </ul>
		      </div>
		    </nav>
		)
	}
}

export default Header;