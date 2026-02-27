Impromptu Speaking App — Functional Specification

A minimalist impromptu speaking training app designed with an editorial, high-whitespace aesthetic.

This document defines the functional architecture for:
	•	Mode selector
	•	Audio recording (auto during Speak)
	•	Playback screen
	•	Reflect (self-rating)
	•	Overall score calculation
	•	Lightweight session persistence

Design principles:
	•	No gamification
	•	No dashboards
	•	No clutter
	•	One primary action per screen
	•	Calm, intentional flow

⸻

1. Screen Flow (Ordered)

1. Home
	•	Displays:
	•	THINK duration
	•	SPEAK duration
	•	Mode selector (cycling text)
	•	Small “Trains: …” descriptor
	•	Primary action: Spin

⸻

2. Word Reveal
	•	Displays:
	•	Generated word
	•	Current mode (subtle)
	•	Primary action: Start
	•	Secondary action: Spin Again

⸻

3. Think
	•	Countdown using mode-specific think duration
	•	Auto-transitions to Speak when finished
	•	Optional: Cancel

⸻

4. Speak (Auto-record)
	•	Countdown using mode-specific speak duration
	•	Recording starts automatically when Speak begins
	•	Recording stops automatically when timer ends
	•	Auto-transition to Playback

⸻

5. Session Complete (Playback)
	•	Shows:
	•	Word
	•	Mode
	•	Primary action: Play / Pause
	•	Secondary action: Continue
	•	If recording unavailable: show message but allow Continue

⸻

6. Reflect

User rates:
	•	Opening
	•	Structure
	•	Ending
	•	Confidence

Primary action: Done

⸻

7. Score Summary
	•	Displays overall score (0–10, 1 decimal)
	•	Primary action: New Session
	•	Secondary action: Replay Recording

⸻

2. State Machine (Text Description)

States:

IDLE (Home)
  └── SPIN → WORD_READY

WORD_READY
  ├── SPIN_AGAIN → WORD_READY
  └── START → THINKING

THINKING
  ├── THINK_FINISH → SPEAKING
  └── CANCEL → IDLE

SPEAKING
  ├── SPEAK_FINISH → PLAYBACK
  └── CANCEL → CANCELLED

PLAYBACK
  ├── PLAY/PAUSE (internal toggle)
  └── CONTINUE → REFLECTING

REFLECTING
  └── DONE → SCORE_SUMMARY

SCORE_SUMMARY
  ├── NEW_SESSION → IDLE
  └── REPLAY → playback toggle


  3. Session Data Model

  type Mode = 
  | "EXPLANATION"
  | "STORY"
  | "DEBATE"
  | "ELEVATOR"
  | "SPEED"

type RatingValue = 1 | 2 | 3 | 4 | 5

interface Session {
  id: string
  createdAt: string
  completedAt?: string

  mode: Mode
  word: string

  thinkSeconds: number
  speakSeconds: number

  status: "COMPLETED" | "CANCELLED" | "FAILED"
  cancelReason?: 
    | "USER_BACK"
    | "APP_BACKGROUND"
    | "ERROR"
    | "PERMISSION_DENIED"
    | "AUDIO_INTERRUPTED"

  ratings?: {
    opening: RatingValue
    structure: RatingValue
    ending: RatingValue
    confidence: RatingValue
  }

  overallScore?: number

  audio?: {
    available: boolean
    fileUri?: string
    durationMs?: number
    recordingStartedAt?: string
    recordingEndedAt?: string
    errorCode?: 
      | "MIC_PERMISSION"
      | "REC_START_FAIL"
      | "REC_STOP_FAIL"
      | "INTERRUPTED"
      | "NO_AUDIO"
      | "UNKNOWN"
  }
}

Mode configuration 
Mode
Think (s)
Speak (s)
EXPLANATION
30
60
STORY
30
60
DEBATE
20
60
ELEVATOR
15
45
SPEED
10
45
DEFAULT
30 
60

Home screen must always reflect the selected mode’s timing.

Mode cannot change once a session has started.


5. Audio Lifecycle

Permission Strategy
	•	Request microphone permission when user taps Start for the first time.
	•	If denied:
	•	Continue session without recording.
	•	Mark audio.available = false.

⸻

Recording Start

On entering SPEAKING state:
	1.	Initialize recorder
	2.	Start recording
	3.	If successful:
	•	audio.available = true
	4.	If failure:
	•	audio.available = false
	•	Set errorCode = REC_START_FAIL

⸻

Recording Stop

On SPEAK_FINISH:
	1.	Stop recording
	2.	Save file
	3.	Store:
	•	fileUri
	•	duration
	•	timestamps

If stop fails:
	•	Mark audio.available = false
	•	Set errorCode = REC_STOP_FAIL

⸻

Playback
	•	Load audio from fileUri
	•	Toggle play/pause
	•	If file missing/corrupt:
	•	Show “Recording unavailable”
	•	Allow Continue

⸻

6. Overall Score Calculation

Each rating is 1–5.

Convert each to 0–10 scale

converted = (rating / 5) * 10

Overall score:

overallScore = average(converted ratings)

Round to one decimal.

Example:

Opening: 4
Structure: 3
Ending: 5
Confidence: 4

Converted: 8, 6, 10, 8
Average = 8.0


7. Edge Cases

Permissions
	•	Permission denied → session continues without recording.
	•	Permission dismissed → treat as denied.

⸻

Navigation
	•	Back during Think → cancel session.
	•	Back during Speak → stop recording → cancel session.

⸻

App Lifecycle
	•	App backgrounded during Think → cancel session.
	•	App backgrounded during Speak → stop recording → mark FAILED or CANCELLED.
	•	App killed mid-session → mark FAILED on next launch.

⸻

Audio Errors
	•	Start failure → no recording saved.
	•	Stop failure → discard audio.
	•	Interruption (call, system audio) → stop recording, mark unavailable.

⸻

Ratings
	•	Require all 4 ratings before allowing Done.
	•	No auto-fill defaults.

⸻

Storage
	•	Persist locally.
	•	Optional: keep only last N sessions to avoid storage overflow.

⸻

8. Minimal Screen API (Conceptual)

Home

Inputs:
	•	selectedMode

Events:
	•	onModeCycle()
	•	onSpin()

⸻

Word Reveal

Inputs:
	•	sessionId
	•	word
	•	mode

Events:
	•	onSpinAgain()
	•	onStart()

⸻

Think

Inputs:
	•	sessionId
	•	thinkSeconds

Events:
	•	onFinish()
	•	onCancel()

⸻

Speak

Inputs:
	•	sessionId
	•	speakSeconds

Events:
	•	onFinish()
	•	onCancel()

⸻

Playback

Inputs:
	•	sessionId
	•	audio

Events:
	•	onPlayToggle()
	•	onContinue()

⸻

Reflect

Inputs:
	•	sessionId

Events:
	•	onRateChange(criteria, value)
	•	onDone()

⸻

Score Summary

Inputs:
	•	sessionId
	•	overallScore

Events:
	•	onNewSession()
	•	onReplay()

⸻

Core Philosophy

This is not a gamified speaking app.

It is a disciplined speaking practice environment.
	•	Structured
	•	Intentional
	•	Reflective
	•	Minimal

The system must remain restrained.

No dashboards.
No badges.
No streak fireworks.

Just practice → reflection → reset.