// If user is already authenticated, redirect to dashboard
(function () {
  const token = localStorage.getItem('fl_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp > Date.now()) {
        if (payload.role === 'Freelancer') {
          window.location.href = '../freelancer/dashboard.html';
        } else {
          window.location.href = '../client/dashboard.html';
        }
      }
    } catch (_) {
      localStorage.removeItem('fl_token');
      localStorage.removeItem('fl_user');
    }
  }
})();
