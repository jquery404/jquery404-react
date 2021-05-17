import React from 'react';



class Updates extends React.Component
{
    constructor(props, context) {
        super(props, context);
    };

	render(){
		return(
            <div className="row">
                <div className="col-sm-7 py-5">
                    
                    <h4>Updates</h4>
                    <div className="update-c card mb-2">
                        <div className="card-horizontal">
                            <div className="img-square-wrapper" style={{backgroundImage:`url('assets/imgs/gisnz.jpg')`}}>......</div>
                            <div className="update-card card-body m-0 p-1">
                                <a href="https://tinyurl.com/6jaj765v">
                                    <small>17-18 Apr'21</small><br/>
                                    <b className="mb-1">TakiWaehere – New Zealand Geospatial Hackathon</b>
                                    <p className="mb-1">by MBIE and Maxar</p>
                                    <small><i className="fa fa-github"></i> https://tinyurl.com/y5ce3s7f</small>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="update-c card mb-2">
                        <div className="card-horizontal">
                            <div className="img-square-wrapper" style={{backgroundImage:`url('assets/imgs/aucxr.jpg')`}}>......</div>
                            <div className="update-card card-body m-0 p-1">
                                <a href="https://tinyurl.com/6jaj765v">
                                    <small>9-12 Feb'21</small><br/>
                                    <b className="mb-1">International XR (AR/VR) Workshop</b>
                                    <p className="mb-1">Auckland, University of Auckland</p>
                                    <small><i className="fa fa-github"></i> https://tinyurl.com/6jaj765v</small>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="update-c card mb-2">
                        <div className="card-horizontal">
                            <div className="img-square-wrapper" style={{backgroundImage:`url('https://github.com/jquery404/ccrpg/raw/main/resources/1.jpg')`}}>......</div>
                            <div className="update-card card-body m-0 p-1">
                                <a href="https://tinyurl.com/zac5dde3">
                                    <small>16 Aug'20</small><br/>
                                    <b className="mb-1">SWEN 422: CCRPG</b>
                                    <p className="mb-1">Victoria University of Wellington</p>
                                    <small><i className="fa fa-github"></i> https://tinyurl.com/zac5dde3</small>
                                </a>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
		)
	}
}

export default Updates;