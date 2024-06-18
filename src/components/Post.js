import React, { Component } from 'react';

class Post extends Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            item: [],
            comments: [],
            comment: '',
            id: props.match.params.id
        }
        this.onChangeComment = this.onChangeComment.bind(this);
        this.postComment = this.postComment.bind(this);
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

    onChangeComment(e) { this.setState({comment: e.target.value}); }

    postComment(e){
        e.preventDefault();
        fetch(`https://api.github.com/repos/jquery404/jquery404.github.io/issues/${this.state.id}/comments`, {
                method: 'post',
                body: this.state.comment
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.log(error));
    }
   
    render() {
        let item = this.state.item;
        let comments = this.state.comments;
        
        return (
            <div className="row">
                <div className="col-sm-10">
                    <div className="py-5">
                        <div>
                            <span className="pointer" onClick={this.props.history.goBack} ><i className="fa fa-chevron-left"></i> Back</span>
                            <h3>{item.title}</h3>
                            <p dangerouslySetInnerHTML={{ __html: item.body }}></p>
                        </div>
                        <div>
                            <hr/>
                            <b>Comments:</b> <br/>
                            <form onSubmit={this.postComment}>
                                <input type="text" value={this.state.comment} onChange={this.onChangeComment} />
                                <input type="submit" value="Submit" />
                            </form>
                            {comments.length?comments.map((comment, i) =>
                                <div key={i}>
                                    <span className="avatar">{comment.user.login.charAt(0).toUpperCase()}</span> <i>{comment.user.login}</i>
                                    <p dangerouslySetInnerHTML={{ __html: item.body }}></p>
                                </div>

                            ): ' No comments yet'}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

export default Post;
