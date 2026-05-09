import React, { useRef, useState } from 'react';

// If you use react-webcam, install it: npm install react-webcam
// import Webcam from 'react-webcam';

const ScanFood = ({ onResult }) => {
  const fileInputRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // For camera capture (optional, if you want webcam support)
  // const webcamRef = useRef(null);

  // const capture = React.useCallback(() => {
  //   const imageSrc = webcamRef.current.getScreenshot();
  //   // Convert base64 to blob and call handleImageUpload
  // }, [webcamRef]);

  const handleImageUpload = async (e) => {
    setError('');
    setResult(null);
    setLoading(true);
    let file;
    if (e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    } else {
      setError('No file selected');
      setLoading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('http://localhost:5000/api/scan-food', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.detected_items);
        if (onResult) onResult(data.detected_items);
      } else {
        setError(data.detail || 'Scan failed');
      }
    } catch (err) {
      setError('Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block font-bold mb-2">Scan Food Item (Upload Image)</label>
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="mb-2" />
      {/* Optional: Camera capture UI with react-webcam */}
      {/* <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={capture}>Capture & Scan</button> */}
      {loading && <div>Scanning...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <div>
          <h4 className="font-bold">Detected Items:</h4>
          <ul>
            {result.map((item, idx) => (
              <li key={idx}>{item.name} (Confidence: {(item.confidence * 100).toFixed(1)}%) - Rs.{item.price}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScanFood;
