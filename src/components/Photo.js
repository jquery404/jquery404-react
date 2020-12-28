import React from 'react';


const PhotoGrid = (props) => 
	<div className="pb-5 border-bottom">
		<h2 className="pt-5 milestone" ref={props.focus}>{props.year}</h2>
		<div className="timerow">
		{
			props.gallery.map((v, k) => <div className="column" key={k}><img src={v} className="img-thumbnail" alt="" /></div>)
		}
		</div>
	</div>


class Photo extends React.Component
{
	constructor(props, context) {
		super(props, context);
		this.state = {
			items:{
				2014: [
					"/assets/imgs/photo/2014/pp1.jpg",
					"/assets/imgs/photo/2014/pp2.jpg",
					"/assets/imgs/photo/2014/pp3.jpg",
				],
				2015: [
					"/assets/imgs/photo/2015/pp1.jpg",
					"/assets/imgs/photo/2015/pp2.jpg",
				],
				2016: [
					"/assets/imgs/photo/2016/pp1.jpg",
					"/assets/imgs/photo/2016/pp2.jpg",
					"/assets/imgs/photo/2016/pp3.jpg",
				],
				2017: [
					"/assets/imgs/photo/2017/pp1.jpg",
					"/assets/imgs/photo/2017/pp2.jpg",
				],
				2018: [
					"/assets/imgs/photo/2018/pp1.jpg",
					"/assets/imgs/photo/2018/pp2.jpg",
					"/assets/imgs/photo/2018/pp3.jpg",
				],
				2019: [
					"/assets/imgs/photo/2019/pp1.jpg",
					"/assets/imgs/photo/2019/pp2.jpg",
					"/assets/imgs/photo/2019/pp3.jpg",
				],
				2020: [
					"/assets/imgs/photo/2020/pp1.jpg",
					"/assets/imgs/photo/2020/pp2.jpg",
					"/assets/imgs/photo/2020/pp3.jpg",
					"/assets/imgs/photo/2020/pp4.jpg",
					"/assets/imgs/photo/2020/pp5.jpg",
					"/assets/imgs/photo/2020/pp6.jpg",
					"/assets/imgs/photo/2020/pp7.jpg",
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

	render(){
		const photoItems = this.state.items;
		Object.entries(photoItems).map(([key,value],i) =>  this.myDivToFocus[i] = React.createRef())

		return (
			<div className="row portfolioWrap">
				<div className="col-sm-12">
					<h1 className="mt-5">Photography</h1>
					<p>I love taking pictures. I specialize in city, landscape, and nature photography.<br/>
					Here are some of my favorite photos I've taken over the years.</p>
				</div>

				<nav className="timeline__nav fixed">
					<ul>
					{
					Object.entries(photoItems).map(([key,value],i) => <li onClick={()=> this.handleOnClick(i)} key={i}><span>{key}</span></li>)
					}
					</ul>
				</nav>

				<section className="timeline__section col-sm-10">
					{
					Object.entries(photoItems).map(([key,value],i) => <PhotoGrid focus={this.myDivToFocus[i]} gallery={value} year={key} key={i} /> )
					}
				</section>
			</div>
		)
	}
}

export default Photo;