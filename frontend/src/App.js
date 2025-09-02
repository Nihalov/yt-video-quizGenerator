// frontend/src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/summarize/', {
        video_url: videoUrl,
      });
      setResult(response.data);
    } catch (err) {
      setError('Failed to process the video. Please check the URL and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>YouTube Video Summarizer 🚀</h1>
        <p>Enter a YouTube video URL to get its transcript and a concise summary.</p>
        <form onSubmit={handleSubmit} className="video-form">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter YouTube URL..."
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Summarize'}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        {result && (
          <div className="results-container">
            <h2>Summary</h2>
            <p className="summary-text">{result.summary}</p>

            <h2>Full Transcript</h2>
            <p className="transcript-text">{result.transcript}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;