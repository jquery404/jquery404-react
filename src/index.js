import React from 'react';
import ReactDOM from 'react-dom';
import {Route, Switch, HashRouter as Router} from 'react-router-dom';

import App from './App';
import About from './components/About';
import Project from './components/Project';
import ProjectDetails from './components/ProjectDetails';
import Research from './components/Research';
import Blog from './components/Blog';
import Post from './components/Post';
import Photo from './components/Photo';
import Updates from './components/Updates';
import UpdateDetails from './components/UpdateDetails';
import Contact from './components/Contact';
import Shop from './components/Shop';
import Note from './components/Note';
import FourZFour from './components/FourZFour';


ReactDOM.render(
	<Router>
		<App>
			<Switch>
				<Route exact path="/" component={About} />
				<Route exact path="/project" component={Project} />
				<Route exact path="/p/:id" component={ProjectDetails} />
				<Route exact path="/research" component={Research} />
				<Route exact path="/blog" component={Blog} />
				<Route exact path="/blog/:id" component={Post} />
				<Route exact path="/photo" component={Photo} />
				<Route exact path="/updates" component={Updates} />
				<Route exact path="/updates/:id" component={UpdateDetails} />
				<Route exact path="/contact" component={Contact} />
				<Route exact path="/shop" component={Shop} />
				<Route exact path="/note" component={Note} />
				<Route component={FourZFour} />
			</Switch>
		</App>
	</Router>
	, root
);
