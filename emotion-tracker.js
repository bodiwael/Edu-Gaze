// EduGaze Emotion Tracking System
// Integrated AI-powered emotion and engagement tracking

class EmotionTracker {
  constructor() {
    this.model = null;
    this.video = document.getElementById('videoElement');
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    // Session tracking
    this.sessionStartTime = Date.now();
    this.frameCount = 0;
    this.blinkCount = 0;
    this.sleepTimeSeconds = 0;
    this.isSleeping = false;
    this.sleepStartTime = null;
    
    // Emotion tracking
    this.emotions = {
      smile: 0,
      happy: 0,
      surprised: 0,
      confused: 0,
      focused: 0
    };
    
    // History for smoothing and reporting
    this.emotionHistory = {
      smile: [],
      happy: [],
      surprised: [],
      confused: [],
      focused: []
    };
    
    // Baselines for adaptive detection
    this.baselines = {
      earBaseline: null,
      mouthWidthBaseline: null,
      eyeDistanceBaseline: null,
      browDistanceBaseline: null
    };
    
    // Sleep detection
    this.earHistory = [];
    this.sleepFrameCount = 0;
    this.wakeFrameCount = 0;
    
    this.isRunning = false;
    this.animationId = null;
  }

  async init() {
    try {
      // Show loading alert
      const loadingAlert = document.getElementById('loadingAlert');
      const readyAlert = document.getElementById('readyAlert');
      
      // Initialize webcam
      await this.setupCamera();
      
      // Load face detection model
      await this.loadModel();
      
      // Hide loading, show ready
      if (loadingAlert) loadingAlert.style.display = 'none';
      if (readyAlert) readyAlert.style.display = 'block';
      
      // Start tracking
      this.start();
      
      console.log('✓ EduGaze initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      alert('Failed to initialize camera or AI model. Please check permissions.');
    }
  }

  async setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });

    this.video.srcObject = stream;
    
    return new Promise((resolve) => {
      this.video.onloadedmetadata = () => {
        resolve(this.video);
      };
    });
  }

  async loadModel() {
    this.model = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      {
        runtime: 'tfjs',
        maxFaces: 1,
        refineLandmarks: true
      }
    );
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sessionStartTime = Date.now();
    this.detectFrame();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
    }
  }

  async detectFrame() {
    if (!this.isRunning) return;

    const predictions = await this.model.estimateFaces(this.video);

    if (predictions.length > 0) {
      const face = predictions[0];
      this.processFace(face);
    }

    this.frameCount++;
    this.updateUI();

    this.animationId = requestAnimationFrame(() => this.detectFrame());
  }

  processFace(face) {
    const landmarks = face.keypoints;

    // Calculate baselines (first 30 frames = 1 second)
    if (this.frameCount < 30) {
      this.calculateBaselines(landmarks);
    }

    // Detect sleep
    this.detectSleep(landmarks);

    // Detect emotions
    this.detectEmotions(landmarks);

    // Detect blinks
    this.detectBlink(landmarks);
  }

  calculateBaselines(landmarks) {
    // Calculate Eye Aspect Ratio baseline
    const ear = this.calculateEAR(landmarks);
    if (ear > 0) {
      if (!this.baselines.earBaseline) {
        this.baselines.earBaseline = ear;
      } else {
        this.baselines.earBaseline = (this.baselines.earBaseline * 0.9) + (ear * 0.1);
      }
    }

    // Calculate mouth width baseline
    const mouthWidth = this.getDistance(landmarks[61], landmarks[291]);
    if (!this.baselines.mouthWidthBaseline) {
      this.baselines.mouthWidthBaseline = mouthWidth;
    } else {
      this.baselines.mouthWidthBaseline = (this.baselines.mouthWidthBaseline * 0.9) + (mouthWidth * 0.1);
    }

    // Calculate eye distance baseline
    const eyeDistance = this.getDistance(landmarks[33], landmarks[263]);
    if (!this.baselines.eyeDistanceBaseline) {
      this.baselines.eyeDistanceBaseline = eyeDistance;
    }

    // Calculate brow distance baseline
    const browDistance = this.getDistance(landmarks[107], landmarks[336]);
    if (!this.baselines.browDistanceBaseline) {
      this.baselines.browDistanceBaseline = browDistance;
    }
  }

  calculateEAR(landmarks) {
    // Eye Aspect Ratio for sleep detection
    // Left eye
    const leftEyeVertical1 = this.getDistance(landmarks[159], landmarks[145]);
    const leftEyeVertical2 = this.getDistance(landmarks[158], landmarks[153]);
    const leftEyeHorizontal = this.getDistance(landmarks[33], landmarks[133]);
    
    // Right eye
    const rightEyeVertical1 = this.getDistance(landmarks[386], landmarks[374]);
    const rightEyeVertical2 = this.getDistance(landmarks[385], landmarks[380]);
    const rightEyeHorizontal = this.getDistance(landmarks[263], landmarks[362]);
    
    const leftEAR = (leftEyeVertical1 + leftEyeVertical2) / (2.0 * leftEyeHorizontal);
    const rightEAR = (rightEyeVertical1 + rightEyeVertical2) / (2.0 * rightEyeHorizontal);
    
    return (leftEAR + rightEAR) / 2.0;
  }

  detectSleep(landmarks) {
    const ear = this.calculateEAR(landmarks);
    
    // Store EAR history
    this.earHistory.push(ear);
    if (this.earHistory.length > 10) {
      this.earHistory.shift();
    }

    // Calculate average EAR
    const avgEAR = this.earHistory.reduce((a, b) => a + b, 0) / this.earHistory.length;

    // Adaptive threshold
    const sleepThreshold = this.baselines.earBaseline ? this.baselines.earBaseline * 0.6 : 0.15;

    if (avgEAR < sleepThreshold) {
      this.sleepFrameCount++;
      this.wakeFrameCount = 0;

      // Confirm sleep after 1.5 seconds (45 frames at 30fps)
      if (this.sleepFrameCount >= 45 && !this.isSleeping) {
        this.isSleeping = true;
        this.sleepStartTime = Date.now();
        this.showSleepOverlay(true);
      }
    } else {
      this.wakeFrameCount++;
      this.sleepFrameCount = 0;

      // Confirm wake after 0.5 seconds (15 frames)
      if (this.wakeFrameCount >= 15 && this.isSleeping) {
        this.isSleeping = false;
        if (this.sleepStartTime) {
          const sleepDuration = (Date.now() - this.sleepStartTime) / 1000;
          this.sleepTimeSeconds += sleepDuration;
          this.sleepStartTime = null;
        }
        this.showSleepOverlay(false);
      }
    }

    // Update ongoing sleep time
    if (this.isSleeping && this.sleepStartTime) {
      const currentSleepTime = (Date.now() - this.sleepStartTime) / 1000;
      const totalSleep = this.sleepTimeSeconds + currentSleepTime;
      this.updateSleepDisplay(totalSleep);
    } else {
      this.updateSleepDisplay(this.sleepTimeSeconds);
    }
  }

  detectEmotions(landmarks) {
    // Get face metrics
    const mouthWidth = this.getDistance(landmarks[61], landmarks[291]);
    const mouthHeight = this.getDistance(landmarks[13], landmarks[14]);
    const mouthCornerLeft = landmarks[61].y;
    const mouthCornerRight = landmarks[291].y;
    const mouthCenter = landmarks[13].y;
    
    const eyeLeft = this.getDistance(landmarks[159], landmarks[145]);
    const eyeRight = this.getDistance(landmarks[386], landmarks[374]);
    const eyeOpenness = (eyeLeft + eyeRight) / 2;
    
    const browLeft = landmarks[107].y;
    const browRight = landmarks[336].y;
    const eyeCenterY = (landmarks[33].y + landmarks[263].y) / 2;
    const browDistance = eyeCenterY - ((browLeft + browRight) / 2);

    // SMILE DETECTION (Enhanced)
    let smileIntensity = 0;
    if (this.baselines.mouthWidthBaseline) {
      const widthRatio = mouthWidth / this.baselines.mouthWidthBaseline;
      const cornerLift = (mouthCenter - ((mouthCornerLeft + mouthCornerRight) / 2)) / mouthHeight;
      
      if (widthRatio > 1.1 && cornerLift > 0.1) {
        smileIntensity = Math.min(100, (widthRatio - 1) * 100 + cornerLift * 50);
      }
    }

    // HAPPY DETECTION (Enhanced)
    let happyIntensity = 0;
    if (smileIntensity > 30 && eyeOpenness > 0.15) {
      happyIntensity = Math.min(100, smileIntensity * 0.8);
    }

    // SURPRISED DETECTION (Enhanced)
    let surprisedIntensity = 0;
    const mouthOpenRatio = mouthHeight / mouthWidth;
    const eyeWideOpen = eyeOpenness > 0.25;
    if (mouthOpenRatio > 0.8 && eyeWideOpen) {
      surprisedIntensity = Math.min(100, mouthOpenRatio * 80);
    }

    // CONFUSED DETECTION (Enhanced)
    let confusedIntensity = 0;
    if (this.baselines.browDistanceBaseline) {
      const currentBrowDist = this.getDistance(landmarks[107], landmarks[336]);
      const browFurrow = (this.baselines.browDistanceBaseline - currentBrowDist) / this.baselines.browDistanceBaseline;
      const frown = mouthCornerLeft < mouthCenter && mouthCornerRight < mouthCenter;
      
      if (browFurrow > 0.05 || frown) {
        confusedIntensity = Math.min(100, browFurrow * 300 + (frown ? 30 : 0));
      }
    }

    // FOCUSED DETECTION (Enhanced)
    let focusedIntensity = 0;
    const isNotSleeping = !this.isSleeping;
    const neutralExpression = smileIntensity < 20 && surprisedIntensity < 20 && confusedIntensity < 20;
    const steadyGaze = eyeOpenness > 0.18 && eyeOpenness < 0.30;
    
    if (isNotSleeping && neutralExpression && steadyGaze) {
      focusedIntensity = 70 + (steadyGaze ? 20 : 0);
    }

    // Smooth emotions
    this.emotions.smile = this.smoothEmotion('smile', smileIntensity);
    this.emotions.happy = this.smoothEmotion('happy', happyIntensity);
    this.emotions.surprised = this.smoothEmotion('surprised', surprisedIntensity);
    this.emotions.confused = this.smoothEmotion('confused', confusedIntensity);
    this.emotions.focused = this.smoothEmotion('focused', focusedIntensity);

    // Store in history
    Object.keys(this.emotions).forEach(emotion => {
      this.emotionHistory[emotion].push(this.emotions[emotion]);
    });
  }

  smoothEmotion(emotionType, newValue) {
    const history = this.emotionHistory[emotionType];
    const alpha = 0.3; // Smoothing factor
    
    if (history.length === 0) {
      return newValue;
    }
    
    const lastValue = history[history.length - 1] || 0;
    return (alpha * newValue) + ((1 - alpha) * lastValue);
  }

  detectBlink(landmarks) {
    const ear = this.calculateEAR(landmarks);
    const blinkThreshold = this.baselines.earBaseline ? this.baselines.earBaseline * 0.7 : 0.2;
    
    if (ear < blinkThreshold && !this.wasBlinking) {
      this.blinkCount++;
      this.wasBlinking = true;
    } else if (ear > blinkThreshold) {
      this.wasBlinking = false;
    }
  }

  getDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  showSleepOverlay(show) {
    const overlay = document.getElementById('sleepOverlay');
    if (overlay) {
      if (show) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    }
  }

  updateSleepDisplay(totalSleep) {
    const sleepTimeEl = document.getElementById('sleepTime');
    const sleepPercentageEl = document.getElementById('sleepPercentage');
    
    if (sleepTimeEl) {
      sleepTimeEl.textContent = `${Math.round(totalSleep)}s`;
    }
    
    if (sleepPercentageEl) {
      const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
      const sleepPercentage = sessionDuration > 0 ? (totalSleep / sessionDuration) * 100 : 0;
      sleepPercentageEl.textContent = `${sleepPercentage.toFixed(1)}% of session`;
    }
  }

  updateUI() {
    // Update session time
    const sessionTimeEl = document.getElementById('sessionTime');
    if (sessionTimeEl) {
      const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      sessionTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Update blink count
    const blinkCountEl = document.getElementById('blinkCount');
    const blinkRateEl = document.getElementById('blinkRate');
    if (blinkCountEl) {
      blinkCountEl.textContent = this.blinkCount;
    }
    if (blinkRateEl) {
      const duration = (Date.now() - this.sessionStartTime) / 1000 / 60; // minutes
      const rate = duration > 0 ? (this.blinkCount / duration).toFixed(1) : 0;
      blinkRateEl.textContent = `${rate} blinks/min`;
    }

    // Update emotion bars
    Object.keys(this.emotions).forEach(emotion => {
      const value = Math.round(this.emotions[emotion]);
      const barEl = document.getElementById(`${emotion}Bar`);
      const valueEl = document.getElementById(`${emotion}Value`);
      
      if (barEl) {
        barEl.style.width = `${value}%`;
      }
      if (valueEl) {
        valueEl.textContent = `${value}%`;
      }
    });

    // Update engagement score
    this.updateEngagementScore();
  }

  updateEngagementScore() {
    const focused = this.emotions.focused;
    const happy = this.emotions.happy;
    const smile = this.emotions.smile;
    const confused = this.emotions.confused;
    const sleepPenalty = this.isSleeping ? 50 : 0;

    let engagement = (focused * 0.6) + (happy * 0.3) + (smile * 0.1) - (confused * 0.3) - sleepPenalty;
    engagement = Math.max(0, Math.min(100, engagement));

    const engagementScoreEl = document.getElementById('engagementScore');
    const engagementStatusEl = document.getElementById('engagementStatus');

    if (engagementScoreEl) {
      engagementScoreEl.textContent = `${Math.round(engagement)}%`;
    }

    if (engagementStatusEl) {
      let status = '';
      if (engagement >= 80) status = 'Highly Engaged';
      else if (engagement >= 60) status = 'Engaged';
      else if (engagement >= 40) status = 'Moderately Engaged';
      else status = 'Low Engagement';
      
      engagementStatusEl.textContent = status;
    }
  }

  getSessionData() {
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const averages = {};
    
    Object.keys(this.emotionHistory).forEach(emotion => {
      const history = this.emotionHistory[emotion];
      if (history.length > 0) {
        const sum = history.reduce((a, b) => a + b, 0);
        averages[emotion] = (sum / history.length).toFixed(1);
      } else {
        averages[emotion] = 0;
      }
    });

    const blinkRate = (this.blinkCount / (duration / 60)).toFixed(1);
    const sleepPercentage = ((this.sleepTimeSeconds / duration) * 100).toFixed(1);

    // Calculate engagement score
    const engagement = (parseFloat(averages.focused) * 0.6) + 
                      (parseFloat(averages.happy) * 0.3) + 
                      (parseFloat(averages.smile) * 0.1) - 
                      (parseFloat(averages.confused) * 0.3);

    return {
      timestamp: new Date().toISOString(),
      duration_seconds: duration,
      blink_count: this.blinkCount,
      blink_rate_per_min: blinkRate,
      sleep_time_seconds: Math.round(this.sleepTimeSeconds),
      sleep_percentage: sleepPercentage,
      engagement_score: Math.max(0, Math.min(100, engagement)).toFixed(1),
      emotions_average: averages,
      emotion_timeline: this.emotionHistory
    };
  }

  saveSession() {
    const data = this.getSessionData();
    localStorage.setItem('edugazeSession', JSON.stringify(data));
    console.log('Session saved to localStorage');
  }

  exportData() {
    const data = this.getSessionData();
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `edugaze-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Session data exported successfully!');
  }
}

// Initialize tracker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTracker);
} else {
  initTracker();
}

function initTracker() {
  window.emotionTracker = new EmotionTracker();
  window.emotionTracker.init();
}
