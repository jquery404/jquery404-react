import React from 'react';

const PhotoGrid = (props) => 
	<div className="pb-5 border-bottom">
		<h2 className="pt-5 milestone" ref={props.focus}>{props.year}</h2>
		<div className="photos">
		{
			props.gallery.map((v, k) => <img src={v} alt="" key={k} onClick={()=> {document.querySelector('.perfundo__overlay').classList.remove("hide"); document.querySelector('.currentPhoto').src = (v)}} />)
		}
		</div>
	</div>


class Photo extends React.Component
{
	constructor(props, context) {
		super(props, context);
		this.state = {
			items:{
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
			},
		}
		this.myDivToFocus = [];
		
	}

	handleOnClick = (i) => { 
		if(this.myDivToFocus[i].current){
            this.myDivToFocus[i].current.scrollIntoView({ 
               behavior: "smooth", 
               block: "start"
            })
        }
	}

	handleOnThumb = (e) => {
		e.preventDefault();
		document.querySelector('.perfundo__overlay').classList.add("hide");
		return false;
    }

	render(){
		let photoItems = this.state.items;
		Object.entries(photoItems).map(([key,value],i) =>  this.myDivToFocus[i] = React.createRef())

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
					Object.entries(photoItems).reverse().map(([key,value],i) => <li onClick={()=> this.handleOnClick(i)} key={i}><span>{`'${key.slice(-2)}`}</span></li>)
					}
					</ul>
				</nav>

				<section className="timeline__section col-sm-11">
				{
				Object.entries(photoItems).reverse().map(([key,value],i) => <PhotoGrid focus={this.myDivToFocus[i]} gallery={value} year={key} key={i} /> )
				}
				</section>

				<div className="perfundo__overlay hide">
					<img className="perfundo__figure currentPhoto" src="" alt="Demo" />
					<a onClick={(e)=> this.handleOnThumb(e)} href="#perfundo-untarget" className="perfundo__close perfundo__control">Close</a>
				</div>
				
			</div>
		)
	}
}

export default Photo;