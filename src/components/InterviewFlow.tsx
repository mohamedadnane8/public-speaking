import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../contexts/AppContext";
import { useSessionContext } from "../contexts/SessionContext";
import { usePracticeContext } from "../contexts/PracticeContext";
import { useInterviewContext } from "../contexts/InterviewContext";
import { hasAllInterviewRatings } from "../lib/scoring";
import { InterviewHomeScreen } from "../screens/InterviewHomeScreen";
import { InterviewQuestionScreen } from "../screens/InterviewQuestionScreen";
import { InterviewThinkScreen } from "../screens/InterviewThinkScreen";
import { InterviewSpeakScreen } from "../screens/InterviewSpeakScreen";
import { InterviewPlaybackScreen } from "../screens/InterviewPlaybackScreen";
import { InterviewReflectScreen } from "../screens/InterviewReflectScreen";
import { ScoreSummaryScreen } from "../screens/ScoreSummaryScreen";

export function InterviewFlow() {
  const app = useAppContext();
  const sess = useSessionContext();
  const practice = usePracticeContext();
  const iv = useInterviewContext();
  const { t } = useTranslation();

  return (
    <>
      {app.screen === "INTERVIEW_HOME" && (
        app.isAuthenticated ? (
          <InterviewHomeScreen
            resumeState={iv.interview.resumeState}
            categories={iv.interview.categories}
            selectedCategory={iv.interview.selectedCategory}
            selectedDifficulty={iv.interview.selectedDifficulty}
            isFetchingQuestion={iv.interview.isFetchingQuestion}
            isCheckingResume={iv.isCheckingResume}
            isRecordingSupported={practice.isRecordingSupported}
            hasRecordingPermission={practice.hasRecordingPermission}
            isRequestingPermission={practice.isRequestingPermission}
            onFileSelected={iv.handleInterviewResumeUpload}
            onCategoryChange={iv.interview.setSelectedCategory}
            onDifficultyChange={iv.interview.setSelectedDifficulty}
            onRequestPermission={practice.handleRequestPermission}
            onStart={iv.handleInterviewStart}
          />
        ) : (
          <LoginPrompt title={t("interview.loginTitle")} description={t("interview.loginDescription")} onLogin={() => app.login()} />
        )
      )}

      {app.screen === "INTERVIEW_QUESTION" && iv.interview.currentQuestion && (
        <InterviewQuestionScreen
          question={iv.interview.currentQuestion}
          spinKey={iv.interviewSpinKey}
          isRevealing={iv.isInterviewRevealing}
          showActions={iv.showInterviewActions}
          onRevealComplete={iv.handleInterviewRevealComplete}
          onWordSettle={practice.playTock}
          onBegin={iv.handleInterviewBegin}
          onSpinAgain={iv.handleInterviewSpinAgain}
        />
      )}

      {app.screen === "INTERVIEW_THINK" && iv.interview.currentQuestion && (
        <InterviewThinkScreen
          question={iv.interview.currentQuestion.question}
          seconds={iv.interviewThinkTimer.seconds}
          totalSeconds={iv.interviewThinkSeconds}
          onSkip={iv.transitionToInterviewSpeak}
        />
      )}

      {app.screen === "INTERVIEW_SPEAK" && iv.interview.currentQuestion && (
        <InterviewSpeakScreen
          question={iv.interview.currentQuestion.question}
          seconds={iv.interviewSpeakTimer.seconds}
          totalSeconds={iv.interviewAnswerSeconds}
          isRecording={sess.isRecording}
          audio={sess.audio}
        />
      )}

      {app.screen === "INTERVIEW_PLAYBACK" && iv.interview.currentQuestion && (
        <InterviewPlaybackScreen
          question={iv.interview.currentQuestion.question}
          category={iv.interview.currentQuestion.category}
          audio={sess.audio}
          transcript={sess.session?.transcript ?? undefined}
          isPlaying={app.isPlaying}
          currentTime={app.currentTime}
          duration={app.duration}
          onPlayToggle={() => app.handlePlayToggle(sess.audio?.fileUri)}
          onSeek={app.handleSeek}
          onSkipBackward={app.handleSkipBackward}
          onSkipForward={app.handleSkipForward}
          onContinue={() => {
            if (app.isPlaying) {
              app.audioRef.current?.pause();
              app.setIsPlaying(false);
            }
            app.setScreen("INTERVIEW_REFLECT");
          }}
        />
      )}

      {app.screen === "INTERVIEW_REFLECT" && (
        <InterviewReflectScreen
          ratings={iv.interviewRatings}
          notes={iv.interviewNotes}
          canComplete={hasAllInterviewRatings(iv.interviewRatings)}
          onRateChange={iv.handleInterviewRateChange}
          onNotesChange={iv.setInterviewNotes}
          onDone={iv.handleInterviewDoneRating}
        />
      )}

      {app.screen === "INTERVIEW_SCORE" && iv.interviewScore !== null && (
        <ScoreSummaryScreen
          overallScore={iv.interviewScore}
          audio={sess.audio}
          advice={null}
          isSaving={false}
          isSaved={!!sess.savedServerSessionId}
          isAuthenticated={app.isAuthenticated}
          user={app.user}
          sessionId={sess.savedServerSessionId}
          sessionType="Interview"
          speechAnalysis={sess.savedSpeechAnalysis}
          transcriptionStatus={sess.transcriptionPolling.transcriptionStatus}
          isPollingTranscription={sess.transcriptionPolling.isPolling}
          isPlaying={app.isPlaying}
          currentTime={app.currentTime}
          duration={app.duration}
          onPlayToggle={() => app.handlePlayToggle(sess.audio?.fileUri)}
          onSeek={app.handleSeek}
          onSkipBackward={app.handleSkipBackward}
          onSkipForward={app.handleSkipForward}
          onNewSession={iv.handleInterviewNextQuestion}
          onSaveAndGetAdvice={() => {}}
        />
      )}
    </>
  );
}

// ─── Shared login prompt ────────────────────────────────────────

function LoginPrompt({ title, description, onLogin }: { title: string; description: string; onLogin: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      key={`${title}-login`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-screen w-full px-4 pt-16 flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <h1
          className="text-4xl text-[#1a1a1a]"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 500 }}
        >
          {title}
        </h1>
        <p
          className="text-sm text-[#1a1a1a]/55 max-w-sm"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {description}
        </p>
        <button
          onClick={onLogin}
          className="px-8 py-3 border border-[#1a1a1a]/60 text-[#1a1a1a] text-xs tracking-[0.25em] uppercase transition-all duration-300 hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDF6F0]"
          style={{ fontFamily: '"Inter", sans-serif', fontWeight: 400 }}
        >
          {t("nav.login")}
        </button>
      </div>
    </motion.div>
  );
}
