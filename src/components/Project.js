import React from 'react';
import Swiper from 'react-id-swiper/lib/custom';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';

const params = {
	loop: true,
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
				(
					<iframe 
						src={props.portfolio.url} 
						title={props.portfolio.title} 
						frameBorder="0" 
						webkitallowfullscreen="" 
						mozallowfullscreen="" 
						allowFullScreen="allowFullScreen">
					</iframe>
				)
				:
				(
					<img 
						onClick={props.gallery} 		
						className="card-img-top" 
						src={"/assets/imgs/project/"+props.portfolio.img_thumb} 
						alt="" />
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
	constructor(props, context) {
		super(props, context);
		this.state = {
			items:[],
			gallery: 0,
			categories:['All', 'Animation', '3D', 'Android', 'Game', 'Web'],
			activePage: 1,
			itemsCountPerPage: 6,
			totalPage: 0,
			scrolling : false,
			modal: false,
		}

    this.toggle = this.toggle.bind(this);
	}

	toggle() {
      this.setState({
        modal: !this.state.modal
      });
  }

  updateGallery(val) {
  		this.setState({
        gallery: val
      });
  		this.toggle();
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


	componentDidMount(){
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
		let galId = this.state.gallery;

		if(this.state.filter){
			items = items.filter(item=>item.tags.toLowerCase().includes(this.state.filter.toLowerCase()))
		}

		const indexOfLastTodo = this.state.activePage * this.state.itemsCountPerPage;
    const currentTodos = items.slice(0, indexOfLastTodo);
    
		return (
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

        {/*	
        	*	modal section 
        	* this part generate details pop up for each project
        	*/}
        <div>
				  <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
				      <ModalHeader>
				      	{(currentTodos[galId] !== undefined) ? currentTodos[galId].title : ''}
				      </ModalHeader>

				      <ModalBody>
				          <Swiper {...params} shouldSwiperUpdate>
					          {
											(currentTodos[this.state.gallery] !== undefined) ? 
											currentTodos[this.state.gallery].gallery.map((gallery, i) => 
												<img key={i} className="card-img-top" src={"/assets/imgs/project/"+gallery} alt="" />
											) : ''
										}
				          </Swiper>
				      </ModalBody>
				      <ModalFooter>
				          <Button color="primary" onClick={this.toggle}>Do Something</Button>
				          <Button color="secondary" onClick={this.toggle}>Cancel</Button>
				      </ModalFooter>
				  </Modal>
				</div>

				{/*
					* loop for each project
					*/}
				{currentTodos.map((item, i) => 
					<Portfolio 
						key={i} 
						gallery={() => this.updateGallery(i)}
						portfolio={item} />
				)}

						
			</div>
		)
	}
}

export default Project;