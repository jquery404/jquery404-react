import React from "react";
import {NavLink} from 'react-router-dom';

const RenderCardLink = (url) => {
    const isExternal = url.startsWith("http");
    if (isExternal) {
        window.location.href = url;
    } else {
        window.location.href = `${url}`;
    }
};


const RenderLink = (type, url, icon, label) => {
    const isExternal = url.includes("https");
    return isExternal ? (
        <React.Fragment key={type}>
            <a href={url} target="_blank" rel="noopener noreferrer">
                <span className="badge badge-dark tooltips">
                    <i className={`${icon}`}></i> {label}
                </span>
            </a>&nbsp;
        </React.Fragment>
    ) : (
        <React.Fragment key={type}>
            <NavLink to={url} target="_blank" rel="noopener noreferrer">
                <span className="badge badge-dark tooltips">
                    <i className={`${icon}`}></i> {label}
                </span>
            </NavLink>&nbsp;
        </React.Fragment>
    );
};

const EventCard = ({ data }) => 
    <div className="update-c card mb-2">
        <div className="card-horizontal">
            <div className="img-square-wrapper" style={{backgroundImage:`url(${data.thumb})`}}>......</div>
            <div className="update-card card-body m-0 p-1">
                <small>{data.date}</small>
                {data.award && <i className="fa fa-award event-award" title={data.award}></i>}
                <small className={`float-right badge ${data.role === 'presented' ? 'badge-warning' : 'badge-info'}`}>
                    {data.role}
                </small><br/>
                <a href={data.url} target="_blank"><b className="mb-1">{data.title}</b></a>
                <p className="mb-1">{data.place}</p>
                <small dangerouslySetInnerHTML={{ __html: data.html }} />
            </div>
        </div>
    </div>


const ResearchCard = ({ item }) => {
    const handleCardClick = () => {
        RenderCardLink(item.url);
    };

    return (
        <div className="card home-card col-sm-6 p-4 border-0" onClick={handleCardClick}>
            <img className="card-img-top" src={`/assets/imgs/research/${item.thumbnail}`} alt={item.title} />
            <div className="card-body p-0 border-1">
                <b>{item.title}</b> <br/>
            </div>
        </div>
    );
}


const ProjectCard = ({ item }) => {
    const handleCardClick = () => {
        RenderCardLink('p/'+item.slug);
    };

    return (
        <div className="card home-card col-sm-6 p-4 border-0" onClick={handleCardClick}>
            <img className="card-img-top" src={`/assets/imgs/project/${item.thumbnail}`} alt={item.title} />
            <div className="card-body p-0 border-1">
                <b>{item.title}</b> <br/>
                <small><em className="badge badge-warning">{item.tags}</em></small>
            </div>
        </div>
    );
};

const BlogCard = ({ item }) => {

    const handleCardClick = () => {
        RenderCardLink(`/blog/${item.number}`);
    };

    return (
    <div className="update-c card home-card mb-2" onClick={handleCardClick}>
        <div className="card-horizontal">
            <div className="img-square-wrapper"><img src={item.user.avatar_url} alt={item.user.html_url} width="50px" /></div>
            <div className="update-card card-body m-0 p-1">
                <small>{item.created_at}</small><br/>
                <b className="mb-1">{item.title}</b><br/>
                <small dangerouslySetInnerHTML={{ __html: item.body }} />
            </div>
        </div>
    </div>
    )
}

    
export { RenderLink, RenderCardLink, EventCard, ResearchCard, ProjectCard, BlogCard };