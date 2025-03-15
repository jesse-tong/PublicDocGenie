import React from 'react';

// Common style for pill buttons
const buttonStyle = {
  backgroundColor: '#32a852',
  color: '#fff',
  border: 'none',
  borderRadius: '50px',
  padding: '10px 20px',
  margin: '10px 5px',
  cursor: 'pointer'
};

const previewContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  marginTop: '15px'
};

const previewItemStyle = {
  width: '100px',
  height: '100px',
  margin: '5px',
  border: '1px solid #ccc',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  borderRadius: '8px'
};

function FileUpload({ onFilesSelected, onDeleteFiles, pendingFiles, uploadingOpen, ref, showUploadButton=true }) {

  // Handler when files are selected
  const handleInputChange = (event) => {
    const filesArray = Array.from(event.target.files);
    onFilesSelected(filesArray);
  };

  // Render the preview for each file
  const renderFilePreview = (file, index) => {
    const fileType = file.type;

    if (fileType.startsWith('image/')) {
      // Create an image preview using a blob URL
      return (
        <img 
          src={URL.createObjectURL(file)} 
          alt={file.name} 
          style={{ maxWidth: '100%', maxHeight: '100%' }} 
          onLoad={(e) => URL.revokeObjectURL(e.target.src)}
        />
      );
    } else if (fileType.startsWith('video/')) {
      // Use a placeholder text for video files - you can replace with an icon if desired.
      return <span style={{ fontSize: '15px' }}>📹 Video</span>;
    } else if (fileType === 'application/pdf' || fileType.includes('msword') || fileType.includes('officedocument')) {
      // Documents placeholder - PDF, DOC, DOCX, etc.
      return <span style={{ fontSize: '15px' }}>📄 Doc</span>;
    } else {
      // Generic placeholder for other file types
      return <span style={{ fontSize: '15px' }}>📎 File</span>;
    }
  };

  return (
    <div style={{ marginBottom: '0px', display: uploadingOpen ? 'block' : 'none' }} ref={ref}>
      <h4 style={{ marginTop: '5px', marginBottom: '0px' }}>File Upload</h4>
      <div className='upload-input-row'>

        <div className='row-3'>
          <input type="file" multiple onChange={handleInputChange} className='chat-button'/>
          <br />
          {/* The "Upload Files" button could trigger an upload process if needed */}
          { showUploadButton &&
          <button style={buttonStyle} onClick={() => onFilesSelected([])}>
            Upload Files
          </button>
    }
          <button style={buttonStyle} onClick={onDeleteFiles}>
            Delete Pending Files
          </button>
        </div>

        <div className='row-7'>
          {pendingFiles && pendingFiles.length > 0 && (
            <div style={previewContainerStyle}>
              {pendingFiles.map((file, index) => (
                <div key={index} style={previewItemStyle} title={file.name}>
                  {renderFilePreview(file, index)}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default FileUpload;
