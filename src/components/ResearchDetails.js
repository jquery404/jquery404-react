import React, { Component } from 'react';
import {NavLink} from 'react-router-dom';


const Markup = (props) => {
    let html = 'Looking for it ...';
    let found = props.hasFound;
    let project = props.project;

    if (found === -1) 
    return (
        <div className="row">
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
        </div>
    );

    else if(found === 1) 
    return (
        <div className="row">
            <div className="col-sm-10 pt-5">
                <NavLink exact={true} className="nav-link-inline" to={'/research'}><i class="fa fa-chevron-left"></i> Back to Home</NavLink>
                {project.thumbnail.endsWith('.webm') ? (
                    <video className="card-img-top" autoPlay loop muted>
                    <source src={`/assets/papers/${project.thumbnail}`} type="video/webm" />
                    Your browser does not support the video tag.
                    </video>
                ) : (
                    <img className="card-img-top" src={`/assets/papers/${project.thumbnail}`} alt={project.title} />
                )}


                <p className="mt-3 p-0 journal">{project.journal}</p>
                <h2 className="projd-title pb-3">{project.title}</h2>
                {project.award && <p className="projd-title pb-3" style={{ color: "#ff1100" }}><i class="fa fa-award"></i> {project.award}</p>}
                <div className="row author-boxes">
                    {
                    project.authors.map((author, i) => 
                        <div key={i} className="col">
                            <a className="paper-author" href={author.url}>{author.name}</a>
                            <p className="author-affiliation text-sm">{author.affiliation}</p>
                        </div>
                    )
                    }
                </div>
            </div>
            
            <div className="col-sm-8">
                {project.desc}
                 
                <div className="row mt-5">
                    <div className="col-sm-4 text-center">
                        <a className="nav-link" href={project.url} target="_blank">
                            <img src={"/assets/papers/"+project.paper_thumb} alt="preview" className="thumbnail-box img-thumbnail" />
                        </a>
                        <div className="fileInfo"><i className="fa fa-external-link-alt"></i> {project.file_info}</div>
                    </div> 

                    <div className="col-sm-8 bibtex-wrap">
                        <span className="badge badge-dark"><i className="fa fa-quote-right"></i> BibTeX</span>
                        <pre className="bibtex-pre">{project.bibtex}</pre>
                    </div> 
                </div> 


                <div className="row mt-5">
                    {
                    project.gallery.map((gallery, i) => 
                        <div key={i} className={(gallery.type==='image' ? 'col-sm-12' :  (gallery.ratio==='landscape' ? 'col-sm-12' : 'col-sm-6'))}>
                        {
                            gallery.type === "image" ? 
                            <img className="p-3 img-fluid" src={"/assets/papers/"+gallery.url} alt="" /> : 
                            <div className="py-1">
                                <b>{gallery.header}</b>
                                <div className={"embed-responsive " + (gallery.ratio==='landscape' ? 'embed-responsive-16by9' : 'embed-responsive-1by1')}>
                                    <iframe key={i} title={i} className="embed-responsive-item" src={gallery.url} allowFullScreen></iframe>
                                </div>
                            </div>
                        }
                        </div>
                    )
                    }
                </div>

                
                {project.slides && (
                    <div className="row mt-4">
                        {project.slides.list && project.slides.list.length > 0 ? (
                            <div className="col-12"><b>{project.slides.header}</b></div>
                        ) : null}
                        {project.slides.list && project.slides.list.map((slide, i) => (
                            <div className="col-6" key={i}>
                                <div className="d-flex paper-thumbnail-box">
                                    <div className="p-3">
                                        <img className="img-fluid thumbnail-box" width="250px" src={"/assets/papers/" + slide.slide_thumb} alt={slide.title} />
                                    </div>
                                    <div className="d-flex flex-column justify-content-center">
                                        <a className="nav-link text-left text-decoration-underline" href={"/assets/papers/" + slide.pdf} target="_blank">
                                            {slide.title}&nbsp;({slide.file_info})
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="row mt-4">
                {project.articles && (
                    <React.Fragment>
                    {project.articles.list.length > 0 ? <div className="col-12"><b>{project.articles.header}</b></div> : ""}
                    {project.articles.list.map((article, i) => (
                        <div className="px-3 bd-callout w-100" key={i}>
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                            {article.header}
                        </a>
                        </div>
                    ))}
                    </React.Fragment>
                )}
                </div>

                <div className="row mt-4">
                {project.content && (
                    <React.Fragment>
                    {project.content.list.length > 0 ? <div className="col-12"><h5>{project.content.header}</h5></div> : ""}
                    {project.content.list.map((content, i) => (
                        <div className="col-12" key={i}>
                            <b>{content.title}</b>
                            <div dangerouslySetInnerHTML={{ __html: content.body }} />
                            {Array.isArray(content.img) ? (
                                <div className="d-flex flex-wrap">
                                    {content.img.map((imgSrc, index) => (
                                    <div className="col-4 mb-3" key={index}>
                                        <img src={"/assets/papers/"+imgSrc} alt={imgSrc} className="img-fluid rounded" />
                                    </div>
                                    ))}
                                </div>
                            ) : (
                                <img src={"/assets/papers/"+content.img} alt="Description" className="img-fluid rounded" />
                            )}
                        </div>
                    ))}
                    </React.Fragment>
                )}
                </div>

            </div>
            <div className="col-sm-2 text-right projd-tags" dangerouslySetInnerHTML={{__html: project.tags.split(',').join('<br/>')}}></div>
        </div>
    );
    
    return html;
}


class ResearchDetails extends Component {



    constructor(props, context) {
        super(props, context);
        this.state = {
            project: null,
            hasFound: 0
        };
    }

    componentDidMount () {
        const { id } = this.props.match.params;
        let hasFound = false;
    
        fetch(`/assets/research.json`)
        .then(response => response.json())
		.then(({research:items}) => {
            for (var i = 0; i < items.length; i++) {
                if (items[i].slug === id) {
                    hasFound = true;
                    this.setState({project: items[i], hasFound: 1});
                    break;
                }
            }
            if (!hasFound) {
                this.setState({hasFound: -1});
            }
        });

    }

    render() {
        return (<Markup hasFound={this.state.hasFound} project={this.state.project} />);  
    }

}

export default ResearchDetails;
