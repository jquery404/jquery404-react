import React, { Component } from 'react';
import ReactMarkdown from 'react-markdown';

class Post extends Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            item: [],
            comments: [],
            id: props.match.params.id
        }
    }

    componentWillMount() {
        fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues/${this.state.id}`)
            .then(response => response.json())
            .then(data => this.setState({ item: data }))
            .catch(error => console.log(error));

        fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues/${this.state.id}/comments`)
            .then(response => response.json())
            .then(data => this.setState({ comments: data }))
            .catch(error => console.log(error));
    }

    minRead(length) {
        return Math.floor(length / 200) + "." + Math.floor((length / 200 % 1) * 0.6 * 100) + " min read";
    }
   
    render() {
        let item = this.state.item;
        let comments = this.state.comments;
        
        return (
            <div className="row">
                <div className="col-sm-10">
                    <div className="py-5">
                        <div>
                            <h3>{item.title}</h3>
                            <p><ReactMarkdown source={item.body} escapeHtml={false} /></p>
                        </div>
                        <div>
                            <hr/>
                            Comments: 
                            {comments.map((comment, i) =>
                                <div key={i}>
                                    <i>{comment.user.login}</i>
                                    <p><ReactMarkdown source={comment.body} escapeHtml={false} /></p>
                                </div>

                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default Post;
