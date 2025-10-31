// Administration Dashboard JavaScript

const userName = sessionStorage.getItem('userName') || 'Administrator';
document.getElementById('userName').textContent = userName;

function initCharts() {
  // Engagement Trend Chart
  const engagementCtx = document.getElementById('engagementChart').getContext('2d');
  new Chart(engagementCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'System Engagement %',
        data: [78, 82, 85, 83, 87, 86],
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

  // Performance Distribution Chart
  const performanceCtx = document.getElementById('performanceChart').getContext('2d');
  new Chart(performanceCtx, {
    type: 'bar',
    data: {
      labels: ['Excellent', 'Good', 'Average', 'Needs Improvement'],
      datasets: [{
        label: 'Number of Classes',
        data: [12, 8, 3, 1],
        backgroundColor: ['#51cf66', '#00d4ff', '#ffc107', '#ff6b6b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: '#aaa' }, beginAtZero: true },
        x: { ticks: { color: '#aaa' } }
      }
    }
  });

  // Subject Engagement Chart
  const subjectCtx = document.getElementById('subjectChart').getContext('2d');
  new Chart(subjectCtx, {
    type: 'radar',
    data: {
      labels: ['Math', 'Science', 'English', 'Physics', 'Chemistry', 'Arabic'],
      datasets: [{
        label: 'Avg Engagement',
        data: [85, 88, 82, 87, 84, 79],
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#aaa' } } },
      scales: {
        r: {
          ticks: { color: '#aaa', backdropColor: 'transparent' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });

  // Monthly Active Users Chart
  const usersCtx = document.getElementById('usersChart').getContext('2d');
  new Chart(usersCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Students',
          data: [620, 635, 650, 665, 675, 680],
          borderColor: '#51cf66',
          backgroundColor: 'rgba(81, 207, 102, 0.1)',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Teachers',
          data: [38, 39, 40, 41, 42, 42],
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#aaa' } } },
      scales: {
        y: { ticks: { color: '#aaa' }, beginAtZero: true },
        x: { ticks: { color: '#aaa' } }
      }
    }
  });
}

function generateSystemReport() {
  const report = `
    <div class="report-section">
      <h3>System Overview</h3>
      <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Total Classes:</strong> 24</p>
      <p><strong>Active Students:</strong> 680</p>
      <p><strong>Active Teachers:</strong> 42</p>
    </div>
    <div class="report-section">
      <h3>Performance Metrics</h3>
      <p><strong>System-Wide Engagement:</strong> 86%</p>
      <p><strong>Average Focus Score:</strong> 84%</p>
      <p><strong>Classes Above 80%:</strong> 20 (83%)</p>
      <p><strong>Students Needing Support:</strong> 24 (3.5%)</p>
    </div>
    <div class="report-section">
      <h3>Key Insights</h3>
      <p>• Overall engagement trending upward (+3% from last month)</p>
      <p>• Science and Math classes showing highest engagement</p>
      <p>• 4 classes need additional support and resources</p>
      <p>• Teacher training program showing positive results</p>
    </div>
    <div class="report-section">
      <h3>Recommendations</h3>
      <p>• Continue current engagement strategies</p>
      <p>• Provide additional training for lower-performing classes</p>
      <p>• Implement peer mentoring program</p>
      <p>• Schedule quarterly reviews with all teachers</p>
    </div>
  `;
  document.getElementById('reportContent').innerHTML = report;
  document.getElementById('reportModal').classList.add('active');
}

function viewClass(classId) {
  const report = `
    <div class="report-section">
      <h3>Class Details</h3>
      <p><strong>Class:</strong> Grade 10-A Science</p>
      <p><strong>Teacher:</strong> Dr. Ahmed Hassan</p>
      <p><strong>Students:</strong> 28</p>
    </div>
    <div class="report-section">
      <h3>Performance</h3>
      <p><strong>Avg Engagement:</strong> 92%</p>
      <p><strong>Avg Focus:</strong> 89%</p>
      <p><strong>Participation Rate:</strong> 96%</p>
    </div>
    <div class="report-section">
      <h3>Notes</h3>
      <p>Excellent performance. Class consistently exceeds targets.</p>
    </div>
  `;
  document.getElementById('reportContent').innerHTML = report;
  document.getElementById('reportModal').classList.add('active');
}

function closeModal() {
  document.getElementById('reportModal').classList.remove('active');
}

function downloadSystemReport() {
  alert('Downloading system-wide report...');
}

function exportData() {
  alert('Exporting all system data...');
}

function manageUsers() {
  alert('Redirecting to user management panel...');
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

window.addEventListener('load', initCharts);
