import React, { Component } from 'react';
import {NavLink} from 'react-router-dom';

class Research extends Component {

    render() {
		const paper = {
			vicarious: "Mixed-perspective, combining egocentric (first-person) and exocentric (third-person) viewpoints, have been shown to improve the collaborative experience in remote settings. Such experiences allow remote users to switch between different viewpoints to gain alternative perspectives of the remote space. However, existing systems lack seamless selection and transition between multiple perspectives that better fit the task at hand. To address this, we present a new approach called Vicarious, which simplifies and automates the selection between egocentric and exocentric viewpoints. Vicarious employs a context-aware method for dynamically switching or highlighting the optimal viewpoint based on user actions and the current context. To evaluate the effectiveness of the viewpoint selection method, we conducted a user study n=27 using an asymmetric AR-VR setup where users performed remote collaboration tasks under four distinct conditions: No-view, Manual, Guided, and Automatic selection. The results showed that Guided and Automatic viewpoint selection improved users' understanding of the task space and task performance, and reduced cognitive load compared to Manual or No-view selection. The results also suggest that the asymmetric setup had minimal impact on spatial and social presence, except for differences in task load and preference. Based on these findings, we provide design implications for future research in mixed reality collaboration.",
			mrmac: "We present MRMAC, a Mixed Reality Multi-user Asymmetric Collaboration system that allows remote users to teleport virtually into a real-world collaboration space to communicate and collaborate with local users. Our system enables telepresence for remote users by live-streaming the physical environment of local users using a 360-degree camera while blending 3D virtual assets into the mixed-reality collaboration space. Our novel client-server architecture enables asymmetric collaboration for multiple AR and VR users and incorporates avatars, view controls, as well as synchronized low-latency audio, video, and asset streaming. We evaluated our implementation with two baseline conditions: conventional 2D and standard 360 videoconferencing. Results show that MRMAC outperformed both baselines in inducing a sense of presence, improving task performance, usability, and overall user preference, demonstrating its potential for immersive multi-user telecollaboration.",
			avatar360:"360° images offer panoramic views of captured environments, placing users within an egocentric perspective. While users can freely rotate their viewpoint, they don’t experience 6-DoF navigation with translational movement. In this research, we introduce Avatar360, a novel method to elicit 6-DoF perception in 360° panoramas, using avatar-assisted navigation combined with an exocentric view of the 360° panorama. We seamlessly integrate a 3D avatar into 360° panoramas, allowing users to navigate a 3D virtual landscape congruent with the 360° background. By aligning the exocentric perspective of the 360° panorama with the avatar’s movements, we replicate a sensation of 6-DoF navigation in 360° panoramas. We explore mechanisms for simultaneous avatar and viewpoint controls, as well as procedures for transitions between spatially connected 360° panoramas. A user study was conducted to assess the perception of 6-DoF navigation in 360° panoramas via a 3D avatar, evaluating users’ sense of movement, disorientation, and presence. We also gained insight into perspective view controls and transition techniques between panoramas. Statistical analysis shows avatar-assisted navigation elicits a user’s sense of movement within 360° panoramas. Our results also provide guidelines for effective view control and transition strategies in avatar-assisted 360° navigation."
		}

        return (
            <div className="row portfolioWrap" style={{fontSize:'1rem'}}>
				<div className="col-sm-10">
					<h1 className="mt-5">Research Projects</h1>
					<p className="text-small">I completed my Ph.D. in computer graphics at the Computational Media Innovation Centre (CMIC) at the Victoria University of Wellington, New Zealand. My current research is in the field of human-computer interaction. My research interests include Mixed Reality, eXtended Reality, collaborative immersive analytics, and computer vision. I am passionate about building and improving interactive real-time collaboration systems that highlight core innovation.</p>
					<p>I've had the privilege to work on several projects of a diverse nature. Below I list them according to topic (by date), with relevant publications.</p>
					
					<a className="p-2" target="_bank" href="https://uhunt.onlinejudge.org/id/261727">
						<img style={{width:'24px'}} src="/assets/imgs/uva.jpg" alt="" />
					</a>
					<a className="p-2" target="_bank" href="https://orcid.org/0000-0003-0706-9396">
						<img style={{width:'24px'}} src="/assets/imgs/orcid.jpg" alt="" />
					</a>
				</div>

				<div className="col-sm-10 mt-3">
	               	<h5 className="mb-3">
						<i className="fa fa-copy"></i>&nbsp;Multi-User XR Collaboration for High Fidelity Immersive Telepresence&nbsp;&nbsp;
					   	<NavLink exact={true} className="nav-link-inline" to={'/r/thesis'}><span className="badge badge-dark"><i className="fa fa-folder-plus"></i> Project</span></NavLink>
					</h5>
				</div>
				

				{/* avatar360 */}
				<div className="col-sm-10 mb-3">
	               	<img className="float-left researchImg" src="/assets/imgs/research/avatar360.gif" alt=""/>

	               	<div className="padRight">
						<p>Andrew Chalmers, <b>Faisal Zaman</b>, and Taehyun Rhee. <a href="/assets/papers/2344.98885.777.pdf">Avatar360: Emulating 6-DoF Perception in 360° Panoramas through Avatar-Assisted Navigation</a>. In 31st IEEE Conference on Virtual Reality and 3D User Interfaces (IEEE VR), 2024. Orlando, FL, USA.</p>
						<p>
						<NavLink exact={true} className="nav-link-inline" to={'/r/avatar360'}><span className="badge badge-dark"><i className="fa fa-folder-plus"></i> Project</span></NavLink>&nbsp;
							<a href="/assets/papers/2344.98885.777.pdf"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">{paper.avatar360}</i></span>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX
								<i className="tooltiptext tooltip-bottom">
								@inproceedings{'{'}chalmers2024avatar360,<br/>
								title={'{'}Avatar360: Emulating 6-DoF Perception in 360° Panoramas through Avatar-Assisted Navigation{'}'},<br/>
								author={'{'}Chalmers, Andrew and Zaman, Faisal and Rhee, Taehyun{'}'},<br/>
								booktitle={'{'}2024 IEEE Conference on Virtual Reality and 3D User Interfaces (IEEE VR){'}'},<br/>
								pages={'{'}630--638{'}'},<br/>
								year={'{'}2024{'}'},<br/>
								organization={'{'}IEEE{'}'}<br/>
								{'}'}
								</i>
							</span>&nbsp;
							<a target="_blank" rel="noopener noreferrer" href="https://youtu.be/ucvvg1_1eR0"><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></a>
						</p>
					</div>
				</div>
				
				{/* mrmac */}
				<div className="col-sm-10 my-3">   		
	               	<img className="float-left researchImg" src="/assets/imgs/research/mrmac.gif" alt=""/>

	               	<div className="padRight">
					   	<p><b>Faisal Zaman</b>, Craig Anslow, Andrew Chalmers, and Taehyun Rhee. <a href="/assets/papers/5663557.997664.pdf" rel="noopener noreferrer" target="_blank">MRMAC: Mixed Reality Multi-user Asymmetric Collaboration</a>. In Proceedings of the IEEE International Symposium on Mixed and Augmented Reality (ISMAR), Sydney, Australia, 2023.</p>
						
						<p>
							<NavLink exact={true} className="nav-link-inline" to={'/r/mrmac'}><span className="badge badge-dark"><i className="fa fa-folder-plus"></i> Project</span></NavLink>&nbsp;
							<a href="/assets/papers/5663557.997664.pdf" rel="noopener noreferrer" target="_blank"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">{paper.mrmac}</i></span>&nbsp;
							<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX</span>&nbsp;
							<NavLink exact={true} className="nav-link-inline" to={'/r/mrmac'}><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></NavLink>
						</p>
					</div>
				</div>

				{/* vicarious */}
				<div className="col-sm-10 my-3">
					<img className="float-left researchImg" src="/assets/imgs/research/vicarious.gif" alt=""/>

					<div className="padRight">
					<p><b>Faisal Zaman</b>, Craig Anslow, and Taehyun Rhee. <a href="/assets/papers/3677878.996443.pdf" rel="noopener noreferrer" target="_blank">Vicarious: Context-aware Viewpoints Selection for Mixed Reality Collaboration</a>. In Proceedings of the ACM Symposium on Virtual Reality Software and Technology (VRST), Christchurch, New Zealand, 2023.</p>
					<p>
						<NavLink exact={true} className="nav-link-inline" to={'/r/vicarious'}><span className="badge badge-dark"><i className="fa fa-folder-plus"></i> Project</span></NavLink>&nbsp;
						<a href="/assets/papers/3677878.996443.pdf" rel="noopener noreferrer" target="_blank"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
						<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">{paper.vicarious}</i></span>&nbsp;
						<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX
						<i className="tooltiptext tooltip-bottom">
							@inproceedings{'{'}zaman2023vicarious,<br/>
							title={'{'}Vicarious: Context-aware Viewpoints Selection for Mixed Reality Collaboration.{'}'},<br/>
							author={'{'}Zaman, Faisal and Anslow, Craig and Chalmers, Andrew and Rhee, Taehyun{'}'},<br/>
							booktitle={'{'}Proceedings of the 29th ACM Symposium on Virtual Reality Software and Technology{'}'},<br/>
							pages={'{'}1--11{'}'},<br/>
							year={'{'}2023{'}'},<br/>
							{'}'}
						</i>
						</span>&nbsp;
						<NavLink exact={true} className="nav-link-inline" to={'/r/vicarious'}><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></NavLink>
					</p>
					</div>

				</div>

				{/* rsmflp */}
				<div className="col-sm-10 my-3">
					<img className="float-left researchImg" src="/assets/imgs/research/rsmflp.jpg" alt=""/>

					<div className="padRight">
					<p>Taehyun Rhee, Andrew Chalmers, <b>Faisal Zaman</b>, Anna Stangnes, Vic Roberts. <a href="/assets/papers/840200a940.pdf">Real-time Stage Modelling and Visual Effects for Live Performances</a>. ACM SIGGRAPH Real-Time Live!, Los Angeles, USA, 2023.</p>
					<p>
						<NavLink exact={true} className="nav-link-inline" to={'/r/rtstage'}><span className="badge badge-dark"><i className="fa fa-folder-plus"></i> Project</span></NavLink>&nbsp;
						<a href="/assets/papers/3588430.3597245.pdf"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
						<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">We present a novel live platform enhancing stage performances with real-time visual effects. Our demo showcases real-time 3D modeling, rendering and blending of assets, and interaction between real and virtual performers. We demonstrate our platform's capabilities with a mixed reality performance featuring virtual and real actors engaged with in-person audiences.</i></span>&nbsp;
						<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX
						<i className="tooltiptext tooltip-bottom">
							@inproceedings{'{'}rhee2023real,<br/>
							title={'{'}Real-time Stage Modelling and Visual Effects for Live Performances.{'}'},<br/>
							author={'{'}Rhee, Taehyun and Chalmers, Andrew and Zaman, Faisal and Stangnes, Anna and Roberts, Vic{'}'},<br/>
							booktitle={'{'}ACM SIGGRAPH 2023 Real-Time Live!{'}'},<br/>
							pages={'{'}1--2{'}'},<br/>
							year={'{'}2023{'}'},<br/>
							{'}'}
						</i>
						</span>&nbsp;
						<a href="https://youtu.be/7dhnX0XRwew" rel="noopener noreferrer" target="_blank"><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></a>&nbsp;
						<NavLink exact={true} className="nav-link-inline" to={'/r/rtstage'}><span className="badge badge-warning"><i className="fa fa-award"></i> Audience Choice Award</span></NavLink>
					</p>
					</div>

				</div>

				{/* rtauditorium */}
				<div className="col-sm-10 my-3">
					<img className="float-left researchImg" src="/assets/imgs/research/ramflp.jpg" alt=""/>

					<div className="padRight">
					<p>Andrew Chalmers, <b>Faisal Zaman</b>, Anna Stangnes, Taehyun Rhee. <a href="/assets/papers/840200a940.pdf">Real-time Auditorium Modelling and Visual Effects for Live Performances</a>. ACM SIGGRAPH Real-Time Live!, Sydney, Australia, 2023.</p>
					<p>
						<NavLink exact={true} className="nav-link-inline" to={'/r/rtauditorium'}><span className="badge badge-dark"><i className="fa fa-folder-plus"></i> Project</span></NavLink>&nbsp;
						<a href="/assets/papers/3588430.3597245.pdf"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;
						<span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">We present a novel live platform enhancing stage performances with real-time visual effects. Our demo showcases real-time 3D modeling, rendering and blending of assets, and interaction between real and virtual performers. We demonstrate our platform's capabilities with a mixed reality performance featuring virtual and real actors engaged with in-person audiences.</i></span>&nbsp;
						<span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX
						<i className="tooltiptext tooltip-bottom">
							@inproceedings{'{'}chalmers2023real,<br/>
							title={'{'}Real-time Auditorium Modelling and Visual Effects for Live Performances.{'}'},<br/>
							author={'{'}Chalmers, Andrew and Zaman, Faisal and Stangnes, Anna and Rhee, Taehyun{'}'},<br/>
							booktitle={'{'}ACM SIGGRAPH ASIA 2023 Real-Time Live!{'}'},<br/>
							pages={'{'}1--2{'}'},<br/>
							year={'{'}2023{'}'},<br/>
							{'}'}
						</i>
						</span>&nbsp;
						<NavLink exact={true} className="nav-link-inline" to={'/r/rtauditorium'}><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></NavLink>&nbsp;
					</p>
					</div>

				</div>


				{/* dc ieee vr */}
				<div className="col-sm-10 my-3">
	               	<img className="float-left researchImg" src="/assets/imgs/research/mxrc-dc.png" alt=""/>

	               	<div className="padRight">
						<p><b>Faisal Zaman</b>. <a href="/assets/papers/840200a940.pdf">[DC] Improving Multi-User Interaction for Mixed Reality Telecollaboration</a>. In 29th IEEE Conference on Virtual Reality and 3D User Interfaces, 2022. Christchurch, New Zealand.</p>
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
							<a target="_blank" rel="noopener noreferrer" href="https://youtu.be/qAbx7_ReHvY"><span className="badge badge-dark"><i className="fa fa-video"></i> Video</span></a>
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
		                  <li><a target="_blank" rel="noopener noreferrer" href="https://www.oreilly.com/library/view/tensorflow-lite-for/9781484266663/">oreilly/tensorflow-lite</a></li>
		                  <li><a target="_blank" rel="noopener noreferrer" href="https://link.springer.com/video/10.1007/978-1-4842-6666-3">springer/10.1007/978-1-4842-6666-3</a></li>
		               </ul>
		               
					</div>
				</div>
						
				<div className="col-sm-10 my-3">
	               	<h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;3D Object Recognition System</h5>
	               		
	               	<img className="float-left researchImg" src="/assets/imgs/research/3dcnn.png" alt=""/>

	               	<div className="padRight">
	                  <b>Problem</b>
	                  <p>Object recognition using 3D point clouds is challenging, and the lack of a generic shape representation makes it difficult to develop universal feature extraction techniques.</p>
	                  
	                  <b>Solution</b>
	                  <p>We developed a pipeline that employs a deep convolutional network to train on the ModelNet dataset (Princeton 3D model dataset), along with preprocessing that includes denoising.</p>
	               
		               <b>Publications:</b>
		               <ul>
		                <li><b>Zaman, F.</b>, Wong, Y. P., & Ng, B. Y. <a href="https://arxiv.org/abs/1602.05312">Density-based denoising of point cloud</a>. In 9th International Conference on Robotic, Vision, Signal Processing and Power Applications (pp. 287-295). Springer, Singapore.</li>
						<li><span className="badge badge-dark tooltips"><i className="fa fa-book"></i> Abstract <i className="tooltiptext tooltip-bottom">Point cloud source data for surface reconstruction is usually contaminated with noise and outliers. To overcome this deficiency, a density-based point cloud denoising method is presented to remove outliers and noisy points. First, particle-swam optimization technique is employed for automatically approximating optimal bandwidth of multivariate kernel density estimation to ensure the robust performance of density estimation. Then, mean-shift based clustering technique is used to remove outliers through a thresholding scheme. After removing outliers from the point cloud, bilateral mesh filtering is applied to smooth the remaining points. The experimental results show that this approach, comparably, is robust and efficient.</i></span>&nbsp;
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
							</i></span>&nbsp;<span className="badge badge-warning"><i className="fa fa-award"></i> Best Paper Award</span>
						</li>
		               </ul>
		               
					</div>
				</div>
				
				<div className="col-sm-10 my-3">
				  <h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;Autonomous Vehicle System using Traffic Sign Recognition</h5>
					<img className="float-left researchImg" src="/assets/imgs/research/avest.jpg" alt=""/>

					<div className="padRight">
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
	                  <p>This recipe book represents menu items that I came up with over the course of 2021. They are the essence of what kept me sane and kept me going as I went through the pandemic, research, and life.</p>
	                  
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
