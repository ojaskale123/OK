fetch('https://ok-ax2v.onrender.com/api/auth/factory-reset-123')
  .then(res => res.text())
  .then(text => console.log('Wipe Response:', text))
  .catch(err => console.error('Fetch Error:', err));
