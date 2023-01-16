import React, { Component } from 'react';

class Research extends Component {

    render() {
        return (
            <div className="row portfolioWrap" style={{fontSize:'1rem'}}>
				<div className="col-sm-10">
					<h1 className="mt-5">Research Projects</h1>
					<p className="text-small">I am a PhD candidate at the Computational Media Innovation Centre (CMIC) at the University of Victoria in Wellington, New Zealand. My current research is in the field of human-computer interaction. My research interests include Mixed Reality, eXtended Reality, collaborative immersive analytics, and computer vision. I am passionate about building and improving interactive real-time collaboration systems that highlight core innovation.</p>
					<p>I've had the privilege to work on several projects of a diverse nature. Below I list them according to topic (by date), with relevant publications.</p>
					
					<a className="p-2" target="_bank" href="https://uhunt.onlinejudge.org/id/261727">
						<img style={{width:'24px'}} src="/assets/imgs/uva.jpg" alt="" />
					</a>
					<a className="p-2" target="_bank" href="https://orcid.org/0000-0003-0706-9396">
						<img style={{width:'24px'}} src="/assets/imgs/orcid.jpg" alt="" />
					</a>
				</div>

				<div className="col-sm-10 my-3">
	               	<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Multi-User XR Collaboration for High Fidelity Immersive Telepresence</h5>
	               		
	               	<img className="float-left researchImg" src="/assets/imgs/research/mxrc-dc.png" alt=""/>

	               	<div className="padRight">
						<p><b>Zaman, F.</b> <a href="/assets/papers/840200a940.pdf">[DC] Improving Multi-User Interaction for Mixed Reality Telecollaboration</a>. In 29th IEEE Conference on Virtual Reality and 3D User Interfaces, 2022. Christchurch, New Zealand.</p>
						<p>
							<a href="/assets/papers/840200a940.pdf"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">Mixed reality (MR) approaches offer merging of real and virtual worlds to create new environments and visualizations for real-time interaction. Existing MR systems, however, do not utilise user real environment, lack detail in dynamic environments, and often lack multi-user capabilities. This research focuses on exploring multi-user aspects of immersive collaboration, where an arbitrary number of co-located and remotely located users can collaborate in a single or merged collaborative MR space. The aim is to enable users to experience VR/AR together, irrespective of the type of HMD, and facilitate users with their collaborative tasks. The main goal is to develop an immersive collaboration platform in which users can utilize the space around them and at the same time collaborate and switch between different perspectives of other co-located and remote users.</i></span>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX
								<i className="tooltiptext tooltip-bottom">
								@inproceedings{'{'}zaman2022dc,<br/>
								title={'{'}[DC] Improving Multi-User Interaction for Mixed Reality Telecollaboration{'}'},<br/>
								author={'{'}Zaman, Faisal{'}'},<br/>
								booktitle={'{'}2022 IEEE Conference on Virtual Reality and 3D User Interfaces Abstracts and Workshops (VRW){'}'},<br/>
								pages={'{'}940--941{'}'},<br/>
								year={'{'}2022{'}'},<br/>
								organization={'{'}IEEE{'}'}<br/>
								{'}'}
								</i>
							</span>&nbsp;
							<a href="https://youtu.be/qAbx7_ReHvY"><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></a>
						</p>
					</div>
				</div>
						
	            <div className="col-sm-10 my-3">
	               	<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;TensorFlow Lite for Mobile Development</h5>
	               		
	               	<a href="https://www.oreilly.com/library/view/tensorflow-lite-for/9781484266663/"><img className="float-left researchImg" src="/assets/imgs/research/tflite.jpg" alt=""/></a>

	               	<div className="padRight">
	                  <p>TensorFlow Lite for Mobile Development: Deploy Machine Learning Models on Embedded and Mobile Devices</p>
	                  
	                  <p><b>Released:</b> November, 2020.<br/>
					  <b>Publisher(s):</b> Apress<br/>
					  <b>ISBN:</b> 9781484266663</p>
	               
		               <b>Publications:</b>
		               <ul>
		                  <li><a href="https://www.oreilly.com/library/view/tensorflow-lite-for/9781484266663/">https://www.oreilly.com/library/view/tensorflow-lite-for/9781484266663/</a></li>
		                  <li><a href="https://link.springer.com/video/10.1007/978-1-4842-6666-3/">https://link.springer.com/video/10.1007/978-1-4842-6666-3</a></li>
		               </ul>
		               
					</div>
				</div>
						
				<div className="col-sm-10 my-3">
	               	<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;3D Object Recognition System</h5>
	               		
	               	<img className="float-left researchImg" src="/assets/imgs/research/3dcnn.png" alt=""/>

	               	<div className="padRight">
	                  <b>Problem</b>
	                  <p>3D point cloud never been used as object recognition. One of the key reason is the lack of generic shape representation. Since most of the RGBD devices are using point cloud to capture the real world data, it is necessary to have such cue in the system.</p>
	                  
	                  <b>Solution</b>
	                  <p>After conducting a thorough literature review I came up with a pipeline that utilized deep convolution network. To train the network Modelnet (Princeton 3D model dataset) is used.</p>
	               
		               <b>Publications:</b>
		               <ul>
		                <li><b>Zaman, F.</b>, Wong, Y. P., & Ng, B. Y. <a href="https://arxiv.org/abs/1602.05312">Density-based denoising of point cloud</a>. In 9th International Conference on Robotic, Vision, Signal Processing and Power Applications (pp. 287-295). Springer, Singapore. 
						  	<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">Point cloud source data for surface reconstruction is usually contaminated with noise and outliers. To overcome this deficiency, a density-based point cloud denoising method is presented to remove outliers and noisy points. First, particle-swam optimization technique is employed for automatically approximating optimal bandwidth of multivariate kernel density estimation to ensure the robust performance of density estimation. Then, mean-shift based clustering technique is used to remove outliers through a thresholding scheme. After removing outliers from the point cloud, bilateral mesh filtering is applied to smooth the remaining points. The experimental results show that this approach, comparably, is robust and efficient.</i></span>&nbsp;
						  	<a href="https://arxiv.org/abs/1602.05312"><span className="badge badge-dark tooltips"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX 
							<i className="tooltiptext tooltip-bottom">
								@inproceedings{'{'}zaman2017density,<br/>
								title={'{'}Density-based denoising of point cloud{'}'},<br/>
								author={'{'}Zaman, Faisal and Wong, Ya Ping and Ng, Boon Yian{'}'},<br/>
								booktitle={'{'}9th International Conference on Robotic, Vision, Signal Processing and Power Applications{'}'},<br/>
								pages={'{'}287--295{'}'},<br/>
								year={'{'}2017{'}'},<br/>
								organization={'{'}Springer{'}'}<br/>
								{'}'}
							</i></span>&nbsp;<span className="badge badge-warning">Best Paper Award</span>
						</li>
		               </ul>
		               
					</div>
				</div>
				
				<div className="col-sm-10 my-3">
				  <h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Autonomous Vehicle System using Traffic Sign Recognition</h5>
					<img className="float-left researchImg" src="/assets/imgs/research/avest.jpg" alt=""/>

					<div className="padRight">
						<b>Problem</b>
						<p>For autonomous vehicle system it is important to recognize traffic sign and perform a particular action. But doing all these process in real-time is challenging and at the same time expensive. </p>
						
						<b>Solution</b>
						<p>We have developed AutoVESTS, which is a toy car mounted with VGA camera, that can detect and recognize traffic signs and perform specific task. Software written in C#. It can detect and recognize traffic sign in real-time with 70-75% accuracy.</p>

						<b>Publications and Outcomes:</b>
						<ul>
						<li><b>Faisal Zaman</b>, and Raihan Masood. Autonomous Vehicle System using Traffic Sign Recognition. International Conference on Computer and Information Technology (ICCIT), Bangladesh, Dec 2010.</li>
						<li>National Electronic Project Exhibition and Competition (NEPEC) (2009) for project AutoVEST. <span className="badge badge-warning">3rd Place</span></li>
						{/* <li><a href="https://goo.gl/rmMeeA">https://goo.gl/rmMeeA</a></li> */}
						</ul>
					</div>
				</div>
						
				<div className="col-sm-10 my-3">
					<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Picturesque</h5>
					<img className="float-left researchImg" src="/assets/imgs/research/picturesque.png" alt=""/>
					
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

				<div className="col-sm-10 my-3">
					<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Cookbook - The Oregano Sage</h5>
					<img className="float-left researchImg" src="/assets/imgs/research/the-oregano-sage.jpg" alt=""/>
					
					<div className="padRight">
	                  <p>This recipe book represent menu items that I came up with over the course of 2021. They are the essence of what kept me sane and kept me going as I went through pandemic, research, and life. </p>
	                  
	                  <p><b>Released:</b> December, 2021.</p>
	               
		               <b>Publications:</b>
		               <ul>
		                  <li><a href="https://www.amazon.com/dp/B09QHV6F5V">https://www.amazon.com/dp/B09QHV6F5V</a></li>
		                  <li><a href="https://www.kobo.com/ww/en/ebook/the-oregano-sage/">https://www.kobo.com/ww/en/ebook/the-oregano-sage</a></li>
		                  <li><a href="https://drive.google.com/file/d/16h-4DksRpPZRf6gv5hYQyOyu5QWjKOLO/view?usp=sharing"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a></li>
		               </ul>
		               
					</div>
					
				</div>

			</div>
        );
    }
}

export default Research;
