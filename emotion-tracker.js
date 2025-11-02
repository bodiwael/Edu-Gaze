// EduGaze Application - Simplified Emotion Detection with Direct EAR

let video, model, detector;
let isRunning = false;
let sessionStartTime;
let blinkCount = 0;
let lastBlinkTime = 0;

// Sleep tracking variables
let sleepTime = 0;
let isSleeping = false;
let sleepStartTime = null;
let consecutiveSleepFrames = 0;
const SLEEP_THRESHOLD_FRAMES = 45; // ~1.5 seconds at 30fps
const WAKE_THRESHOLD_FRAMES = 15;

let emotionHistory = {
    smile: [],
    happy: [],
    surprised: [],
    confused: [],
    focused: []
};

// Smoothing buffer
let smoothingBuffer = {
    smile: [],
    happy: [],
    surprised: [],
    confused: [],
    focused: []
};
const SMOOTHING_WINDOW = 5;

// EAR history for sleep detection
let earHistory = [];
const EAR_HISTORY_SIZE = 10;

// Face size normalization
let faceWidth = 1.0;

// Initialize the application
async function init() {
    try {
        video = document.getElementById('videoElement');
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });
        video.srcObject = stream;
        
        await tf.setBackend('webgl');
        await tf.ready();
        
        model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            refineLandmarks: true
        };
        
        detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
        
        document.getElementById('loadingAlert').style.display = 'none';
        document.getElementById('readyAlert').style.display = 'flex';
        
        setTimeout(() => {
            document.getElementById('readyAlert').style.display = 'none';
        }, 3000);
        
        sessionStartTime = Date.now();
        isRunning = true;
        
        detectFace();
        updateTimer();
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error accessing camera or loading model. Please ensure camera permissions are granted.');
    }
}

// Main detection loop
async function detectFace() {
    if (!isRunning) return;
    
    try {
        const predictions = await detector.estimateFaces(video);
        
        if (predictions.length > 0) {
            const face = predictions[0];
            const landmarks = face.keypoints;
            
            // Calculate face width for normalization
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];
            faceWidth = distance(leftCheek, rightCheek);
            
            // Calculate emotions and sleep state
            const emotions = calculateEmotions(landmarks);
            const sleepState = detectSleep(landmarks);
            
            // Update sleep tracking
            updateSleepTracking(sleepState);
            
            // Update UI
            updateEmotionBars(emotions);
            updateHistory(emotions);
            updateEngagementScore(emotions);
        } else {
            // No face detected
            consecutiveSleepFrames++;
            if (consecutiveSleepFrames > SLEEP_THRESHOLD_FRAMES) {
                updateSleepTracking(true);
            }
        }
    } catch (error) {
        console.error('Detection error:', error);
    }
    
    requestAnimationFrame(detectFace);
}

// Detect sleep based on EAR (Eye Aspect Ratio)
function detectSleep(landmarks) {
    const leftEye = [33, 160, 158, 133, 153, 144].map(i => landmarks[i]);
    const rightEye = [362, 385, 387, 263, 373, 380].map(i => landmarks[i]);
    
    const earLeft = calculateEAR(leftEye);
    const earRight = calculateEAR(rightEye);
    const avgEAR = (earLeft + earRight) / 2;
    
    // Maintain EAR history
    earHistory.push(avgEAR);
    if (earHistory.length > EAR_HISTORY_SIZE) {
        earHistory.shift();
    }
    
    // Calculate average EAR over history
    const avgEARHistory = earHistory.reduce((a, b) => a + b, 0) / earHistory.length;
    
    // Fixed sleep threshold - eyes closed
    const SLEEP_EAR_THRESHOLD = 0.15;
    
    // Blink detection - quick eye closure
    const BLINK_EAR_THRESHOLD = 0.21;
    if (avgEAR < BLINK_EAR_THRESHOLD && Date.now() - lastBlinkTime > 300) {
        blinkCount++;
        lastBlinkTime = Date.now();
        document.getElementById('blinkCount').textContent = blinkCount;
        updateBlinkRate();
    }
    
    // Check if eyes are consistently closed
    const eyesClosed = avgEARHistory < SLEEP_EAR_THRESHOLD;
    
    if (eyesClosed) {
        consecutiveSleepFrames++;
    } else {
        if (consecutiveSleepFrames > 0) {
            consecutiveSleepFrames = Math.max(0, consecutiveSleepFrames - 3);
        }
    }
    
    return consecutiveSleepFrames > SLEEP_THRESHOLD_FRAMES;
}

// Simplified emotion calculation
function calculateEmotions(landmarks) {
    // Eye landmarks
    const leftEye = [33, 160, 158, 133, 153, 144].map(i => landmarks[i]);
    const rightEye = [362, 385, 387, 263, 373, 380].map(i => landmarks[i]);
    
    // Mouth landmarks
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    
    // Eyebrow landmarks
    const leftBrowInner = landmarks[70];
    const leftBrowOuter = landmarks[105];
    const rightBrowInner = landmarks[300];
    const rightBrowOuter = landmarks[334];
    
    // Calculate EAR
    const earLeft = calculateEAR(leftEye);
    const earRight = calculateEAR(rightEye);
    const avgEAR = (earLeft + earRight) / 2;
    
    // Mouth metrics
    const mouthWidth = distance(mouthLeft, mouthRight);
    const mouthHeight = distance(mouthTop, mouthBottom);
    const mouthRatio = mouthHeight / mouthWidth;
    
    // Normalize by face width to handle different distances from camera
    const normalizedMouthWidth = mouthWidth / faceWidth;
    const normalizedMouthHeight = mouthHeight / faceWidth;
    
    // Mouth corners for smile detection
    const mouthCenterY = (mouthTop.y + mouthBottom.y) / 2;
    const leftCornerLift = mouthCenterY - mouthLeft.y;
    const rightCornerLift = mouthCenterY - mouthRight.y;
    const avgCornerLift = (leftCornerLift + rightCornerLift) / 2;
    const normalizedCornerLift = avgCornerLift / faceWidth;
    
    // Eyebrow height
    const leftEyeCenter = leftEye[0];
    const rightEyeCenter = rightEye[0];
    const leftBrowHeight = leftEyeCenter.y - leftBrowOuter.y;
    const rightBrowHeight = rightEyeCenter.y - rightBrowOuter.y;
    const avgBrowHeight = (leftBrowHeight + rightBrowHeight) / 2;
    const normalizedBrowHeight = avgBrowHeight / faceWidth;
    
    // === EMOTION CALCULATIONS (Simplified, No Calibration) ===
    
    // SMILE - based on mouth corner lift and width
    let smileScore = 0;
    if (normalizedCornerLift > 0.008) {
        smileScore = clamp((normalizedCornerLift / 0.035) * 100, 0, 100);
        // Boost if mouth is wider
        if (normalizedMouthWidth > 0.15) {
            smileScore *= 1.2;
        }
    }
    smileScore = clamp(smileScore, 0, 100);
    
    // HAPPY - smile + relaxed eyes
    let happyScore = 0;
    if (smileScore > 25) {
        // Check if eyes are normally open (not squinting or wide)
        if (avgEAR > 0.20 && avgEAR < 0.35) {
            happyScore = smileScore * 0.95;
        }
    }
    happyScore = clamp(happyScore, 0, 100);
    
    // SURPRISED - wide eyes and open mouth
    let surprisedScore = 0;
    const mouthOpenness = mouthRatio;
    const eyeOpenness = avgEAR;
    
    if (mouthOpenness > 0.40 || eyeOpenness > 0.32) {
        surprisedScore = (mouthOpenness - 0.25) * 200 + (eyeOpenness - 0.25) * 300;
        surprisedScore = clamp(surprisedScore, 0, 100);
    }
    
    // CONFUSED - furrowed brows + frown or asymmetric mouth
    let confusedScore = 0;
    const browFurrow = normalizedBrowHeight > 0.08 ? clamp(normalizedBrowHeight * 500, 0, 60) : 0;
    const mouthAsymmetry = Math.abs(leftCornerLift - rightCornerLift) / faceWidth;
    const frownFactor = normalizedCornerLift < -0.005 ? Math.abs(normalizedCornerLift) * 500 : 0;
    
    confusedScore = browFurrow + (frownFactor * 0.8) + (mouthAsymmetry * 200);
    confusedScore = clamp(confusedScore, 0, 100);
    
    // FOCUSED - neutral expression, steady gaze
    let focusedScore = 0;
    const totalExpression = smileScore + happyScore + surprisedScore + confusedScore;
    
    if (totalExpression < 100 && !isSleeping) {
        // Eyes should be normally open
        if (avgEAR > 0.20 && avgEAR < 0.32) {
            // Mouth should be relatively neutral
            if (mouthRatio < 0.45) {
                const neutrality = 100 - (totalExpression * 0.6);
                focusedScore = clamp(neutrality, 0, 100);
            }
        }
    }
    focusedScore = clamp(focusedScore, 0, 100);
    
    return {
        smile: smileScore,
        happy: happyScore,
        surprised: surprisedScore,
        confused: confusedScore,
        focused: focusedScore
    };
}

// Calculate Eye Aspect Ratio
function calculateEAR(eyePoints) {
    const A = distance(eyePoints[1], eyePoints[5]);
    const B = distance(eyePoints[2], eyePoints[4]);
    const C = distance(eyePoints[0], eyePoints[3]);
    return (A + B) / (2.0 * C);
}

// Distance between two points
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Clamp value
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Update sleep tracking state
function updateSleepTracking(currentlySleeping) {
    if (currentlySleeping && !isSleeping) {
        // Just fell asleep
        isSleeping = true;
        sleepStartTime = Date.now();
        document.getElementById('sleepOverlay').style.display = 'flex';
        document.getElementById('statusBadge').innerHTML = '<span class="status-dot" style="background: #EF4444;"></span> Sleeping';
        document.getElementById('statusBadge').style.background = '#FEE2E2';
        document.getElementById('statusBadge').style.color = '#991B1B';
    } else if (!currentlySleeping && isSleeping && consecutiveSleepFrames < WAKE_THRESHOLD_FRAMES) {
        // Just woke up
        if (sleepStartTime) {
            sleepTime += (Date.now() - sleepStartTime) / 1000;
        }
        isSleeping = false;
        sleepStartTime = null;
        document.getElementById('sleepOverlay').style.display = 'none';
        document.getElementById('statusBadge').innerHTML = '<span class="status-dot"></span> Active';
        document.getElementById('statusBadge').style.background = '#D1FAE5';
        document.getElementById('statusBadge').style.color = '#065F46';
    }
    
    // Update sleep time display
    const currentSleepTime = isSleeping && sleepStartTime 
        ? sleepTime + (Date.now() - sleepStartTime) / 1000 
        : sleepTime;
    
    document.getElementById('sleepTime').textContent = formatTime(currentSleepTime);
    
    // Calculate sleep percentage
    const sessionDuration = (Date.now() - sessionStartTime) / 1000;
    const sleepPercentage = (currentSleepTime / sessionDuration * 100).toFixed(1);
    document.getElementById('sleepPercentage').textContent = `${sleepPercentage}% of session`;
}

// Smooth emotion values
function smoothValue(emotion, value) {
    if (!smoothingBuffer[emotion]) {
        smoothingBuffer[emotion] = [];
    }
    
    smoothingBuffer[emotion].push(value);
    if (smoothingBuffer[emotion].length > SMOOTHING_WINDOW) {
        smoothingBuffer[emotion].shift();
    }
    
    const sum = smoothingBuffer[emotion].reduce((a, b) => a + b, 0);
    return sum / smoothingBuffer[emotion].length;
}

// Update emotion bars
function updateEmotionBars(emotions) {
    for (const [emotion, value] of Object.entries(emotions)) {
        const smoothedValue = smoothValue(emotion, value);
        const bar = document.getElementById(`${emotion}Bar`);
        const text = document.getElementById(`${emotion}Value`);
        
        if (bar && text) {
            bar.style.width = `${smoothedValue}%`;
            bar.setAttribute('data-value', smoothedValue);
            text.textContent = `${Math.round(smoothedValue)}%`;
        }
    }
}

// Update emotion history
function updateHistory(emotions) {
    for (const [emotion, value] of Object.entries(emotions)) {
        if (!emotionHistory[emotion]) {
            emotionHistory[emotion] = [];
        }
        emotionHistory[emotion].push(value);
        
        if (emotionHistory[emotion].length > 1000) {
            emotionHistory[emotion].shift();
        }
    }
}

// Calculate and update engagement score
function updateEngagementScore(emotions) {
    const sleepPenalty = isSleeping ? 50 : 0;
    const engagementScore = Math.max(0, 
        emotions.focused * 0.6 + 
        emotions.happy * 0.3 + 
        emotions.smile * 0.1 - 
        emotions.confused * 0.3 - 
        sleepPenalty
    );
    
    const roundedScore = Math.round(engagementScore);
    document.getElementById('engagementScore').textContent = `${roundedScore}%`;
    
    let status = '';
    if (isSleeping) {
        status = 'Sleeping';
    } else if (roundedScore >= 80) {
        status = 'Highly Engaged';
    } else if (roundedScore >= 60) {
        status = 'Engaged';
    } else if (roundedScore >= 40) {
        status = 'Moderately Engaged';
    } else {
        status = 'Low Engagement';
    }
    
    document.getElementById('engagementStatus').textContent = status;
}

// Update blink rate
function updateBlinkRate() {
    const elapsedMinutes = (Date.now() - sessionStartTime) / 60000;
    const blinkRate = elapsedMinutes > 0 ? (blinkCount / elapsedMinutes).toFixed(1) : 0;
    document.getElementById('blinkRate').textContent = `${blinkRate} blinks/min`;
}

// Update timer
function updateTimer() {
    if (!isRunning) return;
    
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    document.getElementById('sessionTime').textContent = formatTime(elapsed);
    
    setTimeout(updateTimer, 1000);
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Export session data
function exportData() {
    const sessionDuration = (Date.now() - sessionStartTime) / 1000;
    const currentSleepTime = isSleeping && sleepStartTime 
        ? sleepTime + (Date.now() - sleepStartTime) / 1000 
        : sleepTime;
    
    const sessionData = {
        timestamp: new Date().toISOString(),
        duration_seconds: Math.round(sessionDuration),
        blink_count: blinkCount,
        blink_rate_per_min: (blinkCount / (sessionDuration / 60)).toFixed(2),
        sleep_time_seconds: Math.round(currentSleepTime),
        sleep_percentage: ((currentSleepTime / sessionDuration) * 100).toFixed(2),
        emotions_average: {},
        emotion_timeline: emotionHistory
    };
    
    for (const [emotion, values] of Object.entries(emotionHistory)) {
        if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            sessionData.emotions_average[emotion] = Math.round(avg * 100) / 100;
        }
    }
    
    const avgFocused = sessionData.emotions_average.focused || 0;
    const avgHappy = sessionData.emotions_average.happy || 0;
    const avgConfused = sessionData.emotions_average.confused || 0;
    const sleepPenalty = (currentSleepTime / sessionDuration) * 50;
    
    sessionData.engagement_score = Math.max(0, 
        avgFocused * 0.6 + avgHappy * 0.3 - avgConfused * 0.3 - sleepPenalty
    ).toFixed(2);
    
    localStorage.setItem('edugazeSession', JSON.stringify(sessionData));
    
    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edugaze_session_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    document.getElementById('viewReportBtn').addEventListener('click', () => {
        exportData();
        window.location.href = 'report.html';
    });
    
    document.getElementById('endSessionBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to end this session?')) {
            exportData();
            isRunning = false;
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
            }
            alert('Session ended. Data has been saved.');
        }
    });
}

// Start the application
window.addEventListener('load', init);
