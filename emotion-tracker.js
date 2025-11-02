// EduGaze Application - Enhanced with Sleep Tracking

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
const WAKE_THRESHOLD_FRAMES = 15; // ~0.5 seconds to wake up

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

// Adaptive baseline tracking
let baselineEAR = null;
let baselineMouthRatio = null;
let frameCount = 0;
const BASELINE_FRAMES = 30;

// EAR history for sleep detection
let earHistory = [];
const EAR_HISTORY_SIZE = 10;

// Initialize the application
async function init() {
    try {
        video = document.getElementById('videoElement');
        
        // Setup webcam
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });
        video.srcObject = stream;
        
        // Load face detection model
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
            
            // Calculate emotions and sleep state
            const emotions = calculateEmotions(landmarks);
            const sleepState = detectSleep(landmarks);
            
            // Update sleep tracking
            updateSleepTracking(sleepState);
            
            // Update UI
            updateEmotionBars(emotions);
            updateHistory(emotions);
            updateEngagementScore(emotions);
            
            frameCount++;
        } else {
            // No face detected - might be sleeping or away
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
    
    // Adaptive sleep threshold
    const sleepThreshold = (baselineEAR || 0.25) * 0.6;
    
    // Check if eyes are consistently closed
    const eyesClosed = avgEARHistory < sleepThreshold;
    
    if (eyesClosed) {
        consecutiveSleepFrames++;
    } else {
        // Reset if eyes open
        if (consecutiveSleepFrames > 0) {
            consecutiveSleepFrames = Math.max(0, consecutiveSleepFrames - 3);
        }
    }
    
    return consecutiveSleepFrames > SLEEP_THRESHOLD_FRAMES;
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

// Improved emotion calculation
function calculateEmotions(landmarks) {
    const leftEye = [33, 160, 158, 133, 153, 144].map(i => landmarks[i]);
    const rightEye = [362, 385, 387, 263, 373, 380].map(i => landmarks[i]);
    
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    
    const leftBrowInner = landmarks[70];
    const rightBrowInner = landmarks[300];
    const leftBrowOuter = landmarks[105];
    const rightBrowOuter = landmarks[334];
    
    // Calculate EAR
    const earLeft = calculateEAR(leftEye);
    const earRight = calculateEAR(rightEye);
    const avgEAR = (earLeft + earRight) / 2;
    
    // Adaptive baseline
    if (frameCount < BASELINE_FRAMES) {
        if (!baselineEAR) baselineEAR = avgEAR;
        else baselineEAR = baselineEAR * 0.95 + avgEAR * 0.05;
    }
    
    // Blink detection
    const blinkThreshold = (baselineEAR || 0.25) * 0.7;
    if (avgEAR < blinkThreshold && Date.now() - lastBlinkTime > 300) {
        blinkCount++;
        lastBlinkTime = Date.now();
        document.getElementById('blinkCount').textContent = blinkCount;
        updateBlinkRate();
    }
    
    // Mouth metrics
    const mouthWidth = distance(mouthLeft, mouthRight);
    const mouthHeight = distance(mouthTop, mouthBottom);
    const mouthRatio = mouthHeight / mouthWidth;
    
    if (frameCount < BASELINE_FRAMES) {
        if (!baselineMouthRatio) baselineMouthRatio = mouthRatio;
        else baselineMouthRatio = baselineMouthRatio * 0.95 + mouthRatio * 0.05;
    }
    
    // Mouth corner lift
    const leftCornerY = mouthLeft.y;
    const rightCornerY = mouthRight.y;
    const centerY = (mouthTop.y + mouthBottom.y) / 2;
    const cornerLift = (centerY - leftCornerY + centerY - rightCornerY) / 2;
    const cornerLiftRatio = cornerLift / mouthWidth;
    
    // Eyebrow metrics
    const leftBrowHeight = leftBrowOuter.y - leftEye[0].y;
    const rightBrowHeight = rightBrowOuter.y - rightEye[0].y;
    const avgBrowHeight = (leftBrowHeight + rightBrowHeight) / 2;
    
    // SMILE
    let smileScore = 0;
    if (cornerLiftRatio > 0.02) {
        smileScore = Math.min(100, (cornerLiftRatio / 0.08) * 100);
        const widthFactor = baselineMouthRatio ? (baselineMouthRatio / mouthRatio) : 1;
        if (widthFactor > 1.1) {
            smileScore *= Math.min(1.5, widthFactor);
        }
    }
    smileScore = clamp(smileScore, 0, 100);
    
    // HAPPY
    let happyScore = 0;
    if (smileScore > 30) {
        const eyeRelaxation = baselineEAR ? (avgEAR / baselineEAR) : 1;
        if (eyeRelaxation > 0.85 && eyeRelaxation < 1.15) {
            happyScore = smileScore * 0.9;
        }
    }
    happyScore = clamp(happyScore, 0, 100);
    
    // SURPRISED
    let surprisedScore = 0;
    const mouthOpenness = baselineMouthRatio ? (mouthRatio / baselineMouthRatio) : 1;
    const eyeOpenness = baselineEAR ? (avgEAR / baselineEAR) : 1;
    
    if (mouthOpenness > 1.5 || eyeOpenness > 1.15) {
        surprisedScore = (mouthOpenness - 1) * 50 + (eyeOpenness - 1) * 200;
        surprisedScore = Math.min(100, surprisedScore);
    }
    surprisedScore = clamp(surprisedScore, 0, 100);
    
    // CONFUSED
    let confusedScore = 0;
    const browFurrow = avgBrowHeight > 0 ? Math.min(1, avgBrowHeight / 15) : 0;
    const mouthAsymmetry = Math.abs(leftCornerY - rightCornerY);
    const frownFactor = cornerLiftRatio < -0.01 ? Math.abs(cornerLiftRatio) * 100 : 0;
    
    confusedScore = (browFurrow * 60) + (frownFactor * 0.8) + (mouthAsymmetry * 30);
    confusedScore = clamp(confusedScore, 0, 100);
    
    // FOCUSED
    let focusedScore = 0;
    const totalExpression = smileScore + happyScore + surprisedScore + confusedScore;
    
    if (totalExpression < 80 && !isSleeping) {
        const eyeFocus = baselineEAR ? clamp((avgEAR / baselineEAR) * 100, 70, 100) : 80;
        const steadiness = mouthRatio < (baselineMouthRatio || 0.3) * 1.3 ? 1 : 0.5;
        focusedScore = ((100 - totalExpression * 0.5) * steadiness * (eyeFocus / 100));
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
    // Engagement = focused + happy - (confused * 0.5) - sleep penalty
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
    
    // Calculate engagement score
    const avgFocused = sessionData.emotions_average.focused || 0;
    const avgHappy = sessionData.emotions_average.happy || 0;
    const avgConfused = sessionData.emotions_average.confused || 0;
    const sleepPenalty = (currentSleepTime / sessionDuration) * 50;
    
    sessionData.engagement_score = Math.max(0, 
        avgFocused * 0.6 + avgHappy * 0.3 - avgConfused * 0.3 - sleepPenalty
    ).toFixed(2);
    
    // Save to localStorage for report page
    localStorage.setItem('edugazeSession', JSON.stringify(sessionData));
    
    // Download as JSON
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
        exportData(); // Save to localStorage
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
