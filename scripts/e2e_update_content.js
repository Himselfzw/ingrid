// End-to-end script using fetch to login and update content on a running server
// Usage: node scripts/e2e_update_content.js

const fetch = global.fetch || require('node-fetch');

const base = process.env.BASE_URL || 'http://localhost:3000';
const loginUrl = `${base}/admin/login`;
const loginPost = `${base}/admin/login`;
const contentPost = `${base}/admin/content`;

(async () => {
  try {
    // Fetch login page to get CSRF token and cookies
    const res1 = await fetch(loginUrl, { method: 'GET' });
    const text = await res1.text();
    const cookies = res1.headers.get('set-cookie') || '';
  // Extract CSRF token from HTML using regex to avoid extra deps
  const match = text.match(/name="_csrf"\s+value="([^"]+)"/i);
  const csrfToken = match ? match[1] : '';

    console.log('Obtained CSRF token:', csrfToken ? 'yes' : 'no');

    // Login
    const loginRes = await fetch(loginPost, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies
      },
      body: new URLSearchParams({ username: 'admin', password: 'admin123', _csrf: csrfToken })
    });

    const loginBody = await loginRes.text();
    if (loginRes.redirected) {
      console.log('Login redirected to:', loginRes.url);
    }
    const sessionCookies = loginRes.headers.get('set-cookie') || cookies;

    // Fetch admin page to ensure we have a fresh CSRF token for content POST
    const adminRes = await fetch(base + '/admin', { headers: { 'Cookie': sessionCookies } });
    const adminHtml = await adminRes.text();
  const match2 = adminHtml.match(/name="_csrf"\s+value="([^"]+)"/i);
  const csrfToken2 = match2 ? match2[1] : csrfToken;
    console.log('Obtained admin CSRF token:', csrfToken2 ? 'yes' : 'no');

    // Prepare content payload (simple change)
    const payload = new URLSearchParams();
    payload.append('heroTitle', 'E2E Test Title ' + Date.now());
    payload.append('heroSubtitle', 'Updated by e2e script');
    payload.append('aboutTitle', 'About Title');
    payload.append('aboutText1', 'About text 1');
    payload.append('aboutText2', 'About text 2');
    payload.append('contactAddress', '123 E2E St');
    payload.append('contactPhone', '+1 (555) 000-0000');
    payload.append('contactEmail', 'e2e@example.com');
    payload.append('contactHours', 'Mon-Fri 9-5');
    // Business hours fields for monday only (rest defaults will be used on server)
    payload.append('businessHours.days.monday.isClosed', '');
    payload.append('businessHours.days.monday.openTime', '09:00');
    payload.append('businessHours.days.monday.closeTime', '17:00');
    // Add a holiday
    payload.append('holidayNames', 'E2E Holiday');
    payload.append('holidayDates', new Date().toISOString().split('T')[0]);
    payload.append('holidayClosed', 'on');
    payload.append('_csrf', csrfToken2);

    const contentRes = await fetch(contentPost, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': sessionCookies
      },
      body: payload.toString()
    });

    console.log('Content update status:', contentRes.status);
    if (contentRes.ok || contentRes.status === 302) {
      console.log('Content update likely successful. Visit', base, 'to view changes.');
    } else {
      const ctext = await contentRes.text();
      console.error('Content update failed:', contentRes.status, ctext);
    }
  } catch (err) {
    console.error('E2E test failed:', err);
  }
})();
