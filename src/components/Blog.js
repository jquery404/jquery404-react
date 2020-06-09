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
                                <div key={i}>
                                    <h3><Link to={`/blog/${item.number}`}>{item.title}</Link></h3>
                                    <i>{item.user.login} - {this.minRead(item.body.length)}</i> - 
                                    <i className="fa fa-comment" aria-hidden="true"></i>{item.comments}
                                    <p><ReactMarkdown source={item.body} escapeHtml={false} /></p>
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
