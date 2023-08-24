import React from 'react';

const repoOwner = 'jquery404';
const repoName = 'jquery404.github.io';
const branchName = 'master'; 
const folderPath = 'notes';
const accessToken = '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'; 

class Note extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      textFiles: [],
      loading: true,
      showEdit: false,
      selectedImage: null,
      uploadStatus: null,
      textContent: null,
      uploadTxtStatus: null,
    };
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

  handleUploadText = async () => {
    const { textContent } = this.state;

    if (!textContent) {
      this.setState({ uploadStatus: 'Please type some text first.' });
      return;
    }

    try {
      const currentTimestamp = new Date().toISOString().replace(/[-:.T]/g, '');
      const uniqueFileName = `text_${currentTimestamp}.txt`;

      const filePath = `${folderPath}/${uniqueFileName}`;
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

      const content = Buffer.from(textContent).toString('base64');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `token ${accessToken}`,
        },
        body: JSON.stringify({
          message: `Add ${uniqueFileName}`,
          content: content,
          branch: branchName,
        }),
      });

      if (response.ok) {
        this.setState({ uploadTxtStatus: 'Text uploaded successfully!' });
      } else {
        this.setState({ uploadTxtStatus: 'Failed to upload text. Please try again.' });
      }
    } catch (error) {
      console.error('Error uploading text:', error);
      this.setState({ uploadTxtStatus: 'An error occurred. Please try again later.' });
    }
  };

  componentDidMount() {
    this.fetchTextFiles();
  }

  fetchTextFiles = async () => {
    try {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repository contents.');
      }

      const data = await response.json();
      const textFiles = data.filter((file) => file.name.endsWith('.txt'));

      // Fetch and read the content of each text file
      const promises = textFiles.map(async (file) => {
        const contentResponse = await fetch(file.download_url);
        const content = await contentResponse.text();
        return {
          name: file.name,
          content,
        };
      });

      const textFilesContent = await Promise.all(promises);

      this.setState({
        textFiles: textFilesContent,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching text files:', error);
      this.setState({
        loading: false,
      });
    }
  };

  handleToggleEdit = () => {
    this.setState((prevState) => ({
      showEdit: !prevState.showEdit,
    }));
  };


  render() {
    const { uploadStatus, uploadTxtStatus, showEdit, textFiles, loading } = this.state;

    return (
      <div>
        <h1>Note</h1>
        <button onClick={this.handleToggleEdit}>
          {showEdit ? 'Hide Edit' : 'Show Edit'}
        </button>

        {showEdit && (
          <div>
            <input type="file" onChange={this.handleImageChange} />
            <button onClick={this.handleUploadImage}>Upload Image</button>
            {uploadStatus && <p>{uploadStatus}</p>}

            <hr/>
            <textarea
              rows={4}
              cols={50}
              value={this.state.textContent}
              onChange={this.handleTextChange}
            /><br/>
            <button onClick={this.handleUploadText}>Upload Text</button>
            {uploadTxtStatus && <p>{uploadTxtStatus}</p>}
          </div>
        )}
        <hr/>

        {loading ? (
        <div>Loading...</div>
        ) : (
          <ul>
            {textFiles.map((file) => (
              <li key={file.name}>
                {/* <b>{file.name}</b> */}
                <p style={{ whiteSpace: 'pre-wrap' }}>{file.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

export default Note;
