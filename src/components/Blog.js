import React from 'react';
import ReactMarkdown from 'react-markdown';
import {Link} from 'react-router-dom';

class Blog extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            items: []
        }
    }

    componentWillMount() {
        fetch('https://api.github.com/repos/jquery404/jquery404.github.io/issues')
            .then(response => response.json())
            .then(data => this.setState({ items: data }))
            .catch(error => console.log(error));
    }

    minRead(length) {
        return Math.floor(length / 200) + "." + Math.floor((length / 200 % 1) * 0.6 * 100) + " min read";
    }

    render() {
        let items = this.state.items;

        return (
            <div className="row">
                <div className="col-sm-10">
                    <div className="py-5">
                        <h1>Blog</h1>
                        <div>
                            {items.map((item, i) => 
                                <div key={i} className="mb-5">
                                    <h3><Link to={`/blog/${item.number}`}>{item.title}</Link></h3>
                                    <span className="meta-blog"><i>by {item.user.login} - {this.minRead(item.body.length)}</i> &nbsp;<i className="fa fa-comment" aria-hidden="true"></i>{item.comments}</span>
                                    <div className="pt-3"><ReactMarkdown source={item.body} escapeHtml={false} /></div>
                                    <hr></hr>
                                </div> 
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default Blog;
