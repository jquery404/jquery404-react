import React from 'react';
import './App.css';

import Header from './components/Header';
import Footer from './components/Footer';

class App extends React.Component
{
	constructor(props) {
		super(props);
		this.state = {
		  ipAddress: null,
		  ipInfo: null,
		  error: null,
		};
	}

	componentDidMount() {
		fetch('https://ipapi.co/json/')
			.then(response => response.json())
			.then(data => {
				if (data.country_name === "Wellington") {
					window.location.href = "https://www.google.com";
				} else {
					this.setState({ data });
					this.callAwsLambdaFunction(data);
				}
				
			})
			.catch(error => {
				this.setState({ error });
			});
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
			if (response.ok) {
				return response.status;
			} else {
				throw new Error('Error calling AWS Lambda function');
			}
		})
		.then(result => {
			// console.log('AWS Lambda function response:', result);
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

export default App;