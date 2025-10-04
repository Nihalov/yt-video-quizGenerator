import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';

// ProgressBar component remains the same...
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

    const isLoading = isLoadingSummary || isLoadingQuiz;

    // --- Summarize Handler ---
    const handleSummarize = async () => {
        if (!videoUrl) {
            setError('Please enter a YouTube URL.');
            return;
        }
        setError('');
        setData(prev => ({ transcript: prev.transcript, summary: '', quiz: null }));
        setSelectedAnswers({});
        setScore(0);
        setIsLoadingSummary(true);

        try {
            let transcript = data.transcript;

            // Only fetch transcript if not already available
            if (!transcript) {
                const transcriptResponse = await axios.post('http://localhost:8000/api/transcribe/', {
                    video_url: videoUrl,
                });
                transcript = transcriptResponse.data.transcript;
            }

            // Call summarize API (sending transcript directly)
            const response = await axios.post('http://localhost:8000/api/summarize/', {
                transcript: transcript,
            });

            setData({ transcript, summary: response.data.summary, quiz: null });
        } catch (err) {
            setError('Failed to generate summary.');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    // --- Quiz Handler ---
    const handleGenerateQuiz = async () => {
        if (!videoUrl) {
            setError('Please enter a YouTube URL.');
            return;
        }
        setError('');
        setData(prev => ({ transcript: prev.transcript, summary: '', quiz: null }));
        setSelectedAnswers({});
        setScore(0);
        setIsLoadingQuiz(true);

        try {
            let transcript = data.transcript;

            // Only fetch transcript if not already available
            if (!transcript) {
                const transcriptResponse = await axios.post('http://localhost:8000/api/transcribe/', {
                    video_url: videoUrl,
                });
                transcript = transcriptResponse.data.transcript;
            }

            // Generate quiz using transcript
            const quizResponse = await axios.post('http://localhost:8000/api/quiz/', {
                transcript: transcript,
            });

            setData(prevData => ({ ...prevData, transcript, quiz: quizResponse.data.quiz }));
        } catch (err) {
            setError('Failed to generate quiz.');
        } finally {
            setIsLoadingQuiz(false);
        }
    };

    // --- Answer selection logic ---
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

                <div className="video-input-and-buttons">
                    <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Enter YouTube URL..."
                        required
                        disabled={isLoading}
                    />
                    <button onClick={handleSummarize} disabled={isLoading || !videoUrl}>
                        {isLoadingSummary ? 'Summarizing...' : 'Summarize'}
                    </button>
                    <button onClick={handleGenerateQuiz} disabled={isLoading || !videoUrl}>
                        {isLoadingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
                    </button>
                </div>

                {error && <p className="error-message">{error}</p>}

                {isLoading && <p className="loading-text">{isLoadingSummary ? "Generating summary..." : "Generating quiz..."}</p>}

                {(!isLoading && (data.summary || data.quiz)) && (
                    <div className="results-container">
                        {data.summary && (
                            <div className="summary-section">
                                <h2>Summary</h2>
                                <ReactMarkdown>{data.summary}</ReactMarkdown>
                            </div>
                        )}

                        {data.quiz && (
                            <div className="quiz-section-wrapper">
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
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
