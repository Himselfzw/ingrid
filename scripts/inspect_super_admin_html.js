(async () => {
  const fetch = global.fetch || require('node-fetch');
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const loginUrl = base + '/admin/login';
  try {
    const r1 = await fetch(loginUrl);
    const loginHtml = await r1.text();
    const matchCsrf = loginHtml.match(/name="_csrf"\s+value="([^"]+)"/i);
    const cookie = r1.headers.get('set-cookie') || '';
    const matchToken = matchCsrf ? matchCsrf[1] : '';
    const loginRes = await fetch(loginUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie }, body: new URLSearchParams({ username: 'superadmin', password: 'super123', _csrf: matchToken }) });
    const cookies = loginRes.headers.get('set-cookie') || cookie;

    const res = await fetch(base + '/admin/super', { headers: { Cookie: cookies } });
    const html = await res.text();
    console.log('super-admin HTML length:', html.length);
    console.log('signupChart present:', /id="signupChart"/.test(html));
    console.log('signupStats JSON present:', /signupStats/.test(html));
  } catch (err) {
    console.error('inspect failed', err);
  }
})();
