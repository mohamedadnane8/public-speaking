import { useEffect, useMemo } from "react";
import { useAppContext } from "../contexts/AppContext";
import { useSessionContext } from "../contexts/SessionContext";
import { usePracticeContext } from "../contexts/PracticeContext";
import { hasAllRatings } from "../lib/scoring";
import { HomeScreen } from "../screens/HomeScreen";
import { WordRevealScreen } from "../screens/WordRevealScreen";
import { ThinkScreen } from "../screens/ThinkScreen";
import { SpeakScreen } from "../screens/SpeakScreen";
import { PlaybackScreen } from "../screens/PlaybackScreen";
import { ReflectScreen } from "../screens/ReflectScreen";
import { ScoreSummaryScreen } from "../screens/ScoreSummaryScreen";

export function GeneralFlow() {
  const app = useAppContext();
  const sess = useSessionContext();
  const practice = usePracticeContext();
  const { screen, prepareAudio } = app;

  // Find previous completed General session for chart comparison
  const previousGeneralRatings = useMemo(() => {
    const currentId = sess.session?.id;
    const all = sess.historySessions;
    for (const s of all) {
      if (s.id !== currentId && s.status === "COMPLETED" && s.ratings && s.type !== "Interview") {
        return s.ratings;
      }
    }
    return undefined;
  }, [sess.historySessions, sess.session?.id]);

  useEffect(() => {
    if ((screen === "PLAYBACK" || screen === "SCORE_SUMMARY") && sess.audio?.fileUri) {
      prepareAudio(sess.audio.fileUri);
    }
  }, [screen, prepareAudio, sess.audio?.fileUri]);

  return (
    <>
      {app.screen === "HOME" && (
        <HomeScreen
          modeConfig={practice.modeConfig}
          manualThinkSeconds={practice.manualThinkSeconds}
          manualSpeakSeconds={practice.manualSpeakSeconds}
          selectedLanguage={practice.selectedLanguage}
          selectedDifficulty={practice.selectedDifficulty}
          isRecordingSupported={practice.isRecordingSupported}
          hasRecordingPermission={practice.hasRecordingPermission}
          isRequestingPermission={practice.isRequestingPermission}
          onModeCycle={practice.handleModeCycle}
          onLanguageChange={practice.handleLanguageChange}
          onDifficultyChange={practice.handleDifficultyChange}
          onManualTimeChange={practice.handleManualTimeChange}
          onRequestPermission={practice.handleRequestPermission}
          onRecheckPermission={practice.handleRecheckPermission}
          onSpin={practice.handleSpin}
        />
      )}

      {app.screen === "WORD_REVEAL" && (
        <WordRevealScreen
          word={practice.currentWord}
          language={practice.selectedLanguage}
          modeConfig={practice.modeConfig}
          spinKey={practice.spinKey}
          isRevealing={practice.isRevealing}
          showActions={practice.showWordActions}
          onRevealComplete={practice.handleRevealComplete}
          onLetterSettle={practice.playTock}
          onSpinAgain={practice.handleSpin}
          onStart={practice.handleStartSession}
        />
      )}

      {app.screen === "THINK" && (
        <ThinkScreen
          word={practice.currentWord}
          seconds={practice.thinkTimer.seconds}
          totalSeconds={practice.effectiveThinkSeconds}
          onSkip={practice.transitionToSpeak}
        />
      )}

      {app.screen === "SPEAK" && (
        <SpeakScreen
          word={practice.currentWord}
          seconds={practice.speakTimer.seconds}
          totalSeconds={practice.effectiveSpeakSeconds}
          isRecording={sess.isRecording}
          audio={sess.audio}
        />
      )}

      {app.screen === "PLAYBACK" && (
        <PlaybackScreen
          word={practice.currentWord}
          modeConfig={practice.modeConfig}
          audio={sess.audio}
          transcript={sess.session?.transcript ?? undefined}
          isPlaying={app.isPlaying}
          currentTime={app.currentTime}
          duration={app.duration}
          playbackError={app.playbackError}
          onPlayToggle={() => app.handlePlayToggle(sess.audio?.fileUri)}
          onSeek={app.handleSeek}
          onSkipBackward={app.handleSkipBackward}
          onSkipForward={app.handleSkipForward}
          onContinue={() => {
            if (app.isPlaying) {
              app.audioRef.current?.pause();
              app.setIsPlaying(false);
            }
            app.setScreen("REFLECT");
          }}
        />
      )}

      {app.screen === "REFLECT" && (
        <ReflectScreen
          ratings={practice.ratings}
          notes={practice.notes}
          canComplete={hasAllRatings(practice.ratings)}
          onRateChange={practice.handleRateChange}
          onNotesChange={practice.setNotes}
          onDone={practice.handleDoneRating}
        />
      )}

      {app.screen === "SCORE_SUMMARY" && sess.session?.overallScore !== undefined && (
        <ScoreSummaryScreen
          overallScore={sess.session.overallScore}
          audio={sess.audio}
          advice={sess.session.advice ?? null}
          isSaving={sess.isSaving}
          isSaved={sess.savedSessionId === sess.session.id}
          isAuthenticated={app.isAuthenticated}
          user={app.user}
          sessionId={sess.savedServerSessionId}
          sessionType="General"
          speechAnalysis={sess.savedSpeechAnalysis}
          transcriptionStatus={sess.transcriptionPolling.transcriptionStatus}
          isPollingTranscription={sess.transcriptionPolling.isPolling}
          transcript={sess.session?.transcript ?? sess.transcriptionPolling.transcript ?? undefined}
          ratings={sess.session?.ratings}
          previousRatings={previousGeneralRatings}
          isPlaying={app.isPlaying}
          currentTime={app.currentTime}
          duration={app.duration}
          playbackError={app.playbackError}
          onPlayToggle={() => app.handlePlayToggle(sess.audio?.fileUri)}
          onSeek={app.handleSeek}
          onSkipBackward={app.handleSkipBackward}
          onSkipForward={app.handleSkipForward}
          onNewSession={practice.handleNewSession}
          onSaveAndGetAdvice={async () => {
            if (!sess.session) return;
            await sess.saveSessionAndGetAdvice(sess.session, { loginIfUnauthenticated: true, showToast: true });
          }}
        />
      )}
    </>
  );
}
