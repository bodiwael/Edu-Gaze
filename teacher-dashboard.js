// Teacher Dashboard JavaScript

const userName = sessionStorage.getItem('userName') || 'Teacher';
document.getElementById('userName').textContent = userName;

function initCharts() {
  const emotionCtx = document.getElementById('emotionChart').getContext('2d');
  new Chart(emotionCtx, {
    type: 'doughnut',
    data: {
      labels: ['Happy', 'Confused', 'Neutral', 'Disengaged'],
      datasets: [{
        data: [42, 18, 28, 12],
        backgroundColor: ['#51cf66', '#ffc107', '#00d4ff', '#ff6b6b'],
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

  const engagementCtx = document.getElementById('engagementChart').getContext('2d');
  new Chart(engagementCtx, {
    type: 'bar',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Focus Level',
        data: [82, 85, 87, 89],
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: '#007bff',
        borderWidth: 2
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
}

function generateReport() {
  const report = `
    <div class="report-section">
      <h3>Session Summary</h3>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Duration:</strong> 45 minutes</p>
      <p><strong>Students Present:</strong> 28</p>
    </div>
    <div class="report-section">
      <h3>Key Metrics</h3>
      <p><strong>Average Focus:</strong> 87% (Excellent)</p>
      <p><strong>Happiness Level:</strong> 82% (Very Good)</p>
      <p><strong>Participation:</strong> 64% actively engaged</p>
      <p><strong>Issues Detected:</strong> 3 students need attention</p>
    </div>
    <div class="report-section">
      <h3>Recommendations</h3>
      <p>• Continue current teaching pace - students highly engaged</p>
      <p>• Follow up with struggling students</p>
      <p>• Introduce interactive activities</p>
      <p>• Schedule one-on-one sessions as needed</p>
    </div>
  `;
  document.getElementById('reportContent').innerHTML = report;
  document.getElementById('reportModal').classList.add('active');
}

function uploadJSON() {
  document.getElementById('uploadModal').classList.add('active');
}

function closeModal() {
  document.getElementById('reportModal').classList.remove('active');
  document.getElementById('uploadModal').classList.remove('active');
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      document.getElementById('uploadStatus').innerHTML = 
        `<p style="color: #51cf66;">File uploaded successfully! Processing ${Object.keys(data).length} records.</p>`;
      setTimeout(() => closeModal(), 2000);
    } catch (err) {
      document.getElementById('uploadStatus').innerHTML = 
        `<p style="color: #ff6b6b;">Invalid JSON file. Please check the format.</p>`;
    }
  };
  reader.readAsText(file);
}

function downloadReport() {
  alert('Report will be downloaded as PDF');
}

function shareReport() {
  alert('Share functionality integrated with email system');
}

function exportCSV() {
  alert('Class data exported as CSV');
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

function viewDetails(studentName) {
  const report = `
    <div class="report-section">
      <h3>Student Details: ${studentName}</h3>
      <p><strong>Overall Engagement:</strong> 89%</p>
      <p><strong>Focus Time:</strong> 38 minutes</p>
      <p><strong>Primary Emotion:</strong> Happy</p>
      <p><strong>Blink Rate:</strong> Normal</p>
    </div>
    <div class="report-section">
      <h3>Recommendations</h3>
      <p>Continue monitoring progress and provide positive feedback.</p>
    </div>
  `;
  document.getElementById('reportContent').innerHTML = report;
  document.getElementById('reportModal').classList.add('active');
}

window.addEventListener('load', initCharts);
