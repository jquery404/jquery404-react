import React, { Component } from 'react';

class Research extends Component {

    render() {
        return (
            <div className="row portfolioWrap">
							<div className="col-sm-12">
								<h1 class="mt-5">Research Projects</h1>
								<p>I have had the privilege to work on several projects of a diverse nature during my undergraduate and Masters years. 
								Below I list them according to topic (by date), with relevant publications.</p>


								<h4>3D Object Recognition System</h4>
								<dl class="row">
								  <dt class="col-sm-3">Problem</dt>
								  <dd class="col-sm-7">3D point cloud never been used as object recognition. One of the key reason is the lack of generic shape representation. Since most of the RGBD devices are using point cloud to capture the real world data, it is necessary to have such cue in the system.</dd>

								  <dt class="col-sm-3">Solution</dt>
								  <dd class="col-sm-7">After conducting a thorough literature review I came up with a pipeline that utilized deep convolution network. To train the network Modelnet (Princeton 3D model dataset) is used.</dd>
								</dl>

								<b>Publications:</b>
								<ul>
									<li>Density-based Denoising of Point Cloud. Faisal Zaman, Ya Ping Wong, and Boon Yian Ng. In the Proceeding of 9th International Conference on Robotics, Vision, Signal Processing & Power Applications (ROVISP), Penang, Malaysia. 2016.</li>
									<li>Autonomous Vehicle System using Traffic Sign Recognition. Faisal Zaman, and Raihan Masood. International Conference on Computer and Information Technology (ICCIT), Bangladesh, Dec 2010.</li>
								</ul>

								<b>Awards:</b>
								<ul>
									<li>Best student paper (October 2017) Best paper award at the ROVISP 2017 conference, Penang, Malaysia.</li>
									<li>3rd Place in National Electronic Project Exhibition and Competition (NEPEC) (2009) for project AutoVEST</li>
								</ul>
							</div>
						</div>
  

        );
    }
}

export default Research;
