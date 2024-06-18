import React, { Component } from 'react';
import {NavLink} from 'react-router-dom';
import {RenderLink, RenderShortLink} from './Helper';



const ProjectComponent = ({ project }) => {
    return (
        <React.Fragment>
            <div className="col-sm-10 mt-3">
                <h5 className="mb-3"><i className="fa fa-copy"></i>&nbsp;{project.title}</h5>
            </div>

            {project.type === 'book' && (
                <div className="col-sm-10 mb-3 publication-item">
                    <img className="float-left researchImg" src={`/assets/imgs/research/${project.thumbnail}`} alt={`${project.title}`}/>
                    <div className="padRight">
                    <p>{project.desc}</p>
                    <p>
                    {Object.entries(project.attributes).map(([key, value]) => (
                        <React.Fragment key={key}>
                            <b>{key}:</b> {value}<br />
                        </React.Fragment>
                    ))}
                    </p>
                    <b>Publications</b>
                    <ul>
                    {project.links.map((link, index) => (
                        <li key={index}>
                            {link.type === 'external' && (<a key={index} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>)}
                            {link.type === 'pdf' && (<a key={index} href={link.url} target="_blank" rel="noopener noreferrer"><span className="badge badge-dark"><i className="fa fa-file-pdf"></i> PDF</span></a>)}
                        </li>
                    ))}
                    </ul>
                    </div>
                </div>
            )}
            {project.type === 'project' && (
                <div className="col-sm-10 mb-3 publication-item">
                    <img className="float-left researchImg" src={`/assets/imgs/research/${project.thumbnail}`} alt={`${project.title}`}/>
                    <div className="padRight">
                    
                    {Object.entries(project.attributes).map(([key, value]) => (
                        <React.Fragment key={key}>
                            <b>{key}:</b> 
                            <p>{value}</p>
                        </React.Fragment>
                    ))}
                    
                    <b>Publications:</b>
                    <ul>
                    {project.publications.map((pub, index) => (
                        <li key={index}>
                            <p className="m-0" dangerouslySetInnerHTML={{ __html: pub.paper }}></p>
                            <p className="p-0">
                            {pub.links.abstract && (
                                <React.Fragment>
                                    <span className="badge badge-dark tooltips">
                                        <i className="fa fa-book"></i> Abstract 
                                        <i className="tooltiptext tooltip-bottom">{pub.links.abstract}</i>
                                    </span>&nbsp;
                                </React.Fragment>
                            )}
                            {pub.links.pdf && (
                                <React.Fragment><a href={pub.links.pdf}><span className="badge badge-dark tooltips"><i className="fa fa-file-pdf"></i> PDF</span></a>&nbsp;</React.Fragment>
                            )}
                            {pub.links.slides && RenderLink('slides', pub.links.slides, 'fa fa-file-powerpoint', 'PPT')}
                            {pub.links.bibtex && (
                                <React.Fragment>
                                    <span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX 
                                    <i className="tooltiptext tooltip-bottom">{pub.links.bibtex}</i></span>&nbsp;
                                </React.Fragment>
                            )}
                            {pub.links.googleplay && RenderLink('googleplay', pub.links.googleplay, 'fab fa-google-play', 'APK')}
                            {pub.links.award && (
                                <span className="badge badge-warning"><i className="fa fa-award"></i> {pub.links.award}</span>
                            )}
                            </p>
                            
                        </li>
                    ))}
                    </ul>
                    </div>
                </div>
            )}
            {project.type === 'research' && project.publications.map((pub, index) => (
                <div key={index} className="col-sm-10 mb-3 publication-item">
                    <img className="float-left researchImg" src={`/assets/imgs/research/${pub.thumbnail}`} alt={`${pub.title}`} />
                    <div className="padRight">
                        <p className="mb-0">
                            <span dangerouslySetInnerHTML={{ __html: pub.authors }}></span> {RenderShortLink('project', pub.url, pub.title)}{pub.venue}
                        </p>
                        <p className="p-0">
                            {pub.links.project && RenderLink('project', pub.links.project, 'fa fa-folder-plus', 'Project')}
                            {pub.links.abstract && (
                                <React.Fragment>
                                    <span className="badge badge-dark tooltips">
                                        <i className="fa fa-book"></i> Abstract 
                                        <i className="tooltiptext tooltip-bottom">{pub.links.abstract}</i>
                                    </span>&nbsp;
                                </React.Fragment>
                            )}
                            {pub.links.pdf && RenderLink('pdf', pub.links.pdf, 'fa fa-file-pdf', 'PDF')}
                            {pub.links.slides && RenderLink('slides', pub.links.slides, 'fa fa-file-powerpoint', 'PPT')}
                            {pub.links.bibtex && (
                                <React.Fragment>
                                    <span className="badge badge-dark tooltips"><i className="fa fa-quote-right"></i> BibTeX 
                                    <i className="tooltiptext tooltip-bottom">{pub.links.bibtex}</i></span>&nbsp;
                                </React.Fragment>
                            )}
                            {pub.links.googleplay && RenderLink('googleplay', pub.links.googleplay, 'fab fa-google-play', 'APK')}
                            {pub.links.video && RenderLink('video', pub.links.video, 'fa fa-video', 'Video')}
                            {pub.links.award && (
                                <span className="badge badge-warning"><i className="fa fa-award"></i> {pub.links.award}</span>
                            )}
                            </p>

                    </div>
                </div>
            ))}

			
        </React.Fragment>
    )}



const Markup = (props) => {
    let html = 'Looking for it ...';
    let found = props.hasFound;
    let project = props.project;

    if (found === -1) 
    return (
        
        <div className="col-sm-7">
            <div className="py-5">
                <div className="clearfix">
                    <i className="material-icons md-48">looks_4</i>
                    <img src="assets/imgs/404.gif" width="50px" alt="" />
                    <i className="material-icons md-48">looks_4</i>
                </div>
                <p>Page not found.</p>
                <p>Don't worry let me bring you back to <NavLink exact={true} activeClassName="active" className="nav-link js-scroll-trigger" to="/">About</NavLink></p>
            </div>
        </div>
        
    );

    else if(found === 1) 
    return (
        
        <React.Fragment>
            {project.map((proj, index) => (
                <ProjectComponent key={index} project={proj} />
            ))}
        </React.Fragment>
    );
    
    return html;
}

class Research extends Component {

	constructor(props, context) {
        super(props, context);
        this.state = {
            project: null,
            hasFound: 0
        };
	}
	
	componentDidMount () {
    
        fetch(`/assets/research.json`)
        .then(response => response.json())
		.then(({project:items}) => {
            this.setState({project: items, hasFound: 1});
        });

    }

    render() {
        return (
            <div className="row portfolioWrap" style={{fontSize:'1rem'}}>
                <div className="col-sm-10">
                    <h1 className="mt-5">Research Projects</h1>
                    <p className="text-small">I completed my Ph.D. in computer graphics from Victoria University of Wellington, New Zealand. My current research is in the field of human-computer interaction. My research interests include Mixed Reality, eXtended Reality, collaborative immersive analytics, and computer vision. I am passionate about building and improving interactive real-time collaboration systems that highlight core innovation.</p>
                    <p>I've had the privilege to work on several projects of a diverse nature. Below I list them according to topic (by date), with relevant publications.</p>
                    
                    <a className="p-2" target="_bank" href="https://scholar.google.com/citations?user=Mw5d13UAAAAJ">
                        <img style={{width:'24px'}} src="/assets/imgs/scholar.png" alt="" />
                    </a>
                    <a className="p-2" target="_bank" href="https://uhunt.onlinejudge.org/id/261727">
                        <img style={{width:'24px'}} src="/assets/imgs/uva.jpg" alt="" />
                    </a>
                    <a className="p-2" target="_bank" href="https://orcid.org/0000-0003-0706-9396">
                        <img style={{width:'24px'}} src="/assets/imgs/orcid.jpg" alt="" />
                    </a>
                </div>

                <Markup hasFound={this.state.hasFound} project={this.state.project} />

		</div>
        
        
    );  
    }

    
}

export default Research;
