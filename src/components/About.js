import React from 'react';
import { Link } from 'react-router-dom';
import { events } from './Events';
import { EventCard, ResearchCard, ProjectCard, BlogCard } from './Helper';

class About extends React.Component
{
    constructor(props, context) {
        super(props, context);

        this.state = {
          modal: false,
          project:[],
          research:[],
          inthelab:[]
        };

        this.toggle = this.toggle.bind(this);
    };

    componentDidMount() {
        Promise.all([
            fetch(`/assets/research.json`).then(response => response.json()),
            fetch(`/assets/portfolio.json`).then(response => response.json()),
            fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues`).then(response => response.json()),
        ])
        .then(([researchData, projectData, blogData]) => {
            this.setState({
                research: researchData.project,
                project: projectData.portfolio,
                inthelab: blogData
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
    }
    

    toggle() {
        this.setState({
          modal: !this.state.modal
        });
    }

	render(){
        const {research, project, inthelab} = this.state;

		return(
            <div className="row">
                <div className="col-sm-7">
                    <div className="py-5">
                        <h1>Hello <span role="img" aria-label="Waving hand">👋</span></h1>
                        <div className="subheading mb-5">I'm Faisal (&#934;sal)</div>
                        
                        {/* <div className="pp"><iframe title="jquery404" className="ppp" src="https://player.vimeo.com/video/29850027?autoplay=1&loop=1&title=0&byline=0&portrait=0" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></div> */}
                        
                        <p className="my-5">
                        I develop software for all sorts of platforms (<i className="fab fa-windows"></i> / <i className="fab fa-apple"></i> / <i className="fab fa-linux"></i>) 
                        using different tools depending on the <Link to="/project">project</Link> needs (<i className="fab fa-react"></i> / <i className="fab fa-angular"></i> / <i className="fab fa-android"></i> / <i className="fab fa-unity"></i>). 
                        
                        <br/>
                        <br/>
                        I received my Ph.D. in computer graphics at CMIC, Victoria University of Wellington, New Zealand. 
                        Right now, I spend most of my days <Link to="/research">researching</Link> XR (<i className="fas fa-vr-cardboard"></i>) tools and getting lost in my thoughts about coding standards, design methodologies, usability, and accessibility. 
                        
                        <br/>
                        <br/>
                        And when I'm not doing that, I watch <Link to="/movies">movies</Link>, take <Link to="/photo">pictures</Link>, or create weird stuff like the kind you saw in that video. Cheers!
                        </p>
                    </div>

                    <h4>Updates</h4>
                    {
                        events.map((item, i) => i<4? <EventCard key={i} data={item} /> : '')
                    }

                    <Link to="/updates"><small>Show All...</small></Link>

                    <div className="py-5"></div>

                    <h4>Latest research</h4>

                    <div className="row">
                    {research && research.length > 0 ? (
                        <React.Fragment>
                            {research[0].publications.slice(0, 2).map(item => (
                                <ResearchCard key={Math.random()} item={item} />
                            ))}
                            <Link className="px-4" to="/research"><small>Show All Research...</small></Link>
                        </React.Fragment>
                    ) : (
                        <p>Loading research data...</p>
                    )}
                    </div>


                    <div className="py-5"></div>


                    <h4>Latest project</h4>
                    
                    <div className="row">
                    {project && project.length > 0 ? (
                        <React.Fragment>
                            {project.slice(0, 2).map(item => (
                                <ProjectCard key={Math.random()} item={item} />
                            ))}
                            <Link className="px-4" to="/project"><small>Show All Projects...</small></Link>
                        </React.Fragment>
                    ) : (
                        <p>Loading project data...</p>
                    )}
                    </div>



                    <div className="py-5"></div>


                    <h4>In the lab</h4>
                    
                    {inthelab && inthelab.length > 0 ? (
                        <React.Fragment>
                            {inthelab.slice(0, 2).map(item => (
                                <BlogCard key={item.id} item={item} />
                            ))}
                            <Link to="/blog"><small>Show All Posts...</small></Link>
                        </React.Fragment>
                    ) : (
                        <p>Loading project data...</p>
                    )}

                    
                    <p className="my-5"><i className="material-icons">face</i><i>THE ONLY TIME YOU SHOULD EVER LOOK BACK, IS TO SEE HOW FAR YOU'VE COME</i><i className="material-icons">format_quote</i></p>
                </div>

            </div>
		)
	}
}

export default About;