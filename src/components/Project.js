import React from 'react';
import Swiper from 'react-id-swiper/lib/custom';
import {Modal, ModalHeader, ModalBody } from 'reactstrap';

const params = {
	loop: true,
	centeredSlides: true,
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
	<div className="col-sm-4" onClick={props.gallery}>
		<div className="mb-2 jq-project">
			<img 
				className="card-img-top" 
				src={"/assets/imgs/project/"+props.portfolio.thumbnail} 
				alt="" />
		  
		  <div className="card-body">
		    <h4 className="card-title">{props.portfolio.title}</h4>
		    <p className="card-text">{props.portfolio.desc.length > 200 ? props.portfolio.desc.slice(0,200) + "..." : props.portfolio.desc}</p>
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
			filter: null,
			activePage: 1,
			itemsCountPerPage: 6,
			totalPage: 0,
			scrolling : false,
			loadModal: false,
		}

    this.closeModal = this.closeModal.bind(this);
	}

	closeModal() {
      this.setState({loadModal: false});
  }

  updateGallery(val) {
  		this.setState({
        gallery: val, 
        loadModal: true,
      });
  		// this.toggle();
  }

	componentWillMount(){
		fetch('/assets/portfolio.json')
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
		
		if(!cardWrap) return;
		var cardWrapOffset = cardWrap.clientHeight ? cardWrap.clientHeight : 100;
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
            			className={this.state.filter === item || (this.state.filter === null && item === 'All') ? "active px-2": "px-2"} 
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
				  <Modal isOpen={this.state.loadModal} size="lg" toggle={this.closeModal}>
				      <ModalHeader>
				      	{(currentTodos[galId] !== undefined) ? currentTodos[galId].title : ''}
				      	<i style={{position: 'absolute', right:20, top:20 }}onClick={this.closeModal} className="fa fa-times" />
				      </ModalHeader>

				      <ModalBody>
				          <div className="row">
					          <div className="col-sm-12 col-md-7">
						          <Swiper {...params} shouldSwiperUpdate>
							          {
													(currentTodos[galId] !== undefined) ? 
													currentTodos[galId].gallery.map((gallery, i) => 
														gallery.type==="image" ? 
															<img key={i} className="card-img-top" src={"/assets/imgs/project/"+gallery.url} alt="" />
															: <iframe key={i} title={i} className="swiper-slide-container" src={gallery.url} frameborder="0" allowfullscreen></iframe>
													) : null
												}
						          </Swiper>
					          </div>
					          
					          {currentTodos[galId] !== undefined ? 
					          	<div className="col-sm-12 col-md-5">
					          		<p>{currentTodos[galId].desc}</p>
					          		<p>[{currentTodos[galId].tags}]</p>
					          		{currentTodos[galId].url !== "" ? <a href={currentTodos[galId].url}><u>Project Link</u></a> : null }
					          	</div>
					          	: null
					          }
				          </div>

				      </ModalBody>
				      
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