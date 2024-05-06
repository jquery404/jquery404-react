import React from 'react';

const repoOwner = 'jquery404';
const repoName = 'jquery404.github.io';
const branchName = 'master'; 
const folderPath = 'movies';
const accessToken = 'process.env.REACT_APP_ACCESS_TOKEN';

class Movie extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      movFiles: [],
      loading: true,
      showEdit: false,
      selectedImage: null,
      uploadStatus: null,
      textContent: null,
      uploadTxtStatus: null,
      imdbApiKey: '',
      gitAccessToken: '',
      results: [],
      content: [],
    };
    this.search = this.search.bind(this);
  }

  handleImageChange = (event) => {
    this.setState({
      selectedImage: event.target.files[0],
    });
  };

  handleUploadImage = async () => {
    const { selectedImage } = this.state;

    if (!selectedImage) {
      this.setState({ uploadStatus: 'Please select an image first.' });
      return;
    }

    try {
      const file = selectedImage;
      const content = await file.arrayBuffer();
      const base64Content = Buffer.from(content).toString('base64');
      const currentTimestamp = new Date().toISOString().replace(/[-:.T]/g, '');
      const uniqueFileName = `image_${currentTimestamp}.jpg`;
      const filePath = `${folderPath}/${uniqueFileName}`;

      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

      console.log("----", accessToken);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${accessToken}`,
        },
        body: JSON.stringify({
          message: `Add ${file.name}`,
          content: base64Content,
          branch: branchName,
        }),
      });

      if (response.ok) {
        this.setState({ uploadStatus: 'Image uploaded successfully!' });
      } else {
        this.setState({ uploadStatus: 'Failed to upload image. Please try again.' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      this.setState({ uploadStatus: 'An error occurred. Please try again later.' });
    }
  };

  handleTextChange = (event) => {
    this.setState({
      textContent: event.target.value,
    });
  };

  async handleUploadText(elm, key) {
    const { content, gitAccessToken } = this.state;

    const options = {
      method: 'GET',
      headers: {
          'X-RapidAPI-Key': this.state.imdbApiKey,
          'X-RapidAPI-Host': 'imdb8.p.rapidapi.com'
      }
    };
    
    let id = content[key].id.substring(7, content[key].id.length-1);

    this.setState({
      loading: true
    });
    
    Promise.all([
        fetch('https://imdb8.p.rapidapi.com/title/get-genres?tconst='+id, options).then(response => response.json()),
        fetch('https://imdb8.p.rapidapi.com/title/get-ratings?tconst='+id, options).then(response => response.json())
    ])
    .then(async ([genresResponse, ratingsResponse]) => {
        content[key].genres = genresResponse;
        content[key].rating = ratingsResponse.rating;
        content[key].ratingsHistograms = ratingsResponse.ratingsHistograms;

        this.setState(prevState => ({
          movFiles: [content[key], ...prevState.movFiles],
          loading: false
        }));

        try {
          const fileName = 'movdb.json';
          const filePath = `${folderPath}/${fileName}`;
          const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

          const fetchResponse = await fetch(url, {
              headers: {
                  Authorization: `token ${gitAccessToken}`,
              }
          });
      
          if (!fetchResponse.ok) {
              throw new Error('Failed to fetch existing file');
          }
      
          const { sha } = await fetchResponse.json();
      
          // Update movFiles array and stringify it to JSON
          const updatedContent = JSON.stringify(this.state.movFiles);
      
          // Encode updated content to base64
          const updatedContentBase64 = Buffer.from(updatedContent).toString('base64');
      
          // Make PUT request to update the file
          const updateResponse = await fetch(url, {
              method: 'PUT',
              headers: {
                  Authorization: `token ${gitAccessToken}`,
              },
              body: JSON.stringify({
                  message: `Update ${fileName}`,
                  content: updatedContentBase64,
                  sha: sha, 
                  branch: branchName,
              }),
          });
      
          if (updateResponse.ok) {
              this.setState({ 
                uploadTxtStatus: 'Text updated successfully!',
                results: [] 
              });
          } else {
              this.setState({ uploadTxtStatus: 'Failed to update text. Please try again.' });
          }
        } catch (error) {
          console.error('Error uploading text:', error);
          this.setState({ uploadTxtStatus: 'An error occurred. Please try again later.' });
        }
    })
    .catch(err => console.error(err));
  };

  componentDidMount() {
    this.fetchMovieFiles();
  }

  fetchMovieFiles = async () => {
    try {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch repository contents.');
      }

      const data = await response.json();
      const textFiles = data.filter((file) => file.name.endsWith('.json'));

      // Fetch and read the content of each text file
      const promises = textFiles.map(async (file) => {
        const contentResponse = await fetch(file.download_url);
        const content = await contentResponse.json();
        
        return content;
      });

      const textFilesContent = await Promise.all(promises);


      this.setState({
        movFiles: textFilesContent[0],
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching text files:', error);
      this.setState({
        loading: false,
      });
    }
  };

  search() {
    const { imdbApiKey, gitAccessToken, textContent } = this.state;

    if (!imdbApiKey) {
      const apiKey = prompt('Please enter X-RapidAPI-Key');
      if (!apiKey) return; // User cancelled
      this.setState({ imdbApiKey: apiKey });
    }
    if (!gitAccessToken) {
      const accessToken = prompt('Please enter AccessToken');
      if (!accessToken) return; // User cancelled
      this.setState({ gitAccessToken: accessToken });
    }

    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': this.state.imdbApiKey,
            'X-RapidAPI-Host': 'imdb8.p.rapidapi.com'
        }
    };

    fetch(`https://imdb8.p.rapidapi.com/title/find?q=${textContent}`, options)
        .then(response => response.json())
        .then(data => {
            this.setState({ content: [] });

            const newResults = data.results.map((elm, key) => {
                let cardHtml = (
                    <div className="col-sm-2" key={key}>
                        <div className="card">
                            {elm.image && <img className="card-img-top" src={elm.image.url} alt={elm.title} />}
                            <div className="card-body">
                                <h5 className="card-title">{elm.title} ({elm.year})</h5>
                                <span className="badge badge-pill badge-primary">{elm.titleType}</span>
                                <p className="card-text">RunningTime {elm.runningTimeInMinutes}m</p>
                                {elm.principals && elm.principals.map((val, index) => (
                                    <span className="badge badge-dark" key={index}>{val.name}</span>
                                ))}
                                <br />
                                <button onClick={() => this.handleUploadText(elm, key)} className="btn btn-primary">ADD</button>
                            </div>
                        </div>
                    </div>
                );

                let t = {
                    id: elm.id,
                    title: elm.title,
                    year: elm.year,
                    runningTimeInMinutes: elm.runningTimeInMinutes,
                    titleType: elm.titleType,
                    imageUrl: elm.image ? elm.image.url : null,
                    imageWidth: elm.image ? elm.image.width : null,
                    imageHeight: elm.image ? elm.image.height : null,
                    principals: elm.principals ? elm.principals.map(val => val.name) : null
                };
                this.state.content.push(t);    

                return cardHtml;
            });

            this.setState({ results: newResults });
        })
        .catch(err => console.error(err));
  }

  handleToggleEdit = () => {
    this.setState((prevState) => ({
      showEdit: !prevState.showEdit,
    }));
  };


  render() {
    const { uploadTxtStatus, showEdit, movFiles, loading, results } = this.state;

    return (
      <div>
        <h1>Movies</h1>
        <p>I'm a big fan of movies and have probably seen hundreds, if not thousands of them! 
          But with so many under my belt, it's becoming quite a task to find new gems that tickle my fancy. 
          Still, there are a few that hold a special place in my heart, ones I can't resist revisiting time and again.
          This page is dedicated to those special films.</p>
        <button className="btn btn-primary" onClick={this.handleToggleEdit}>
          {showEdit ? 'Hide Add' : 'Show Add'}
        </button>

        {showEdit && (
          <div>
            <textarea
              rows={2}
              cols={50}
              value={this.state.textContent}
              onChange={this.handleTextChange}
            /><br/>
            <button className="btn btn-sm btn-secondary" onClick={this.search}>Search</button>
            {uploadTxtStatus && <p>{uploadTxtStatus}</p>}
          </div>
        )}
        <div className="row search-content">{results}</div>
        <hr/>

        {loading ? (
        <div>Loading...</div>
        ) : (
          <div className="row">
            {movFiles.map((file) => (
              <div key={file.id} className="col-sm-2">
              <div className="card">
                {file.imageUrl && <img className="card-img-top" src={file.imageUrl} alt={file.title} />}
                <div className="card-body">
                  {file.titleType === 'tvSeries' || file.titleType === 'tvEpisode' ? (
                    <div>
                      <h5 className="card-title">{file.title} ({file.seriesStartYear}-{file.seriesEndYear})</h5>
                      <span className="badge badge-pill badge-primary">{file.titleType}</span>
                      <span className="badge badge-pill badge-warning">{file.numberOfEpisodes} Episodes</span>
                    </div>
                  ) : (
                    <div>
                      <h5 className="card-title">{file.title} ({file.year})</h5>
                      <span className="badge badge-pill badge-primary">{file.titleType}</span>
                    </div>
                  )}
                  <p className="card-text">{file.runningTimeInMinutes} min</p>
                  {file.genres && <p>Genres: {file.genres.join(', ')}</p>}
                  {file.rating && (
                    <div>
                      Rating: {file.rating}
                    </div>
                  )}
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

export default Movie;
