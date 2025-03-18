import { NativeBridge } from "./scripts/Modules.js"

// DOM Elements
const setupPage = document.getElementById("setup-page")
const timerPage = document.getElementById("timer-page")
const workoutForm = document.getElementById("workout-form")
const timerElement = document.getElementById("timer")
const statusElement = document.getElementById("status")
const currentSetElement = document.getElementById("current-set")
const currentRepElement = document.getElementById("current-rep")
const toggleTimerButton = document.getElementById("toggle-timer")
const skipTimerButton = document.getElementById("skip-timer")
const resetWorkoutButton = document.getElementById("reset-workout")
const activityTimeInput = document.getElementById("activity-time")
const breakTimeInput = document.getElementById("break-time")

// Workout state
const workoutConfig = {
  activityTime: 30,
  sets: 3,
  reps: 10,
  breakTime: 15,
}

const workoutState = {
  currentSet: 1,
  currentRep: 1,
  isActivity: true,
  timeRemaining: 0,
  isRunning: false,
  timerId: null,
  startTime: 0,
  pausedTimeRemaining: 0,
}

// Event Listeners
workoutForm.addEventListener("submit", startWorkout)
toggleTimerButton.addEventListener("click", toggleTimer)
skipTimerButton.addEventListener("click", skipTimer)
resetWorkoutButton.addEventListener("click", resetWorkout)

// Add input event listeners for time formatting
activityTimeInput.addEventListener("input", formatTimeInput)
breakTimeInput.addEventListener("input", formatTimeInput)

/**
  * for vibration
  */
//Vibrate
function vibrate(d){

  NativeBridge.sensors.vibrate(d)
  console.log("vibrates ",d)
}





// Format time input as user types
function formatTimeInput(e) {
  const input = e.target
  const value = input.value.replace(/\D/g, "") // Remove non-digits

  // Format as mm:ss if enough digits
  if (value.length > 2) {
    const minutes = value.slice(0, -2)
    const seconds = value.slice(-2)
    input.value = `${minutes}:${seconds}`
  }
}

// Parse time input (converts "1:30" or "130" to 90 seconds)
function parseTimeInput(value) {
  // If input contains a colon, parse as mm:ss
  if (value.includes(":")) {
    const [minutes, seconds] = value.split(":").map(Number)
    return minutes * 60 + seconds
  }
  // Otherwise, interpret as mm:ss (e.g., "130" → 1:30 → 90 seconds)
  else {
    const numValue = value.toString().padStart(3, "0")
    const minutes = Number.parseInt(numValue.slice(0, -2)) || 0
    const seconds = Number.parseInt(numValue.slice(-2)) || 0
    return minutes * 60 + seconds
  }
}

// Functions
function startWorkout(e) {
  e.preventDefault()

  // Get form values with intuitive time parsing
  workoutConfig.activityTime = parseTimeInput(document.getElementById("activity-time").value)
  workoutConfig.sets = Number.parseInt(document.getElementById("sets").value)
  workoutConfig.reps = Number.parseInt(document.getElementById("reps").value)
  workoutConfig.breakTime = parseTimeInput(document.getElementById("break-time").value)

  // Initialize workout state
  workoutState.currentSet = 1
  workoutState.currentRep = 1
  workoutState.isActivity = true
  workoutState.timeRemaining = workoutConfig.activityTime * 1000 // Convert to milliseconds
  workoutState.pausedTimeRemaining = workoutState.timeRemaining
  workoutState.isRunning = false

  // Update UI
  updateTimerDisplay()
  updateProgressDisplay()

  // Switch to timer page
  setupPage.classList.remove("active")
  timerPage.classList.add("active")
  timerPage.classList.add("activity-state")
  timerPage.classList.remove("break-state")

  statusElement.textContent = "Activity"
  toggleTimerButton.textContent = "Start"

  // Vibrate to indicate workout start
  vibrate(200)
}

function toggleTimer() {
  if (workoutState.isRunning) {
    // Pause timer
    clearInterval(workoutState.timerId)
    workoutState.isRunning = false
    workoutState.pausedTimeRemaining = workoutState.timeRemaining
    toggleTimerButton.textContent = "Resume"

    // Vibrate to indicate pause
    vibrate(100)
  } else {
    // Start/resume timer
    workoutState.isRunning = true
    toggleTimerButton.textContent = "Pause"
    workoutState.startTime = Date.now()

    // If resuming, adjust startTime to account for time already elapsed
    if (
      workoutState.pausedTimeRemaining <
      (workoutState.isActivity ? workoutConfig.activityTime : workoutConfig.breakTime) * 1000
    ) {
      const fullTime = (workoutState.isActivity ? workoutConfig.activityTime : workoutConfig.breakTime) * 1000
      workoutState.startTime = Date.now() - (fullTime - workoutState.pausedTimeRemaining)
    }

    // Vibrate to indicate start/resume
    vibrate(100)

    workoutState.timerId = setInterval(() => {
      const elapsedTime = Date.now() - workoutState.startTime
      const fullTime = (workoutState.isActivity ? workoutConfig.activityTime : workoutConfig.breakTime) * 1000
      workoutState.timeRemaining = Math.max(0, fullTime - elapsedTime)

      updateTimerDisplay()

      if (workoutState.timeRemaining <= 0) {
        clearInterval(workoutState.timerId)
        // Vibrate to indicate end of interval
        vibrate(300)
        advanceWorkout()
      }
    }, 10) // Update every 10ms for smooth millisecond display
  }
}

function skipTimer() {
  clearInterval(workoutState.timerId)
  // Vibrate to indicate skipping
  vibrate(50)
  advanceWorkout()
}

function advanceWorkout() {
  if (workoutState.isActivity) {
    // Just finished activity, move to break or next rep
    if (workoutState.currentRep < workoutConfig.reps) {
      // More reps in this set, go to break
      workoutState.isActivity = false
      workoutState.timeRemaining = workoutConfig.breakTime * 1000 // Convert to milliseconds
      workoutState.pausedTimeRemaining = workoutState.timeRemaining
      statusElement.textContent = "Break"
      timerPage.classList.remove("activity-state")
      timerPage.classList.add("break-state")
    } else if (workoutState.currentSet < workoutConfig.sets) {
      // Finished all reps in this set, go to next set
      workoutState.currentSet++
      workoutState.currentRep = 1
      workoutState.isActivity = false
      workoutState.timeRemaining = workoutConfig.breakTime * 1000 // Convert to milliseconds
      workoutState.pausedTimeRemaining = workoutState.timeRemaining
      statusElement.textContent = "Break"
      timerPage.classList.remove("activity-state")
      timerPage.classList.add("break-state")
    } else {
      // Workout complete
      completeWorkout()
      return
    }
  } else {
    // Just finished break, move to activity
    if (workoutState.currentRep < workoutConfig.reps) {
      workoutState.currentRep++
    }
    workoutState.isActivity = true
    workoutState.timeRemaining = workoutConfig.activityTime * 1000 // Convert to milliseconds
    workoutState.pausedTimeRemaining = workoutState.timeRemaining
    statusElement.textContent = "Activity"
    timerPage.classList.add("activity-state")
    timerPage.classList.remove("break-state")
  }

  // Vibrate to indicate transition
  NativeBridge.sys.vibrate(150)

  updateTimerDisplay()
  updateProgressDisplay()
  workoutState.isRunning = false
  toggleTimerButton.textContent = "Start"
}

function formatTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000)
  const seconds = Math.floor((milliseconds % 60000) / 1000)
  const ms = Math.floor((milliseconds % 1000) / 100) // Get centiseconds (1/100 of a second)

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${ms.toString().padStart(1, "0")}0`
}

function updateTimerDisplay() {
  timerElement.textContent = formatTime(workoutState.timeRemaining)
}

function updateProgressDisplay() {
  currentSetElement.textContent = `Set: ${workoutState.currentSet}/${workoutConfig.sets}`
  currentRepElement.textContent = `Rep: ${workoutState.currentRep}/${workoutConfig.reps}`
}

function resetWorkout() {
  clearInterval(workoutState.timerId)
  // Vibrate to indicate reset
  vibrate(200)
  setupPage.classList.add("active")
  timerPage.classList.remove("active")
  toggleTimerButton.style.display = "inline-block"
  skipTimerButton.style.display = "inline-block"
}

function completeWorkout() {
  clearInterval(workoutState.timerId)
  // Vibrate to indicate workout completion
  vibrate(500)
  statusElement.textContent = "Workout Complete!"
  timerElement.textContent = "🎉"
  toggleTimerButton.style.display = "none"
  skipTimerButton.style.display = "none"
}

document.addEventListener("DOMContentLoaded", () => {
  if (NativeBridge.sys.getDarkTheme()) {
    applyDarkTheme()
    console.log("dark theme")
  } else {
    applyLightTheme()
    console.log("light theme")
  }
})

function applyDarkTheme() {
  document.body.classList.add("dark-theme")

  // Update specific elements for dark theme
  const elements = document.querySelectorAll(".btn, .timer-display, .progress-info")
  elements.forEach((el) => el.classList.add("dark-theme"))

  // Update status texts for better visibility in dark mode
  statusElement.classList.add("dark-theme-text")
  currentSetElement.classList.add("dark-theme-text")
  currentRepElement.classList.add("dark-theme-text")
}
function applyLightTheme() {
  document.body.classList.remove("dark-theme")

  // Update specific elements for dark theme
  const elements = document.querySelectorAll(".btn, .timer-display, .progress-info")
  elements.forEach((el) => el.classList.remove("dark-theme"))

  // Update status texts for better visibility in dark mode
  statusElement.classList.remove("dark-theme-text")
  currentSetElement.classList.remove("dark-theme-text")
  currentRepElement.classList.remove("dark-theme-text")
}

