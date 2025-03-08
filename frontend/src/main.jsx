import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import QA from './pages/QA';
import CompleteForms from './pages/CompleteForms';
import CommonQuestions from './pages/CommonQuestions';
import About from './pages/About';
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('app'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* The App component works as a layout component with an Outlet */}
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="qa" element={<QA />} />
          <Route path="complete-forms" element={<CompleteForms />} />
          <Route path="common-questions" element={<CommonQuestions />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
