import React from 'react';

class Photo extends React.Component
{
	constructor(props, context) {
		super(props, context);
		this.state = {
			items:[],
			flexBasis: '33%',
		}
	}

	componentWillMount(){
		fetch('https://api.instagram.com/v1/users/self/media/recent/?access_token=1031238628.1677ed0.aa2f4573012a4383a0f6f3a1b94375af')
			.then(response => response.json())
			.then(({data:items}) => this.setState({items:items}))
			.catch(error => console.log(error));
	}

	componentDidMount() {
    this.setImageSize()
  }

	setImageSize = () => {
		if(window.innerWidth < 480) {
		 this.setState({flexBasis: '100%'})
		} else if(window.innerWidth < 768) {
		 this.setState({flexBasis: '50%'})
		}else{
		 this.setState({flexBasis: '33%'})
		}
	}

	render(){
		let items = this.state.items;
		let flexBasis = this.state.flexBasis;

		return (
			<div className="row portfolioWrap">
				<div className="col-sm-12">
					<h1 className="mt-5">Photography</h1>
					<p>I love creating beautiful & natural photographs with a touch of magic. My specialities are the city, landscape and nature photography. </p>
				</div>
				{/*
					* loop for each project
					*/}
					

					<div style={{display: 'flex', flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center'}}>
            {
            	items.map((item, i) => 
            		<div 
            			style={{display: 'flex', flexBasis: flexBasis, flexDirection: 'column', padding: '1em'}}
            			key={i} 
            			>
            			<a href={item.link}><img style={{maxWidth: '100%',}} alt="" src={item.images.standard_resolution.url} /></a>
            			<span style={{display: 'flex', flexWrap: 'wrap', paddingTop:'0.5em', color: '#000000'}}>
                      <i className="fa fa-heart">&nbsp; {item.likes.count}</i>&nbsp; 
                      <i className="fa fa-comment">&nbsp; {item.comments.count}</i>
                  </span>
            		</div>
            	)
            }
          </div>

						
			</div>
		)
	}
}

export default Photo;