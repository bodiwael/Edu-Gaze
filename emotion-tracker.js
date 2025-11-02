// EduGaze Application - Fixed Single Emotion Detection

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
const SLEEP_THRESHOLD_FRAMES = 45;
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
const EAR_HISTORY_SIZE = 10; aasdasdadas

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

// Calculate emotions - returns ONLY ONE dominant emotion
function calculateEmotions(landmarks) {
    // Eye landmarks
    const leftEye = [33, 160, 158, 133, 153, 144].map(i => landmarks[i]);
    const rightEye = [362, 385, 387, 263, 373, 380].map(i => landmarks[i]);
    
    // Mouth landmarks
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    
    // Additional mouth points for better smile detection
    const leftMouthCorner = landmarks[78];
    const rightMouthCorner = landmarks[308];
    
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
    
    // Normalize by face width
    const normalizedMouthWidth = mouthWidth / faceWidth;
    const normalizedMouthHeight = mouthHeight / faceWidth;
    
    // Better smile detection using mouth corners
    const mouthCenterY = (mouthTop.y + mouthBottom.y) / 2;
    const leftCornerLift = mouthCenterY - leftMouthCorner.y;
    const rightCornerLift = mouthCenterY - rightMouthCorner.y;
    const avgCornerLift = (leftCornerLift + rightCornerLift) / 2;
    const normalizedCornerLift = avgCornerLift / faceWidth;
    
    // Eyebrow height
    const leftEyeCenter = leftEye[0];
    const rightEyeCenter = rightEye[0];
    const leftBrowHeight = leftEyeCenter.y - leftBrowOuter.y;
    const rightBrowHeight = rightEyeCenter.y - rightBrowOuter.y;
    const avgBrowHeight = (leftBrowHeight + rightBrowHeight) / 2;
    const normalizedBrowHeight = avgBrowHeight / faceWidth;
    
    // Calculate emotion scores
    let emotionScores = {
        smile: 0,
        happy: 0,
        surprised: 0,
        confused: 0,
        focused: 0
    };
    
    // === SMILE DETECTION (More sensitive) ===
    // Check if corners are lifted (positive value means smile)
    if (normalizedCornerLift > 0.003) {
        emotionScores.smile = clamp((normalizedCornerLift / 0.02) * 100, 0, 100);
        
        // Boost if mouth is wider
        if (normalizedMouthWidth > 0.14) {
            emotionScores.smile *= 1.3;
        }
        
        // Additional boost for clear smiles
        if (normalizedCornerLift > 0.01) {
            emotionScores.smile *= 1.2;
        }
    }
    
    // === HAPPY DETECTION (Smile + normal eyes) ===
    if (emotionScores.smile > 30 && avgEAR > 0.18 && avgEAR < 0.35) {
        emotionScores.happy = emotionScores.smile * 1.1;
    }
    
    // === SURPRISED DETECTION (Wide eyes OR open mouth) ===
    if (avgEAR > 0.30 || mouthRatio > 0.50) {
        const eyeFactor = avgEAR > 0.30 ? (avgEAR - 0.30) * 500 : 0;
        const mouthFactor = mouthRatio > 0.50 ? (mouthRatio - 0.50) * 150 : 0;
        emotionScores.surprised = clamp(eyeFactor + mouthFactor, 0, 100);
    }
    
    // === CONFUSED DETECTION (Furrowed brows + frown) ===
    const browFurrowed = normalizedBrowHeight > 0.075;
    const mouthFrown = normalizedCornerLift < -0.003;
    
    if (browFurrowed || mouthFrown) {
        let confusedValue = 0;
        if (browFurrowed) {
            confusedValue += clamp((normalizedBrowHeight - 0.075) * 600, 0, 60);
        }
        if (mouthFrown) {
            confusedValue += Math.abs(normalizedCornerLift) * 400;
        }
        emotionScores.confused = clamp(confusedValue, 0, 100);
    }
    
    // === FOCUSED DETECTION (Neutral face, normal eyes) ===
    const isNeutralExpression = emotionScores.smile < 20 && 
                                 emotionScores.surprised < 20 && 
                                 emotionScores.confused < 20;
    
    if (isNeutralExpression && !isSleeping) {
        if (avgEAR > 0.18 && avgEAR < 0.32 && mouthRatio < 0.45) {
            emotionScores.focused = 75;
        }
    }
    
    // === SELECT ONLY ONE DOMINANT EMOTION ===
    let dominantEmotion = 'focused';
    let maxScore = emotionScores.focused;
    
    // Find the emotion with highest score
    for (const [emotion, score] of Object.entries(emotionScores)) {
        if (score > maxScore) {
            maxScore = score;
            dominantEmotion = emotion;
        }
    }
    
    // Set all emotions to 0 except the dominant one
    const result = {
        smile: 0,
        happy: 0,
        surprised: 0,
        confused: 0,
        focused: 0
    };
    
    // Only show dominant emotion if it's strong enough
    if (maxScore > 15) {
        result[dominantEmotion] = Math.min(100, maxScore);
    } else {
        // If no strong emotion, default to focused
        result.focused = 50;
    }
    
    return result;
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
        isSleeping = true;
        sleepStartTime = Date.now();
        document.getElementById('sleepOverlay').style.display = 'flex';
        document.getElementById('statusBadge').innerHTML = '<span class="status-dot" style="background: #EF4444;"></span> Sleeping';
        document.getElementById('statusBadge').style.background = '#FEE2E2';
        document.getElementById('statusBadge').style.color = '#991B1B';
    } else if (!currentlySleeping && isSleeping && consecutiveSleepFrames < WAKE_THRESHOLD_FRAMES) {
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
    
    const currentSleepTime = isSleeping && sleepStartTime 
        ? sleepTime + (Date.now() - sleepStartTime) / 1000 
        : sleepTime;
    
    document.getElementById('sleepTime').textContent = formatTime(currentSleepTime);
    
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
