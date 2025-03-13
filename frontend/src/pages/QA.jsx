import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import axios from 'axios';
import FileUpload from './../components/FileUpload';
import Chatbot from './../components/Chatbot';

const BASE_URL = 'http://localhost:8000'; // or from env/config

function QA() {
  // State for files and chat messages
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadingOpen, setUploadingOpen] = useState(false);
  //This will determine to render the file upload as animations making rendering time different to open state
  const [shouldRender, setShouldRender] = useState(false); 
  const elementRef = useRef(null);
  const [messages, setMessages] = useState([
    // assuming the very first message is from the user:
    { type: 'user', text: 'Hello Bot!' }
  ]);

  const toggleUpload = () => {
    setUploadingOpen(open => !open);
  }

  // Trigger the transition when the element is shown or hidden
  useEffect(() => {
      if (uploadingOpen) {
        setShouldRender(true); // Make sure the element is in the DOM before animation
          anime({
              targets: elementRef.current,
              opacity: [0, 1], // Fade-in effect
              translateY: [-30, 0], // Move upwards
              easing: "easeOutQuad",
              duration: 600,
          });
      } else {
          anime({
              targets: elementRef.current,
              opacity: [1, 0], // Fade-out effect
              translateY: [0, -30], // Move downwards
              easing: "easeInQuad",
              duration: 400,
              complete: () => {
                setShouldRender(false); // Hide after animation ends
              }
          });
      }
  }, [uploadingOpen]);

  // Add files picked from FileUpload component
  const addFiles = (files) => {
    // Append new files to current pendingFiles
    setPendingFiles(prevFiles => [...prevFiles, ...files]);
  };

  // Delete all pending files
  const deleteFiles = () => {
    setPendingFiles([]);
  };

  // Handle sending prompts from the Chatbot component by adding a new user message,
  // and then simulate a bot reply for demonstration.
  const sendPrompt = (prompt) => {
    if (prompt.trim() === '') return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: prompt }]);

    axios.post(BASE_URL + '/chatbot/ask', { question: prompt })
      .then(res => {
        // Add bot response
        setMessages(prev => [...prev, { type: 'bot', text: res.data.answer + '\nReferences: ' + res.data.titles.map(title => `- ${title}`).join("\n") }]);
      })
      .catch(err => {
        console.error(err);
        setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I am unable to process your request at the moment.' }]);
      });
    
  };

  // Main container styling
  const containerStyle = {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '92%',
    maxHeight: '92%',
    marginLeft: '5%',
    marginRight: '5%',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} className='outlet'>
      
      <Chatbot 
        onSendPrompt={sendPrompt}
        messages={messages}
        onToggleUpload={toggleUpload}
      />
      <FileUpload 
        onFilesSelected={addFiles} 
        onDeleteFiles={deleteFiles} 
        pendingFiles={pendingFiles} 
        uploadingOpen={shouldRender}
        ref={elementRef}
      />
    </div>
  );
}

export default QA;
