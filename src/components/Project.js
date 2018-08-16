import React from 'react';
import Swiper from 'react-id-swiper';


const params = {
  pagination: {
    el: '.swiper-pagination',
    type: 'bullets',
    clickable: true
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev'
  }
}


const Portfolio = (props) => 
	<div className="col-sm-4">
		<div className="mb-2">
			{
				props.portfolio.gallery.length === 0 ? 
				(<iframe src={props.portfolio.url} title={props.portfolio.title} frameBorder="0" webkitallowfullscreen="" mozallowfullscreen="" allowFullScreen="allowFullScreen"></iframe>)
				:
				(
					<Swiper {...params}>
						<img className="card-img-top" src={"/assets/imgs/project/"+props.portfolio.img_thumb} alt="" />
						{
							props.portfolio.gallery.map(gallery => 
								<img className="card-img-top" src={"/assets/imgs/project/"+gallery} alt="" />
							)
						}
 		        	
		      </Swiper>
		    )
			}
		  
		  <div className="card-body">
		    <h4 className="card-title">{props.portfolio.title}</h4>
		    <p className="card-text">{props.portfolio.desc}</p>
		  </div>
	  </div>
	</div>


class Project extends React.Component
{
	constructor(){
		super();
		this.state = {
			items:[],
			categories:['All', 'Animation', '3D', 'Android', 'Game', 'Web'],
			activePage: 1,
			itemsCountPerPage: 6,
			totalPage: 0,
			scrolling : false,
		}
	}

	componentWillMount(){
		fetch('http://demo8555295.mockable.io/')
			.then(response => response.json())
			.then(({portfolio:items}) => this.setState({
					items, 
					totalPage: 	Math.floor(items.length / this.state.itemsCountPerPage) + 
											Math.floor(items.length % this.state.itemsCountPerPage)
			}))
			.catch(error => console.log(error));

		this.scrollListener = window.addEventListener ('scroll', (e) => {
			this.handleScroll(e);
		});

	}

	handleScroll = (e) => {
		const {scrolling, totalPage, activePage} = this.state;
		
		if(scrolling || totalPage <= activePage) return;

		var cardWrap = document.querySelector('.portfolioWrap');
		var cardWrapOffset = cardWrap.clientHeight;
		var pageOffset = window.pageYOffset + window.innerHeight;
		
		if(pageOffset > cardWrapOffset + 20) 
				this.handlePageChange();
	}

	filter(value){
		if(value==='all' || value==='All')
			this.setState({filter: null})
		else
			this.setState({filter: value})
	}
	

	handleClick(name, e){
		e.preventDefault();
		this.filter(name.item);
	}

	handlePageChange() {
    this.setState({scrolling: true});
    this.loadNewdata();
  }

  loadNewdata() {

  	const {activePage, totalPage} = this.state;
  	if(activePage < totalPage) {
	  	this.setState({
	  		activePage: activePage + 1,
	  		scrolling: false,
	  	});
  	}	
  	
  }

	render(){
		let items = this.state.items;
		let categories = this.state.categories;

		if(this.state.filter){
			items = items.filter(item=>item.tags.toLowerCase().includes(this.state.filter.toLowerCase()))
		}

		const indexOfLastTodo = this.state.activePage * this.state.itemsCountPerPage;
    const currentTodos = items.slice(0, indexOfLastTodo);
		
		return(
			<div className="row portfolioWrap">
				<div className="col-sm-12">
          <ul className="nav nav-pills my-5">
            {
            	categories.map(item => 
            		<li 
            			key={item} 
            			className={this.state.filter === item ? "active px-2": "px-2"} 
            			onClick={(e)=>this.handleClick({item}, e)}>
            			{item}
            		</li>
            	)
            }
          </ul>
        </div>

				{currentTodos.map(item => <Portfolio key={item.title} portfolio={item} />)}		

						
			</div>
		)
	}
}

export default Project;