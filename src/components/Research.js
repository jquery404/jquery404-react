import React, { Component } from 'react';

class Research extends Component {

    render() {
        return (
            <div className="row portfolioWrap">
							<div className="col-sm-10">
			   				<h1 className="mt-5">Research Projects</h1>
			   				<p>I have had the privilege to work on several projects of a diverse nature. Below I list them according to topic (by date), with relevant publications.</p>
			   				
			   				<a className="p-2" target="_bank" href="http://uhunt.felix-halim.net/id/827974">
			   					<img style={{width:'24px'}} src="/assets/imgs/uva.jpg" alt="" />
			   				</a>
			   				<a className="p-2" target="_bank" href="https://orcid.org/0000-0003-0706-9396">
			   					<img style={{width:'24px'}} src="/assets/imgs/orcid.jpg" alt="" />
			   				</a>
			   			</div>
						
	            <div className="col-sm-10 my-3">
	               	<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;3D Object Recognition System</h5>
	               		
	               	<img className="float-left researchImg" src="/assets/imgs/3dcnn.png" alt=""/>

	               	<div className="padRight">
	                  <b>Problem</b>
	                  <p>3D point cloud never been used as object recognition. One of the key reason is the lack of generic shape representation. Since most of the RGBD devices are using point cloud to capture the real world data, it is necessary to have such cue in the system.</p>
	                  
	                  <b>Solution</b>
	                  <p>After conducting a thorough literature review I came up with a pipeline that utilized deep convolution network. To train the network Modelnet (Princeton 3D model dataset) is used.</p>
	               
		               <b>Publications:</b>
		               <ul>
		                  <li><b>Zaman, F.</b>, Wong, Y. P., & Ng, B. Y. <a href="https://arxiv.org/abs/1602.05312">Density-based denoising of point cloud</a>. In 9th International Conference on Robotic, Vision, Signal Processing and Power Applications (pp. 287-295). Springer, Singapore.</li>
		               </ul>
		               <b>Awards:</b>
		               <ul>
		                  <li>Best student paper (October 2017) Best paper award at the ROVISP 2017 conference, Penang, Malaysia.</li>
		               </ul>
					</div>
				</div>
						
				<div className="col-sm-10 my-3">
				  <h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Autonomous Vehicle System using Traffic Sign Recognition</h5>
					<img className="float-left researchImg" src="/assets/imgs/avest.jpg" alt=""/>

					<div className="padRight">
						<b>Problem</b>
						<p>For autonomous vehicle system it is important to recognize traffic sign and perform a particular action. But doing all these process in real-time is challenging and at the same time expensive. </p>
						
						<b>Solution</b>
						<p>We have developed AutoVESTS, which is a toy car mounted with VGA camera, that can detect and recognize traffic signs and perform specific task. Software written in C#. It can detect and recognize traffic sign in real-time with 70-75% accuracy.</p>

						<b>Publications:</b>
						<ul>
						<li><b>Faisal Zaman</b>, and Raihan Masood. Autonomous Vehicle System using Traffic Sign Recognition. International Conference on Computer and Information Technology (ICCIT), Bangladesh, Dec 2010.</li>
						</ul>
						<b>Awards:</b>
						<ul>
						<li>3rd Place in National Electronic Project Exhibition and Competition (NEPEC) (2009) for project AutoVEST</li>
						<li><a href="https://goo.gl/rmMeeA">https://goo.gl/rmMeeA</a></li>
						</ul>
					</div>
				</div>
						
				<div className="col-sm-10 my-3">
					<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Picturesque</h5>
					<img className="float-left researchImg" src="/assets/imgs/picturesque.png" alt=""/>
					
					<div className="padRight">
						<b>Problem</b>
						<p>Image tagging has become an active research topic in the recent few years, which aims to label an image with human-friendly concepts</p>
						
						<b>Solution</b>
						<p>Picturesque is a deep learning application that automatically detect, tag, and suggest features in your photos. It also generate the popular hashtags and helps to get more exposure on social media.
							<ul>
								<li>It takes an image as input, then recognize and give tags as output.</li>
								<li>Suggest popular hashtags from API.</li>
								<li>Trained classifier on ~2000 images.</li>
							</ul>
						</p>
					</div>
					
				</div>

			</div>
        );
    }
}

export default Research;
