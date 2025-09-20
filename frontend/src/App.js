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
  const [score, setScore] = useState(0);

  const handleSummarize = async (e) => {
    e.preventDefault();
    setError('');
    setData({ transcript: '', summary: '', quiz: null });
    setSelectedAnswers({});
    setScore(0);
    setIsLoadingSummary(true);

    try {
      const response = await axios.post('http://localhost:8000/api/summarize/', {
        video_url: videoUrl,
      });
      // Correct way to update state to not lose the quiz part later
      setData(prevData => ({ ...prevData, transcript: response.data.transcript, summary: response.data.summary }));
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
      setData(prevData => ({ ...prevData, quiz: response.data.quiz }));
    } catch (err) {
      setError('Failed to generate quiz.');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // --- NEW LOGIC FOR INSTANT FEEDBACK ---
  const handleAnswerSelection = (question, selectedOption, questionIndex) => {
    // Prevent changing the answer after it has been selected
    if (selectedAnswers.hasOwnProperty(questionIndex)) {
      return;
    }

    // Check if the selected answer is correct and update the score
    if (selectedOption === question.answer) {
      setScore(prevScore => prevScore + 1);
    }

    // Store the selected answer
    setSelectedAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionIndex]: selectedOption,
    }));
  };

  const getOptionClassName = (question, option, index) => {
    const hasBeenAnswered = selectedAnswers.hasOwnProperty(index);
    if (!hasBeenAnswered) return ''; // No selection yet
    
    if (option === question.answer) return 'correct'; // Always show correct answer in green
    if (selectedAnswers[index] === option) return 'incorrect'; // If this wrong option was selected, show red
    
    return 'disabled'; // For other wrong options
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
            
            <div className="quiz-container">
              {!data.quiz ? (
                <button onClick={handleGenerateQuiz} disabled={isLoadingQuiz} className="generate-quiz-button">
                  {isLoadingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
                </button>
              ) : (
                <>
                  <h2>Test Your Knowledge</h2>
                  <div className="score-container">
                    <h3>Score: {score} / {data.quiz.length}</h3>
                  </div>

                  {data.quiz.map((q, index) => {
                    const hasBeenAnswered = selectedAnswers.hasOwnProperty(index);
                    return (
                      <div key={index} className="question-block">
                        <p className="question-text">{index + 1}. {q.question}</p>
                        <div className="options-list">
                          {q.options.map((option, optIndex) => (
                            <button
                              key={optIndex}
                              className={`option-button ${getOptionClassName(q, option, index)}`}
                              onClick={() => handleAnswerSelection(q, option, index)}
                              disabled={hasBeenAnswered}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {/* --- NEW: Instant feedback text --- */}
                        {hasBeenAnswered && (
                          <p className={selectedAnswers[index] === q.answer ? 'feedback-correct' : 'feedback-incorrect'}>
                            {selectedAnswers[index] === q.answer ? 'Correct!' : 'Incorrect.'}
                          </p>
                        )}
                      </div>
                    );
                  })}
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