// Report Generator JavaScript

let sessionData = null;

window.addEventListener('load', () => {
  loadSessionData();
});

function loadSessionData() {
  const data = localStorage.getItem('edugazeSession');
  
  if (!data) {
    showNoDataMessage();
    return;
  }
  
  try {
    sessionData = JSON.parse(data);
    displayReport();
  } catch (error) {
    console.error('Error parsing session data:', error);
    showNoDataMessage();
  }
}

function showNoDataMessage() {
  const container = document.querySelector('.container');
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <h2 style="font-size: 2rem; margin-bottom: 20px;">No Session Data Available</h2>
      <p style="color: #aaa; margin-bottom: 30px;">Please complete a monitoring session first.</p>
      <button class="btn btn-primary" onclick="goBack()">Go to Dashboard</button>
    </div>
  `;
}

function displayReport() {
  // Update session date
  const sessionDate = new Date(sessionData.timestamp);
  document.getElementById('sessionDate').textContent = sessionDate.toLocaleString();
  
  // Update summary cards
  const minutes = Math.floor(sessionData.duration_seconds / 60);
  const seconds = sessionData.duration_seconds % 60;
  document.getElementById('summaryDuration').textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  document.getElementById('summaryEngagement').textContent = 
    `${Math.round(sessionData.engagement_score || 0)}%`;
  
  document.getElementById('summaryBlinks').textContent = sessionData.blink_count;
  
  document.getElementById('summarySleep').textContent = 
    `${sessionData.sleep_time_seconds}s (${sessionData.sleep_percentage}%)`;
  
  // Generate charts
  createEmotionTimelineChart();
  createEmotionPieChart();
  createEngagementBarChart();
  
  // Generate insights
  generateInsights();
}

function createEmotionTimelineChart() {
  const ctx = document.getElementById('emotionTimelineChart').getContext('2d');
  
  const timeline = sessionData.emotion_timeline;
  const emotions = Object.keys(timeline);
  const maxLength = Math.max(...emotions.map(e => timeline[e].length));
  
  // Sample data points
  const samplingRate = maxLength > 200 ? Math.ceil(maxLength / 200) : 1;
  const labels = [];
  for (let i = 0; i < maxLength; i += samplingRate) {
    labels.push(Math.floor(i / 30)); // Convert frames to seconds
  }
  
  const datasets = [];
  const colors = {
    smile: { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    happy: { border: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
    surprised: { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
    confused: { border: '#EA580C', bg: 'rgba(234, 88, 12, 0.1)' },
    focused: { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' }
  };
  
  for (const emotion of emotions) {
    const data = [];
    for (let i = 0; i < timeline[emotion].length; i += samplingRate) {
      data.push(timeline[emotion][i]);
    }
    
    datasets.push({
      label: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      data: data,
      borderColor: colors[emotion].border,
      backgroundColor: colors[emotion].bg,
      borderWidth: 2,
      tension: 0.4,
      fill: true
    });
  }
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#aaa',
            font: { size: 12, family: "'Poppins', sans-serif" },
            padding: 15
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time (seconds)',
            color: '#aaa',
            font: { size: 14, weight: 'bold' }
          },
          ticks: { color: '#aaa' },
          grid: { display: false }
        },
        y: {
          title: {
            display: true,
            text: 'Intensity (%)',
            color: '#aaa',
            font: { size: 14, weight: 'bold' }
          },
          min: 0,
          max: 100,
          ticks: { color: '#aaa' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

function createEmotionPieChart() {
  const ctx = document.getElementById('emotionPieChart').getContext('2d');
  
  const emotions = sessionData.emotions_average;
  const labels = Object.keys(emotions).map(e => e.charAt(0).toUpperCase() + e.slice(1));
  const data = Object.values(emotions);
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(234, 88, 12, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#EA580C',
          '#3B82F6'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#aaa',
            font: { size: 13, family: "'Poppins', sans-serif" },
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value.toFixed(1)}%`;
            }
          }
        }
      }
    }
  });
}

function createEngagementBarChart() {
  const ctx = document.getElementById('engagementBarChart').getContext('2d');
  
  const metrics = {
    'Engagement Score': sessionData.engagement_score || 0,
    'Focus Level': sessionData.emotions_average.focused || 0,
    'Happiness Level': sessionData.emotions_average.happy || 0,
    'Confusion Level': sessionData.emotions_average.confused || 0
  };
  
  const labels = Object.keys(metrics);
  const data = Object.values(metrics);
  const colors = data.map((value, index) => {
    if (index === 0) return 'rgba(16, 185, 129, 0.8)';
    if (index === 1) return 'rgba(59, 130, 246, 0.8)';
    if (index === 2) return 'rgba(239, 68, 68, 0.8)';
    return 'rgba(234, 88, 12, 0.8)';
  });
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Percentage',
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              return `${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Percentage (%)',
            color: '#aaa',
            font: { size: 14, weight: 'bold' }
          },
          ticks: { color: '#aaa' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: {
          ticks: { color: '#aaa' },
          grid: { display: false }
        }
      }
    }
  });
}

function generateInsights() {
  const container = document.getElementById('insightsContainer');
  const insights = [];
  
  // Engagement insight
  const engagement = parseFloat(sessionData.engagement_score);
  if (engagement >= 80) {
    insights.push({
      icon: '🎯',
      title: 'Excellent Engagement',
      description: 'Student maintained high engagement throughout the session.',
      type: 'success'
    });
  } else if (engagement >= 60) {
    insights.push({
      icon: '✅',
      title: 'Good Engagement',
      description: 'Student showed consistent attention with room for improvement.',
      type: 'info'
    });
  } else {
    insights.push({
      icon: '⚠️',
      title: 'Low Engagement',
      description: 'Student engagement was below optimal levels. Consider shorter sessions or breaks.',
      type: 'warning'
    });
  }
  
  // Sleep insight
  const sleepPercentage = parseFloat(sessionData.sleep_percentage);
  if (sleepPercentage > 10) {
    insights.push({
      icon: '😴',
      title: 'Sleep Detected',
      description: `Student appeared to sleep for ${sessionData.sleep_time_seconds}s (${sleepPercentage}% of session). Consider session timing or duration.`,
      type: 'warning'
    });
  } else if (sleepPercentage > 0) {
    insights.push({
      icon: '💤',
      title: 'Brief Drowsiness',
      description: 'Minor sleep detected. Student may benefit from a break.',
      type: 'info'
    });
  }
  
  // Blink rate insight
  const blinkRate = parseFloat(sessionData.blink_rate_per_min);
  if (blinkRate < 10) {
    insights.push({
      icon: '👁️',
      title: 'Low Blink Rate',
      description: 'Below-average blink rate may indicate screen fatigue. Encourage regular breaks.',
      type: 'info'
    });
  } else if (blinkRate > 25) {
    insights.push({
      icon: '👀',
      title: 'High Blink Rate',
      description: 'Elevated blink rate may suggest tiredness or eye strain.',
      type: 'info'
    });
  }
  
  // Focus insight
  const focusLevel = sessionData.emotions_average.focused;
  if (focusLevel > 70) {
    insights.push({
      icon: '🎓',
      title: 'Strong Focus',
      description: 'Student demonstrated excellent concentration during the session.',
      type: 'success'
    });
  }
  
  // Confusion insight
  const confusionLevel = sessionData.emotions_average.confused;
  if (confusionLevel > 30) {
    insights.push({
      icon: '🤔',
      title: 'Confusion Detected',
      description: 'Student showed signs of confusion. Material may need clarification or review.',
      type: 'warning'
    });
  }
  
  // Happiness insight
  const happinessLevel = sessionData.emotions_average.happy;
  if (happinessLevel > 40) {
    insights.push({
      icon: '😊',
      title: 'Positive Emotions',
      description: 'Student displayed positive emotions, indicating enjoyment of the content.',
      type: 'success'
    });
  }
  
  // Render insights
  container.innerHTML = insights.map(insight => `
    <div class="insight-card insight-${insight.type}">
      <div class="insight-icon">${insight.icon}</div>
      <div class="insight-content">
        <h4>${insight.title}</h4>
        <p>${insight.description}</p>
      </div>
    </div>
  `).join('');
}

function downloadReport() {
  alert('PDF download feature coming soon! For now, use the Print button to save as PDF.');
  window.print();
}

function goBack() {
  window.history.back();
}
