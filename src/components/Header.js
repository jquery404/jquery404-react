import React from 'react';
import {NavLink} from 'react-router-dom';

class Header extends React.Component
{

	constructor(props, context) {
		super(props, context);

		this.state = {
		 collapsed: true,
		};
		this.toggleNavbar = this.toggleNavbar.bind(this);
	}


	toggleNavbar(){
		this.setState({
			collapsed: !this.state.collapsed
		});
	}

	render(){

		const collapsed = this.state.collapsed;
		const navBtnClass = collapsed ? "navbar-toggler collapsed" : "navbar-toggler";
		const navChildClass = collapsed ? "navbar-toggle navbar-collapse collapse" : "navbar-toggle navbar-collapse collapse show";


		return(
	      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top" id="sideNav">
		      <NavLink className="navbar-brand js-scroll-trigger" to="/">
		        <span className="d-block d-lg-none">jQuery404</span>
		        <span className="d-none d-lg-block">
		          <img className="img-fluid img-profile mx-auto mb-2" src="/assets/imgs/logo.png" alt=""/>
		        </span>
		      </NavLink>
		      <button onClick={this.toggleNavbar} className={`${navBtnClass}`} type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
		        <span className="navbar-toggler-icon"></span>
		      </button>
		      <div className={`${navChildClass}`} id="navbarSupportedContent">
		        <ul className="navbar-nav">
		          <li className="nav-item">
		            <NavLink exact={true} activeClassName="active" className="nav-link js-scroll-trigger" to="/"><div onClick={this.toggleNavbar}>About</div></NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/project"><div onClick={this.toggleNavbar}>Project</div></NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/research"><div onClick={this.toggleNavbar}>Research</div></NavLink>
		          </li>
				  <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/blog"><div onClick={this.toggleNavbar}>Blog</div></NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/photo"><div onClick={this.toggleNavbar}>Photo</div></NavLink>
		          </li>
		          <li className="nav-item">
		            <NavLink activeClassName="active" className="nav-link js-scroll-trigger" to="/contact"><div onClick={this.toggleNavbar}>Contact</div></NavLink>
		          </li>
		        </ul>
		      </div>
		    </nav>
		)
	}
}

export default Header;