import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// A simple progress bar component
const ProgressBar = ({ current, total }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="progress-bar-container">
      <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
    </div>
  );
};

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
    } catch (err) { // <-- THE FIX IS HERE
      setError('Failed to generate quiz.');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleAnswerSelection = (question, selectedOption, questionIndex) => {
    if (selectedAnswers.hasOwnProperty(questionIndex)) return;

    if (selectedOption === question.answer) {
      setScore(prevScore => prevScore + 1);
    }

    setSelectedAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionIndex]: selectedOption,
    }));
  };

  const getOptionClassName = (question, option, index) => {
    const hasBeenAnswered = selectedAnswers.hasOwnProperty(index);
    if (!hasBeenAnswered) return '';
    if (option === question.answer) return 'correct';
    if (selectedAnswers[index] === option) return 'incorrect';
    return 'disabled';
  };

  const answeredQuestions = Object.keys(selectedAnswers).length;

  return (
    <div className="App">
      <div className="main-container">
        <h1>YouTube Study Tool 🚀</h1>
        <p className="subtitle">Get summaries and quizzes from any educational video.</p>
        
        <form onSubmit={handleSummarize} className="video-form">
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter YouTube URL..."
            required
          />
          <button type="submit" disabled={isLoadingSummary}>
            {isLoadingSummary ? 'Processing...' : 'Summarize'}
          </button>
        </form>

        {error && <p className="error-message">{error}</p>}

        {isLoadingSummary && <div className="loader"></div>}

        {data.summary && !isLoadingSummary && (
          <div className="results-container">
            <div className="summary-section">
              <h2>Summary</h2>
              <p>{data.summary}</p>
            </div>
            
            <div className="quiz-section-wrapper">
              {!data.quiz ? (
                <button onClick={handleGenerateQuiz} disabled={isLoadingQuiz} className="generate-quiz-button">
                  {isLoadingQuiz ? 'Generating...' : 'Generate Quiz'}
                </button>
              ) : (
                <div className="quiz-container">
                  <div className="quiz-header">
                    <h2>Knowledge Quiz</h2>
                    <div className="quiz-stats">
                      <span>Score: {score} / {data.quiz.length}</span>
                      <span>Progress: {answeredQuestions} / {data.quiz.length}</span>
                    </div>
                  </div>
                  <ProgressBar current={answeredQuestions} total={data.quiz.length} />

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
                              <span>{option}</span>
                              {hasBeenAnswered && option === q.answer && <span className="icon">✓</span>}
                              {hasBeenAnswered && selectedAnswers[index] === option && option !== q.answer && <span className="icon">✗</span>}
                            </button>
                          ))}
                        </div>
                        {hasBeenAnswered && (
                          <p className={selectedAnswers[index] === q.answer ? 'feedback-correct' : 'feedback-incorrect'}>
                            {selectedAnswers[index] === q.answer ? 'Correct!' : 'Incorrect.'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;