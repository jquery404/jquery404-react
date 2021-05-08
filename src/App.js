import React from 'react';
import './App.css';

import Header from './components/Header';
import Footer from './components/Footer';

class App extends React.Component
{
	render(){
		return(
			<div className="App">
				<Header />

				<div className="container-fluid">
						<div className="row">
        			<div className="col-sm-12">
								{this.props.children}
							</div>
						</div>
				</div>

				<Footer />
			</div>
		);
	}
}

export default App;