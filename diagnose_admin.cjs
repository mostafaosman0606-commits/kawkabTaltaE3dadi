const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9350;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    'http://localhost:5173'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const listJson = await new Promise((res, rej) => http.get(`http://127.0.0.1:${port}/json/list`, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej));

  const page = listJson.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p = {}) => new Promise((resolve, reject) => {
    const cur = id++;
    const h = e => {
      const d = JSON.parse(e.data);
      if (d.id === cur) {
        ws.removeEventListener('message', h);
        if (d.error) reject(d.error);
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  };

  await new Promise(r => setTimeout(r, 3000));

  // Initialize DB and admin in localStorage
  await evalJs(`(() => {
    // Check if profiles exist in localStorage
    let users = JSON.parse(localStorage.getItem('kawkab_users_v8') || '[]');
    let admin = users.find(u => u.role === 'admin' || u.email === '2ndprepplanet@gmail.com');
    if (!admin) {
      admin = {
        id: 'admin-1',
        email: '2ndprepplanet@gmail.com',
        password: '06062012@Mostafa',
        fullName: 'مصطفى عثمان (الإدارة)',
        role: 'admin',
        phoneNumber: '01103075485',
        governorate: 'القاهرة',
        subscriptionTier: 'premium',
        subscriptionStatus: 'active',
        isSuspended: false
      };
      users.push(admin);
      localStorage.setItem('kawkab_users_v8', JSON.stringify(users));
    }
    localStorage.setItem('kawkab_current_user_id_v8', admin.id);
  })()`);

  // Reload page to pick up admin session
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 3000));

  // Now click enter platform
  const enterRes = await evalJs(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('الدخول إلى المنصة'));
    if (b) { b.click(); return 'Clicked enter platform'; }
    return 'Enter button not found. Buttons: ' + btns.map(b => b.innerText).join(', ');
  })()`);
  console.log('Enter platform:', enterRes);

  await new Promise(r => setTimeout(r, 2000));

  // Check what is rendered
  const domInfo = await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const main = document.querySelector('main');
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
    const mainHtml = main ? main.innerHTML : 'No main';
    const mainClientHeight = main ? main.clientHeight : 0;
    const mainScrollHeight = main ? main.scrollHeight : 0;
    const mainOffsetHeight = main ? main.offsetHeight : 0;
    const computedDisplay = main ? getComputedStyle(main).display : 'none';
    const computedVisibility = main ? getComputedStyle(main).visibility : 'none';
    const computedOpacity = main ? getComputedStyle(main).opacity : 'none';
    return {
      hasAside: !!aside,
      h1s,
      mainHtmlSnippet: mainHtml.slice(0, 500),
      mainHtmlLength: mainHtml.length,
      mainClientHeight,
      mainScrollHeight,
      mainOffsetHeight,
      computedDisplay,
      computedVisibility,
      computedOpacity,
      bodyHtmlSnippet: document.body.innerHTML.slice(0, 1000)
    };
  })()`);
  console.log('DOM info in admin overview:', domInfo);

  // Now click on "الدروس"
  console.log('Clicking "الدروس"...');
  const clickLessons = await evalJs(`(() => {
    const aside = document.querySelector('aside');
    if (!aside) return 'No aside';
    const btns = Array.from(aside.querySelectorAll('button'));
    const target = btns.find(b => b.innerText.includes('الدروس'));
    if (target) {
      target.click();
      return 'Clicked: ' + target.innerText;
    }
    return 'Not found among: ' + btns.map(b => b.innerText).join(', ');
  })()`);
  console.log('Click result:', clickLessons);

  await new Promise(r => setTimeout(r, 1500));

  const afterClickDom = await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const mains = Array.from(document.querySelectorAll('main'));
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
    const activeBtn = aside ? aside.querySelector('.text-cyan-300')?.innerText : 'none';
    return {
      h1s,
      activeBtn,
      mainsCount: mains.length,
      mainsInfo: mains.map(m => ({
        htmlLen: m.innerHTML.length,
        snippet: m.innerHTML.slice(0, 300),
        clientHeight: m.clientHeight,
        computedDisplay: getComputedStyle(m).display
      })),
      allForms: document.querySelectorAll('form').length,
      errorsInConsole: window.__errors || []
    };
  })()`);
  console.log('After clicking lessons DOM:', afterClickDom);

  browser.kill();
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
