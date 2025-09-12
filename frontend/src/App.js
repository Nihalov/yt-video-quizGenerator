// frontend/src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [data, setData] = useState({ transcript: '', summary: '', quiz: null });
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleSummarize = async (e) => {
    e.preventDefault();
    setError('');
    setData({ transcript: '', summary: '', quiz: null });
    setSelectedAnswers({});
    setShowResults(false);
    setIsLoadingSummary(true);

    try {
      const response = await axios.post('http://localhost:8000/api/summarize/', {
        video_url: videoUrl,
      });
      setData({ ...data, transcript: response.data.transcript, summary: response.data.summary });
    } catch (err) {
      setError('Failed to generate summary. Please check the URL and try again.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsLoadingQuiz(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:8000/api/quiz/', {
        transcript: data.transcript,
      });
      setData({ ...data, quiz: response.data.quiz });
    } catch (err) {
      setError('Failed to generate quiz.');
    } finally {
      setIsLoadingQuiz(false);
    }
  };
  
  const getOptionClassName = (question, option, index) => {
    if (!showResults) return selectedAnswers[index] === option ? 'selected' : '';
    if (option === question.answer) return 'correct';
    if (selectedAnswers[index] === option) return 'incorrect';
    return '';
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>YouTube Video Summarizer & Quiz Generator 🚀</h1>
        <form onSubmit={handleSummarize} className="video-form">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter YouTube URL..."
            required
          />
          <button type="submit" disabled={isLoadingSummary}>
            {isLoadingSummary ? 'Summarizing...' : 'Summarize'}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        {data.summary && (
          <div className="results-container">
            <h2>Summary</h2>
            <p className="summary-text">{data.summary}</p>
            
            {/* Quiz Section */}
            <div className="quiz-container">
              {!data.quiz ? (
                <button onClick={handleGenerateQuiz} disabled={isLoadingQuiz} className="generate-quiz-button">
                  {isLoadingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
                </button>
              ) : (
                <>
                  <h2>Test Your Knowledge</h2>
                  {data.quiz.map((q, index) => (
                    <div key={index} className="question-block">
                      <p className="question-text">{index + 1}. {q.question}</p>
                      <div className="options-list">
                        {q.options.map((option, optIndex) => (
                          <button
                            key={optIndex}
                            className={`option-button ${getOptionClassName(q, option, index)}`}
                            onClick={() => !showResults && setSelectedAnswers({...selectedAnswers, [index]: option})}
                            disabled={showResults}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!showResults && (
                     <button className="submit-quiz-button" onClick={() => setShowResults(true)}>Check Answers</button>
                  )}
                </>
              )}
            </div>

            <h2>Full Transcript</h2>
            <p className="transcript-text">{data.transcript}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;