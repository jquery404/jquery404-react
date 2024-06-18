import React from 'react';
import './App.css';
import { withRouter } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';

class App extends React.Component
{
	constructor(props) {
		super(props);
		this.state = {
		  ipInfo: null,
		  error: null,
		};
	}

	componentDidMount() {
		this.fetchData();
	}
	
	componentDidUpdate(prevProps) {
		if (this.props.location.pathname !== prevProps.location.pathname) {
		  this.fetchData();
		}
	}
	
	fetchData() {
		const { pathname } = this.props.location;
	
		if (this.state.ipInfo === null) {
			fetch('https://ipapi.co/json/')
			.then(response => {
				if (!response.ok) {
				throw new Error('Failed to fetch IP information');
				}
				return response.json();
			})
			.then(data => {
				if (data.country_code === "ID") {
				window.location.href = "https://www.google.com";
				} else {
				data.country_population = pathname; 
				this.setState({ ipInfo: data, error: null });
				this.callAwsLambdaFunction(data);
				}
			})
			.catch(error => {
				this.setState({ error: error.message });
			});
		} else {
			let newData = this.state.ipInfo;
			newData.country_population = pathname;
			this.setState({ipInfo: newData});
			this.callAwsLambdaFunction(this.state.ipInfo);
		}
	}
	  
	
	callAwsLambdaFunction(ipInfo) {
		const apiUrl = 'https://adnke1sq71.execute-api.ap-southeast-2.amazonaws.com/default/jq404';
	
		fetch(apiUrl, {
		  method: 'POST',
		  body: JSON.stringify({ key1: JSON.stringify(ipInfo) }),
		  headers: {
			'Content-Type': 'application/json',
		  },
		})
		.then(response => {
		  if (!response.ok) {
			throw new Error('Failed to call AWS Lambda function');
		  }
		})
		.catch(error => {
		  console.error('Error calling AWS Lambda function:', error.message);
		});
	}

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

export default withRouter(App);