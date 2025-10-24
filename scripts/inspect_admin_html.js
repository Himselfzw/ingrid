(async () => {
  const fetch = global.fetch || require('node-fetch');
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const loginUrl = base + '/admin/login';
  try {
    // Get login page to get cookie and csrf
    const r1 = await fetch(loginUrl);
    const loginHtml = await r1.text();
    const matchCsrf = loginHtml.match(/name="_csrf"\s+value="([^"]+)"/i);
    console.log('Login page CSRF present:', !!matchCsrf);

    // attempt to login with seeded admin using cookie
    const cookie = r1.headers.get('set-cookie') || '';
    const matchToken = matchCsrf ? matchCsrf[1] : '';
    const loginRes = await fetch(loginUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie }, body: new URLSearchParams({ username: 'admin', password: 'admin123', _csrf: matchToken }) });
    const cookies = loginRes.headers.get('set-cookie') || cookie;

    const adminRes = await fetch(base + '/admin', { headers: { Cookie: cookies } });
    const adminHtml = await adminRes.text();
    console.log('Admin HTML length:', adminHtml.length);
    console.log('csrf-holder present:', /id="csrf-holder"/.test(adminHtml));
    console.log('sidebar present:', /id="sidebar"/.test(adminHtml));
    console.log('signupChart present:', /id="signupChart"/.test(adminHtml));
    console.log('signupStats JSON present:', /signupStats/.test(adminHtml));
  } catch (err) {
    console.error('inspect failed', err);
  }
})();
