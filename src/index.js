import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

import App from './App';
import About from './components/About';
import Project from './components/Project';
import ProjectDetails from './components/ProjectDetails';
import Research from './components/Research';
import ResearchDetails from './components/ResearchDetails';
import Blog from './components/Blog';
import Post from './components/Post';
import Photo from './components/Photo';
import Updates from './components/Updates';
import UpdateDetails from './components/UpdateDetails';
import Contact from './components/Contact';
import Shop from './components/Shop';
import Note from './components/Note';
import Movie from './components/Movie';
import WorldMap from './components/WorldMap';
import Log from './components/Log';
import FourZFour from './components/FourZFour';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <App>
        <Routes>
          <Route path='/' element={<About />} />
          <Route path='/project' element={<Project />} />
          <Route path='/p/:id' element={<ProjectDetails />} />
          <Route path='/research' element={<Research />} />
          <Route path='/r/:id' element={<ResearchDetails />} />
          <Route path='/blog' element={<Blog />} />
          <Route path='/blog/:id' element={<Post />} />
          <Route path='/photo' element={<Photo />} />
          <Route path='/updates' element={<Updates />} />
          <Route path='/updates/:id' element={<UpdateDetails />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/shop' element={<Shop />} />
          <Route path='/log' element={<Log />} />
          <Route path='/travel' element={<WorldMap />} />
          <Route path='/note' element={<Note />} />
          <Route path='/movies' element={<Movie />} />
          {/* catch-all route */}
          <Route path='*' element={<FourZFour />} />
        </Routes>
      </App>
    </Router>
  </React.StrictMode>
);
