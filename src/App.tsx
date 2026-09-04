import { useState } from 'react';
import { Lives } from './components/Lives';
import { NamePrompt } from './components/NamePrompt';
import { QuestionCard } from './components/QuestionCard';
import { ResultsScreen } from './components/ResultsScreen';
import { ScoreBar } from './components/ScoreBar';
import { StartScreen } from './components/StartScreen';
import { Timer } from './components/Timer';
import { useQuiz } from './hooks/useQuiz';
import { clearPlayerName, getPlayerName, setPlayerName } from './quiz/session';
import type { QuizState } from './quiz/types';

export default function App() {
  const { state, savedSession, startQuiz, startPractice, selectAnswer, nextQuestion, retryQuestion, backToStart, resumeQuiz } = useQuiz();
  const [playerName, setPlayerNameState] = useState<string | null>(() => getPlayerName());

  const handleNameSubmit = (name: string) => {
    setPlayerName(name);
    setPlayerNameState(name);
  };

  const handleChangeName = () => {
    clearPlayerName();
    setPlayerNameState(null);
  };

  return (
    <div className="app">
      <main className="app__main">
        {state.phase === 'loading' && (
          <div className="loading">
            <div className="loading__spinner" />
            <p>Loading question bank…</p>
          </div>
        )}

        {state.phase === 'start' && !playerName && (
          <NamePrompt onSubmit={handleNameSubmit} />
        )}

        {state.phase === 'start' && playerName && (
          <StartScreen
            playerName={playerName}
            curatedLoaded={state.curatedLoaded}
            savedSession={savedSession}
            onStart={startQuiz}
            onPractice={startPractice}
            onResume={resumeQuiz}
            onChangeName={handleChangeName}
          />
        )}

        {state.phase === 'results' && (
          <ResultsScreen state={state} playerName={playerName} onRestart={backToStart} />
        )}

        {state.phase === 'playing' && (
          <PlayingScreen
            state={state}
            onSelect={selectAnswer}
            onNext={nextQuestion}
            onRetry={retryQuestion}
            onQuit={backToStart}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Developed by: NeuralWeb Solutions, Goa — 2026</p>
        <p className="app-footer__tagline"><em>Fully AI-Assisted Work</em></p>
      </footer>
    </div>
  );
}

function PlayingScreen({
  state,
  onSelect,
  onNext,
  onRetry,
  onQuit,
}: {
  state: QuizState;
  onSelect: (index: number) => void;
  onNext: () => void;
  onRetry: () => void;
  onQuit: () => void;
}) {
  const currentQ = state.questions[state.currentIndex];
  if (!currentQ) {
    return (
      <div className="loading">
        <p>No questions available. Go back and try again.</p>
        <button className="restart-btn" onClick={onQuit}>Back</button>
      </div>
    );
  }

  const isLast = state.currentIndex + 1 >= state.questions.length;
  const outOfLives = state.lives <= 0;

  return (
    <div className="game-screen">
      <div className="game-screen__hud">
        <ScoreBar state={state} />
        <div className="hud-right">
          {state.config.practice ? (
            <span className="practice-badge">Practice — no lives lost</span>
          ) : (
            <Lives lives={state.lives} maxLives={state.maxLives} />
          )}
          {!state.answered && (
            <Timer timeLeft={state.timeLeft} timeLimit={state.timeLimit} />
          )}
          <button className="quit-btn" onClick={onQuit} type="button">
            Quit
          </button>
        </div>
      </div>

      <QuestionCard
        key={currentQ.id}
        question={currentQ}
        selectedAnswer={state.selectedAnswer}
        answered={state.answered}
        practice={!!state.config.practice}
        onSelect={onSelect}
        onNext={onNext}
        onRetry={onRetry}
        isLast={isLast}
        outOfLives={outOfLives}
      />
    </div>
  );
}
