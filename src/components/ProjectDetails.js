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
                <img className="card-img-top" src={"/assets/imgs/project/"+project.thumbnail} alt={project.title} />
                <h2 className="projd-title mt-5 pb-3">{project.title}</h2>
            </div>
            
            <div className="col-sm-8">
                {project.desc}
                {project.url !== "" ? <a className="nav-link" href={project.url} target="_blank"><i className="fa fa-external-link-alt"></i> Project Link</a> : null }
                <div className="row">
                    {
                    project.gallery.map((gallery, i) => 
                        <div key={i} className={(gallery.type==='image' ? 'col-sm-6' :  (gallery.ratio==='landscape' ? 'col-sm-12' : 'col-sm-6'))}>
                        {
                            gallery.type === "image" ? 
                            <img className="p-3 img-fluid" src={"/assets/imgs/project/"+gallery.url} alt="" /> : 
                            <div className={"embed-responsive " + (gallery.ratio==='landscape' ? 'embed-responsive-16by9' : 'embed-responsive-1by1')}>
                                <iframe key={i} title={i} className="embed-responsive-item" src={gallery.url} allowFullScreen></iframe>
                            </div>
                        }
                        </div>
                    )
                    }
                </div>
            </div>
            <div className="col-sm-2 text-right projd-tags" dangerouslySetInnerHTML={{__html: project.tags.split(',').join('<br/>')}}></div>
        </div>
    );
    
    return html;
}


class ProjectDetails extends Component {



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
    
        fetch(`/assets/portfolio.json`)
        .then(response => response.json())
		.then(({portfolio:items}) => {
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

export default ProjectDetails;
