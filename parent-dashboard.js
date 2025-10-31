// Parent Dashboard JavaScript

const userName = sessionStorage.getItem('userName') || 'Parent';
document.getElementById('userName').textContent = userName;

let selectedChild = 'Omar';

function selectChild(childName) {
  selectedChild = childName;
  document.querySelectorAll('.child-card').forEach(card => {
    card.classList.remove('active');
  });
  event.target.closest('.child-card').classList.add('active');
  
  updateDashboard(childName);
}

function updateDashboard(childName) {
  if (childName === 'Omar') {
    document.getElementById('sessionCount').textContent = '12';
    document.getElementById('totalTime').textContent = '8.5h';
    document.getElementById('avgEngagement').textContent = '85%';
    document.getElementById('focusScore').textContent = '87%';
  } else {
    document.getElementById('sessionCount').textContent = '15';
    document.getElementById('totalTime').textContent = '10.2h';
    document.getElementById('avgEngagement').textContent = '92%';
    document.getElementById('focusScore').textContent = '94%';
  }
}

function initCharts() {
  const engagementCtx = document.getElementById('engagementChart').getContext('2d');
  new Chart(engagementCtx, {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Engagement %',
        data: [82, 85, 88, 84, 92, 89, 85],
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#aaa' } } },
      scales: {
        y: { ticks: { color: '#aaa' }, beginAtZero: true, max: 100 },
        x: { ticks: { color: '#aaa' } }
      }
    }
  });

  const emotionCtx = document.getElementById('emotionChart').getContext('2d');
  new Chart(emotionCtx, {
    type: 'doughnut',
    data: {
      labels: ['Focused', 'Happy', 'Neutral', 'Confused'],
      datasets: [{
        data: [45, 30, 20, 5],
        backgroundColor: ['#3B82F6', '#51cf66', '#00d4ff', '#ffc107'],
        borderColor: '#1a1f29',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#aaa' } } }
    }
  });
}

function viewSession(sessionId) {
  const content = `
    <div class="report-section">
      <h3>Session ${sessionId} Details</h3>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Subject:</strong> Mathematics</p>
      <p><strong>Duration:</strong> 45 minutes</p>
    </div>
    <div class="report-section">
      <h3>Performance Metrics</h3>
      <p><strong>Engagement:</strong> 92%</p>
      <p><strong>Focus:</strong> 88%</p>
      <p><strong>Happiness:</strong> 85%</p>
      <p><strong>Sleep Time:</strong> 0 seconds</p>
    </div>
    <div class="report-section">
      <h3>Teacher Notes</h3>
      <p>Excellent participation and understanding of concepts. Keep up the good work!</p>
    </div>
  `;
  document.getElementById('sessionContent').innerHTML = content;
  document.getElementById('sessionModal').classList.add('active');
}

function closeModal() {
  document.getElementById('sessionModal').classList.remove('active');
}

function downloadReport() {
  alert('Downloading comprehensive progress report...');
}

function scheduleCall() {
  alert('Redirecting to teacher scheduling system...');
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

window.addEventListener('load', initCharts);

const style = document.createElement('style');
style.textContent = `
  .children-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .child-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .child-card:hover {
    background: rgba(0, 123, 255, 0.1);
    border-color: rgba(0, 123, 255, 0.5);
    transform: translateY(-3px);
  }

  .child-card.active {
    background: rgba(0, 123, 255, 0.15);
    border-color: rgba(0, 123, 255, 0.8);
  }

  .child-info {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .child-grade {
    font-size: 0.85rem;
    color: #aaa;
    margin-bottom: 12px;
  }
`;
document.head.appendChild(style);
