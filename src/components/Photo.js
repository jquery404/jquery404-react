import React from 'react';

const PhotoGrid = (props) => 
	<div className="pb-5 border-bottom">
		<h2 className="pt-5 milestone" ref={props.focus}>{props.year}</h2>
		<div className="photos">
		{
			props.gallery.map((v, k) => (
				<img 
					src={v} 
					alt={`From ${props.year}`} 
					key={k} 
					onClick={() => props.onPhotoClick(props.photoIndex + k)} 
					style={{ cursor: 'pointer' }}
				/>
			))
		}
		</div>
	</div>


class Photo extends React.Component
{
	constructor(props, context) {
		super(props, context);
		const items = {
			2024: [
				"/assets/imgs/photo/2024/pp0.jpg",
				"/assets/imgs/photo/2024/pp1.jpg",
				"/assets/imgs/photo/2024/pp2.jpg",
				"/assets/imgs/photo/2024/pp3.jpg",
				"/assets/imgs/photo/2024/pp4.jpg",
			],
			2023: [
				"/assets/imgs/photo/2023/pp0.jpg",
				"/assets/imgs/photo/2023/pp1.jpg",
				"/assets/imgs/photo/2023/pp2.jpg",
				"/assets/imgs/photo/2023/pp3.jpg",
				"/assets/imgs/photo/2023/pp4.jpg",
			],
			2022: [
				"/assets/imgs/photo/2022/pp0.jpg",
				"/assets/imgs/photo/2022/pp1.jpg",
				"/assets/imgs/photo/2022/pp2.jpg",
				"/assets/imgs/photo/2022/pp3.jpg",
			],
			2021: [
				"/assets/imgs/photo/2021/pp1.jpg",
				"/assets/imgs/photo/2021/pp2.jpg",
				"/assets/imgs/photo/2021/pp3.jpg",
				"/assets/imgs/photo/2021/pp4.jpg",
				"/assets/imgs/photo/2021/pp5.jpg",
				"/assets/imgs/photo/2021/pp6.jpg",
				"/assets/imgs/photo/2021/pp7.jpg",
				"/assets/imgs/photo/2021/pp8.jpg",
			],
			2020: [
				"/assets/imgs/photo/2020/pp1.jpg",
				"/assets/imgs/photo/2020/pp2.jpg",
				"/assets/imgs/photo/2020/pp3.jpg",
				"/assets/imgs/photo/2020/pp4.jpg",
				"/assets/imgs/photo/2020/pp5.jpg",
				"/assets/imgs/photo/2020/pp6.jpg",
				"/assets/imgs/photo/2020/pp7.jpg",
				"/assets/imgs/photo/2020/pp8.jpg",
			],
			2019: [
				"/assets/imgs/photo/2019/pp1.jpg",
				"/assets/imgs/photo/2019/pp2.jpg",
			],
			2018: [
				"/assets/imgs/photo/2018/pp1.jpg",
				"/assets/imgs/photo/2018/pp2.jpg",
				"/assets/imgs/photo/2018/pp3.jpg",
			],
			2017: [
				"/assets/imgs/photo/2017/pp1.jpg",
				"/assets/imgs/photo/2017/pp2.jpg",
			],
			2016: [
				"/assets/imgs/photo/2016/pp1.jpg",
				"/assets/imgs/photo/2016/pp2.jpg",
				"/assets/imgs/photo/2016/pp3.jpg",
			],
			2015: [
				"/assets/imgs/photo/2015/pp1.jpg",
				"/assets/imgs/photo/2015/pp2.jpg",
			],
			2014: [
				"/assets/imgs/photo/2014/pp1.jpg",
				"/assets/imgs/photo/2014/pp2.jpg",
				"/assets/imgs/photo/2014/pp3.jpg",
			],
		};
		
		const allPhotos = [];
		Object.entries(items).reverse().forEach(([year, photos]) => {
			photos.forEach((photoPath) => {
				allPhotos.push({ path: photoPath, year: parseInt(year) });
			});
		});

		this.state = {
			items: items,
			currentPhotoIndex: 0,
			showOverlay: false,
		}
		
		this.myDivToFocus = [];
		Object.entries(items).reverse().forEach(() => {
			this.myDivToFocus.push(React.createRef());
		});
		
		this.allPhotos = allPhotos;
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	componentWillUnmount() {
		window.removeEventListener('keydown', this.handleKeyDown);
	}

	handleOnClick = (i) => { 
		if(this.myDivToFocus[i].current){
            this.myDivToFocus[i].current.scrollIntoView({ 
               behavior: "smooth", 
               block: "start"
            })
        }
	}

	handlePhotoClick = (index) => {
		this.setState({
			currentPhotoIndex: index,
			showOverlay: true
		});
		window.addEventListener('keydown', this.handleKeyDown);
	}

	handleKeyDown = (e) => {
		if (!this.state.showOverlay) return;
		
		if (e.key === 'Escape') {
			this.closeOverlay();
		} else if (e.key === 'ArrowLeft') {
			this.goToPrevious();
		} else if (e.key === 'ArrowRight') {
			this.goToNext();
		}
	}

	closeOverlay = () => {
		this.setState({ showOverlay: false });
		window.removeEventListener('keydown', this.handleKeyDown);
	}

	goToPrevious = () => {
		this.setState(prevState => {
			const newIndex = prevState.currentPhotoIndex > 0 
				? prevState.currentPhotoIndex - 1 
				: this.allPhotos.length - 1;
			return { currentPhotoIndex: newIndex };
		});
	}

	goToNext = () => {
		this.setState(prevState => {
			const newIndex = prevState.currentPhotoIndex < this.allPhotos.length - 1
				? prevState.currentPhotoIndex + 1
				: 0;
			return { currentPhotoIndex: newIndex };
		});
	}

	getCurrentPhoto = () => {
		return this.allPhotos[this.state.currentPhotoIndex] || null;
	}

	getPhotoCaption = () => {
		const photo = this.getCurrentPhoto();
		if (!photo) return '';
		const filename = photo.path.split('/').pop().replace('.jpg', '');
		return `Photo ${filename} - ${photo.year}`;
	}

	render(){
		const { items } = this.state;
		let photoIndex = 0;
		const currentPhoto = this.getCurrentPhoto();

		return (
			<div className="row portfolioWrap">
				<div className="col-sm-12">
					<h1 className="mt-5">Photography</h1>
					<p>I love taking pictures. I specialized in city, landscape, and nature photography.<br/>
					Here are some of my favorite photos I've taken over the years.</p>
				</div>

				<nav className="timeline__nav fixed">
					<ul>
					{
					Object.entries(items).reverse().map(([key,value],i) => (
						<li onClick={()=> this.handleOnClick(i)} key={key}>
							<span>{`'${key.slice(-2)}`}</span>
						</li>
					))
					}
					</ul>
				</nav>

				<section className="timeline__section col-sm-11">
				{
				Object.entries(items).reverse().map(([key,value],i) => {
					const startIndex = photoIndex;
					photoIndex += value.length;
					return <PhotoGrid 
						focus={this.myDivToFocus[i]} 
						gallery={value} 
						year={key} 
						key={key}
						photoIndex={startIndex}
						onPhotoClick={this.handlePhotoClick}
					/>
				})
				}
				</section>

				{this.state.showOverlay && (
					<div className="perfundo__overlay" onClick={(e) => {
						if (e.target.classList.contains('perfundo__overlay')) {
							this.closeOverlay();
						}
					}}>
						<button 
							className="perfundo__nav perfundo__prev" 
							onClick={(e) => {
								e.stopPropagation();
								this.goToPrevious();
							}}
							aria-label="Previous photo"
							style={{
								left: '1em',
								top: '50%',
								transform: 'translateY(-50%)',
								width: '3em',
								height: '3em',
								position: 'absolute',
								background: 'rgba(255,255,255,0.2)',
								border: 'none',
								borderRadius: '50%',
								color: 'white',
								fontSize: '1.5rem',
								cursor: 'pointer',
								zIndex: 1100
							}}
						>
							<i className="fa fa-chevron-left" aria-hidden="true"></i>
						</button>

						<button 
							className="perfundo__nav perfundo__next" 
							onClick={(e) => {
								e.stopPropagation();
								this.goToNext();
							}}
							aria-label="Next photo"
							style={{
								right: '1em',
								top: '50%',
								transform: 'translateY(-50%)',
								width: '3em',
								height: '3em',
								position: 'absolute',
								background: 'rgba(255,255,255,0.2)',
								border: 'none',
								borderRadius: '50%',
								color: 'white',
								fontSize: '1.5rem',
								cursor: 'pointer',
								zIndex: 1100
							}}
						>
							<i className="fa fa-chevron-right" aria-hidden="true"></i>
						</button>

						<div style={{ 
							position: 'relative', 
							textAlign: 'center', 
							width: '100%', 
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '2em 1em',
							boxSizing: 'border-box'
						}}>
							<img 
								className="perfundo__figure currentPhoto" 
								src={currentPhoto ? currentPhoto.path : ''} 
								alt={this.getPhotoCaption()}
								onClick={(e) => e.stopPropagation()}
								style={{
									maxWidth: '90vw',
									maxHeight: '85vh',
									width: 'auto',
									height: 'auto',
									objectFit: 'contain'
								}}
							/>
							<div 
								style={{
									position: 'absolute',
									bottom: '1em',
									left: '50%',
									transform: 'translateX(-50%)',
									background: 'rgba(0,0,0,0.7)',
									color: 'white',
									padding: '0.5em 1em',
									borderRadius: '4px',
									textAlign: 'center',
									maxWidth: '90%',
									boxSizing: 'border-box'
								}}
							>
								<div style={{ fontSize: '0.9rem', marginBottom: '0.25em' }}>
									{this.getPhotoCaption()}
								</div>
								<div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
									{this.state.currentPhotoIndex + 1} of {this.allPhotos.length}
								</div>
							</div>
						</div>

						<button 
							onClick={(e) => {
								e.stopPropagation();
								this.closeOverlay();
							}} 
							className="perfundo__close"
							aria-label="Close gallery"
							style={{
								top: '1em',
								right: '1em',
								position: 'absolute',
								background: 'rgba(0,0,0,0.6)',
								border: 'none',
								color: 'white',
								padding: '0.5em 1em',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '1rem',
								textIndent: 0,
								zIndex: 1101
							}}
						>
							<i className="fa fa-times" aria-hidden="true"></i> Close
						</button>
					</div>
				)}
				
			</div>
		)
	}
}

export default Photo;