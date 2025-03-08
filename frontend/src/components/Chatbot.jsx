import React, { useState } from 'react';

// Pill button styling for sending prompt
const buttonStyle = {
  backgroundColor: '#32a852',
  color: '#fff',
  border: 'none',
  borderRadius: '50px',
  padding: '10px 20px',
  margin: '10px 5px',
  cursor: 'pointer'
};

// Nested flexbox to make the chat container change size to the parent (the chatbot container)
// The chatbot container itself also has flex-grow: 1, min-height: 0 allow it changes size to fit the parent 
// without overflowing
const chatbotContainer = {
  display: 'flex', /* Enable flexbox */
  width: '100%',
  flexGrow: '1',
  flexDirection: 'column',
  minHeight: '0'
}

// flex-grow: 1 make the element changes size to fit the parent flex element
const chatContainerStyle = {
  border: '1px solid #ccc',
  borderRadius: '8px',
  padding: '10px',
  marginTop: '10px',
  flexGrow: '1',
  overflowY: 'auto',
  backgroundColor: '#fff'
};

const inputContainerStyle = {
  marginTop: '10px'
};

const buttonRightMargin = {
  marginRight: '15px'
}



function Chatbot({ onSendPrompt, messages, onToggleUpload, chatbotAreaName = 'Chatbot'}) {
  const [prompt, setPrompt] = useState('');

  const handleSendPrompt = () => {
    if (prompt.trim()) {
      onSendPrompt(prompt);
      setPrompt('');
    }
  };

  // Style definitions for user and bot messages
  const userMessageStyle = {
    backgroundColor: '#32a852',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px',
    margin: '10px 0 10px 20px',
    maxWidth: '85%',
    alignSelf: 'flex-start',
    whiteSpace: 'normal', /* Allows text to wrap */
    wordWrap: 'break-word', /* Breaks long words if necessary */
    overflowWrap: 'break-word' /* Alternative to word-wrap for newer browsers */
  };

  const botMessageStyle = {
    backgroundColor: '#2b6650',
    color: '#fff',
    borderRadius: '8px',
    padding: '10px',
    margin: '10px 20px 10px auto',
    maxWidth: '85%',
    alignSelf: 'flex-end',
    whiteSpace: 'normal', /* Allows text to wrap */
    wordWrap: 'break-word', /* Breaks long words if necessary */
    overflowWrap: 'break-word' /* Alternative to word-wrap for newer browsers */
  };

  const buttonContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginTop: '10px'
  };

  return (
    <div style={chatbotContainer}>
      <h2 style={{ margin: '5px' }}>{chatbotAreaName}</h2>
      <div style={chatContainerStyle}>
        {/* Render messages in order */}
        {messages.map((message, index) => (
          <div 
            key={index} 
            style={message.type === 'user' ? userMessageStyle : botMessageStyle}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div style={inputContainerStyle} className='chat-input-row'>
        <textarea
          rows="4"
          cols="50"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          style={{ 
            width: '100%', 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
          className='row-8 chatbot-prompt-input'
        />
        <div style={buttonContainerStyle} className='row-2'>
          <button style={{...buttonStyle}} onClick={handleSendPrompt}>
            Send Prompt
          </button>
          <button style={buttonStyle} onClick={onToggleUpload}>
            Upload File
          </button>
        </div>

      </div>
    </div>
  );
}

export default Chatbot;
