import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';  // Your FileUpload component
import TextList from '../components/TextList';
import Markdown from 'react-markdown';

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = new Array(b.length + 1).fill(0).map(() => new Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
      }
    }
  }

  return matrix[b.length][a.length];
}


/**
 * Utility function to parse lines like:
 *   <Doc>CCCD</Doc>
 *   <Info>Số điện thoại liên hệ (không bắt buộc)</Info>
 *
 * Returns something like { docs: [...], infos: [...] }
 * Adjust if your server returns a different format or JSON.
 */
const parseRequiredResponse = (rawText) => {
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const docs = [];
  const infos = [];

  lines.forEach((line) => {
    // Match <Doc>...</Doc>
    const docMatch = line.match(/<Doc>(.*?)<\/Doc>/);
    if (docMatch) {
      docs.push(docMatch[1]);
    }
    // Match <Info>...</Info>
    const infoMatch = line.match(/<Info>(.*?)<\/Info>/);
    if (infoMatch) {
      infos.push(infoMatch[1]);
    }
  });

  return { docs, infos };
};

/**
 * Utility function to parse "answer" lines like:
 *   <Info>Tên người nộp thuế</Info><Value>NGUYỄN TUẤN KHANH</Value><Doc>CCCD</Doc>
 *   <Info>Địa chỉ thường trú</Info><Value>21, Nguyễn Trãi...</Value><Doc>CCCD</Doc>
 *
 * Returns an array of objects:
 *   [{ info: ..., value: ..., doc: ... }, ...]
 */
const parseMatchResponse = (rawText) => {
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const matches = [];

  lines.forEach((line) => {
    const infoMatch = line.match(/<Info>(.*?)<\/Info>/);
    const valueMatch = line.match(/<Value>(.*?)<\/Value>/);
    const docMatch = line.match(/<Doc>(.*?)<\/Doc>/);

    if (infoMatch || valueMatch || docMatch) {
      matches.push({
        info: infoMatch ? infoMatch[1] : null,
        value: valueMatch ? valueMatch[1] : null,
        doc: docMatch ? docMatch[1] : null,
      });
    }
  });

  return matches;
};

const containerStyle = {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '92%',
    minHeight: '92%',
    marginLeft: '5%',
    marginRight: '5%',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    overflow: 'scroll'
};

const BASE_URL = 'http://localhost:8000'; // or from env/config

const CompleteForms = () => {
  // Step management. You can expand or collapse steps as needed.
  // 1 = upload form, 2 = show required docs/infos, 3 = user re-uploads needed docs, 4 = show matched info, etc.
  const [currentStep, setCurrentStep] = useState(1);

  // Uploaded form files
  const [formFiles, setFormFiles] = useState([]);

  // Required docs/infos from first query (return_docs=true)
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [requiredInfos, setRequiredInfos] = useState([]);

  // Required infos from second query (return_docs=false)
  const [onlyRequiredInfos, setOnlyRequiredInfos] = useState([]);

  // For the second upload (files containing the needed info)
  const [requiredDocsFiles, setRequiredDocsFiles] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Matched results from /autofill/match_with_parsed_info
  const [matchResults, setMatchResults] = useState([]);

  // Whether to check validity on the final step
  const [checkValidity, setCheckValidity] = useState(true);

  // Keep track of the server’s validity response & referred legal documents
  const [checkingValidValueText, setCheckingValidValueText] = useState('');
  const [referredLegalDocs, setReferredLegalDocs] = useState([]);

  // If the user wants to see "remaining needed info," track how many remain
  const [remainingInfos, setRemainingInfos] = useState([]);

  // If all required info is matched
  const [isAllMatched, setIsAllMatched] = useState(false);

  // **New**: Toggle to show/hide "Current Required Docs & Infos" panel in step 3
  const [showDocsInfosPanel, setShowDocsInfosPanel] = useState(false);

  // Waiting for response from the server
  const loading = useRef(false);

  /**
   * Called after the user selects their initial "form files" and clicks "upload."
   * This queries /autofill/required_info with return_docs = true to get docs and infos,
   * and queries again with return_docs = false to just get required infos.
   */
  const handleInitialFormSubmit = async () => {
    if (formFiles.length === 0) {
      alert('Hãy tải lên một tập tin mẫu đơn (ảnh hoặc file pdf/docx)');
      return;
    }

    if (loading.current === true){
      alert('Hãy chờ cho đến khi có phản hồi bên phía server.');
      return;
    }

    loading.current = true;
    try {
      // 1) return_docs = true
      const formDataDocs = new FormData();
      formFiles.forEach((file) => {
        formDataDocs.append('form_files', file);
      });
      // Append other parameters:
      formDataDocs.append('return_docs', 'true');
      formDataDocs.append('use_gpt', 'true'); // or false if you want to use server's EasyOCR

      const resDocs = await axios.post(
        `${BASE_URL}/autofill/required_info`,
        formDataDocs,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const parsedDocs = parseRequiredResponse(resDocs.data.answer);
      setRequiredDocs(parsedDocs.docs);
      setRequiredInfos(parsedDocs.infos);

      // 2) return_docs = false
      const formDataInfos = new FormData();
      formFiles.forEach((file) => {
        formDataInfos.append('form_files', file);
      });
      formDataInfos.append('return_docs', 'false');
      formDataInfos.append('use_gpt', 'true');

      const resInfos = await axios.post(
        `${BASE_URL}/autofill/required_info`,
        formDataInfos,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const parsedInfos = parseRequiredResponse(resInfos.data.answer);
      setOnlyRequiredInfos(parsedInfos.infos);

      // After fetching these, go to step 2 to show the user
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      alert('Error uploading form files or parsing server response.');
    }
    loading.current = false;
  };

  /**
   * Called when the user uploads the documents that contain the *missing info*,
   * plus provides additional text info. This will query /autofill/match_with_parsed_info
   * to see which Info fields are now fulfilled.
   */
  const handleRequiredDocsSubmit = async () => {
    if (requiredDocsFiles.length === 0 && !additionalInfo) {
      alert(
        'Hãy tải lên ít nhất một tập tin ảnh hoặc văn bản (pdf/docx) chứa thông tin cần hoặc nhập thông tin cần cho mẫu đơn.'
      );
      return;
    }

    if (loading.current === true){
      alert('Hãy chờ cho đến khi có phản hồi bên phía server.');
      return;
    }

    loading.current = true;
    try {
      const formData = new FormData();
      // Append the required docs files
      requiredDocsFiles.forEach((file) => {
        formData.append('required_docs_files', file);
      });
      // Format the "required_info" as the lines we got from onlyRequiredInfos
      // E.g. <Info>Địa chỉ thường trú</Info>
      // We'll combine them into a single string. Adjust as necessary.
      const requiredInfoString = onlyRequiredInfos
        .map((info) => `<Info>${info}</Info>`)
        .join('\n');

      formData.append('required_info', requiredInfoString);
      formData.append('additional_info', additionalInfo);
      formData.append('check_validity', checkValidity ? 'true' : 'false');

      const res = await axios.post(
        `${BASE_URL}/autofill/match_with_parsed_info`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // The server returns an object, possibly containing "answer", "checking_valid_value_text", "titles", etc.
      // For example:
      // {
      //   answer: "<Info>Tên người nộp thuế</Info><Value>NGUYỄN TUẤN KHANH</Value><Doc>CCCD</Doc> ...",
      //   checking_valid_value_text: "...",
      //   titles: []
      // }
      const { answer, checking_valid_value_text, titles } = res.data;

      if (checking_valid_value_text) {
        setCheckingValidValueText(checking_valid_value_text);
      }
      if (titles) {
        setReferredLegalDocs(titles);
      }

      const matched = parseMatchResponse(answer);
      setMatchResults((prev) => [...prev, ...matched]);

      // Figure out which required infos remain unmatched
      // For simplicity, let's say if the matched info's name matches the required info, it's fulfilled
      const matchedInfosNames = matched.map((m) => m.info);

      // Use Levenshtein distance to find close matches to filter the matched infos from the remaining infos
      const stillNeeded = remainingInfos.filter((info) => {
        return !matchedInfosNames.some((matchedName) => {
          const distance = levenshteinDistance(info, matchedName);
          return distance <= 5;
        });
      });
      setRemainingInfos(stillNeeded);

      // Check if all required infos are matched
      if (stillNeeded.length === 0) {
        setIsAllMatched(true);
      }

      // Move to step 4 or remain on step 3, depending on your UI flow
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
      alert('Error matching info from uploaded documents.');
    }
    loading.current = false;
  };

  /**
   * Helper for copying the final matched data to clipboard
   */
  const handleCopyToClipboard = () => {
    // Gather matched info in some text format
    const textToCopy = matchResults
      .map(
        (m) =>
          `Thông tin: ${m.info}\nGiá trị: ${m.value}\nTài liệu: ${m.doc}\n---\n`
      )
      .join('');
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Copied to clipboard!');
    });
  };

  /**
   * Helper for downloading the final matched data as a text file
   */
  const handleDownloadTextFile = () => {
    const textToDownload = matchResults
      .map(
        (m) => `Thông tin: ${m.info}\nGiá trị: ${m.value}\nTài liệu: ${m.doc}\n`
      )
      .join('\n');

    const element = document.createElement('a');
    const file = new Blob([textToDownload], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'filled_form_info.txt';
    document.body.appendChild(element);
    element.click();
  };

  /**
   * Resets everything to let the user start a new form
   */
  const handleNewForm = () => {
    setCurrentStep(1);
    setFormFiles([]);
    setRequiredDocs([]);
    setRequiredInfos([]);
    setOnlyRequiredInfos([]);
    setRequiredDocsFiles([]);
    setAdditionalInfo('');
    setMatchResults([]);
    setCheckValidity(true);
    setCheckingValidValueText('');
    setReferredLegalDocs([]);
    setRemainingInfos([]);
    setIsAllMatched(false);
  };

  // Render UI based on current step
  return (
    <div style={containerStyle} className='outlet'>
      <h2>Hoàn thiện mẫu đơn dịch vụ công</h2>

      {currentStep === 1 && (
        <div>
          <h2>Bước 1: Tải lên các file cho mẫu đơn</h2>
          <FileUpload pendingFiles={formFiles} onFilesSelected={setFormFiles} uploadingOpen={true} showUploadButton={false}/>
          <button onClick={handleInitialFormSubmit}>Tải lên &amp; Xử lý</button>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <h2>Thông tin và các văn bản/tài liệu cần</h2>
          <p>
            <strong>Documents:</strong>
          </p>
          { requiredDocs.length > 0 ? (<TextList data={requiredDocs} maxHeight={200} />) : (<p>No required documents found.</p>) }
          <p>
            <strong>Infos:</strong> 
          </p>
          { requiredInfos.length > 0 ? (<TextList data={requiredInfos} maxHeight={200} />) : (<p>No required information found.</p>) }
          <hr />
          <h3>Required Infos Only (from return_docs = false)</h3>
          <div>
          { onlyRequiredInfos.length > 0 ? (<TextList data={onlyRequiredInfos} maxHeight={250} />) : (<p>No required information found.</p>) }
          </div>
          <button onClick={() => setCurrentStep(3)} style={{marginTop: '1rem'}}>
            Proceed to Upload Required Docs
          </button>
        </div>
      )}

      {currentStep === 3 && (
        <div>
          <h2>Upload Documents Containing Required Info</h2>
          <p>
            If you have documents (e.g., CCCD, Giấy phép kinh doanh) that might
            contain the needed info, please upload them here. You can also
            provide extra text info in the text area below.
          </p>
          <FileUpload pendingFiles={requiredDocsFiles} onFilesSelected={setRequiredDocsFiles} uploadingOpen={true} showUploadButton={false}/>
          <br />
          <label>
            Additional Info (text):
            <textarea
              rows={5}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              style={{ width: '100%' }}
            />
          </label>
          <br />
          <label>
            Check Validity?{' '}
            <input
              type="checkbox"
              checked={checkValidity}
              onChange={() => setCheckValidity(!checkValidity)}
            />
          </label>
          {/* 
            NEW: A button to toggle the panel showing 
            the current required docs & infos 
          */}
          <button onClick={() => setShowDocsInfosPanel(!showDocsInfosPanel)}>
            {showDocsInfosPanel
              ? 'Hide Current Required Docs & Infos'
              : 'Show Current Required Docs & Infos'}
          </button>

          {showDocsInfosPanel && (
            <div
              style={{
                border: '1px solid #ccc',
                padding: '1rem',
                margin: '1rem 0'
              }}
            >
              <h3>Currently Required Documents</h3>
              {requiredDocs.length > 0 ? (
                <TextList data={requiredDocs} maxHeight={200} />
              ) : (
                <p>No required documents found.</p>
              )}
              <h3>Currently Required Infos</h3>
              {onlyRequiredInfos.length > 0 ? (
                <TextList data={onlyRequiredInfos} maxHeight={200} />
              ) : (
                <p>No required infos found.</p>
              )}
              <h3>Remaining Required Infos</h3>
              {remainingInfos.length > 0 ? (
                <TextList data={remainingInfos} maxHeight={200} />
              ) : (
                <p>All required infos are matched!</p>
              )}
            </div>
          )}

          <br />
          <button onClick={handleRequiredDocsSubmit}>
            Upload &amp; Match Info
          </button>
        </div>
      )}

      {currentStep === 4 && (
        <div>
          <h2>Matched Results</h2>
          {matchResults.length === 0 && <p>No matched information yet.</p>}
          <TextList data={matchResults.map((m, idx) => (
            <div
              key={idx}
              style={{ border: '1px solid #ccc', padding: '0.1rem 0.3rem', margin: '0.2rem 0' }}
            >
              <p><strong>Info:</strong> {m.info}</p>
              <p><strong>Value:</strong> {m.value}</p>
              <p><strong>Doc:</strong> {m.doc}</p>
            </div>
          ))} maxHeight={400} />

          {checkValidity && checkingValidValueText && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Validity Check:</h3>
              <Markdown>{checkingValidValueText}</Markdown>
            </div>
          )}

          {checkValidity && referredLegalDocs && referredLegalDocs.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Legal References:</h3>
              <ul>
                {referredLegalDocs.map((docTitle, i) => (
                  <li key={i}>{docTitle}</li>
                ))}
              </ul>
            </div>
          )}

          <hr />
          <h3>Remaining Required Infos</h3>
          {remainingInfos.length > 0 ? (
            <ul>
              {remainingInfos.map((info, i) => (
                <li key={i}>{info}</li>
              ))}
            </ul>
          ) : (
            <p>All required infos are matched!</p>
          )}

          {!isAllMatched && (
            <div style={{ margin: '1rem 0' }}>
              <p>
                Một số thông tin còn thiếu. Hãy tải lên các tài liệu khác hoặc cung cấp thông tin thêm.
              </p>
              <button onClick={() => setCurrentStep(3)}>Go Back</button>
            </div>
          )}

          {isAllMatched && (
            <div style={{ marginTop: '1rem' }}>
              <h2>All Required Infos Found!</h2>
              <p>
                You can now copy the info or download it as a text file to fill
                the form.
              </p>
              <button onClick={handleCopyToClipboard}>
                Sao chép vào clipboard
              </button>
              <button onClick={handleDownloadTextFile}>
                Tải xuống tập tin văn bản (.txt)
              </button>
              <br />
              <br />
              <button onClick={handleNewForm}>OK (Mẫu đơn mới)</button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CompleteForms;
