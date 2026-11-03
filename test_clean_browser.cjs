const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9362;
  const browser = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\EL-Dawlia\\.gemini\\antigravity\\scratch\\test_edge_profile3',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

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

  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER CONSOLE:', d.params.type, d.params.args.map(a => a.value || a.description).join(' '));
    }
    if (d.method === 'Runtime.exceptionThrown') {
      console.log('BROWSER EXCEPTION:', JSON.stringify(d.params.exceptionDetails));
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');

  await send('Page.navigate', { url: 'http://localhost:5173' });
  await new Promise(r => setTimeout(r, 3000));

  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  };

  // Click login
  console.log('Clicking login...');
  await evalJs(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('تسجيل الدخول'));
    if (b) b.click();
  })()`);

  await new Promise(r => setTimeout(r, 1000));

  // Fill credentials and click submit
  console.log('Filling credentials...');
  await evalJs(`(() => {
    const email = document.querySelector('input[type="email"]');
    const pass = document.querySelector('input[type="password"]');
    const setVal = (el, val) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setVal(email, '2ndprepplanet@gmail.com');
    setVal(pass, '06062012@Mostafa');
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('دخول المنصة'));
    if (submitBtn) submitBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 2000));

  // Click "الدخول إلى المنصة"
  console.log('Entering platform...');
  await evalJs(`(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('الدخول إلى المنصة'));
    if (b) b.click();
  })()`);

  await new Promise(r => setTimeout(r, 2000));

  // Check state in admin overview
  const overviewState = await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const mains = Array.from(document.querySelectorAll('main'));
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
    return {
      hasAside: !!aside,
      h1s,
      mainsCount: mains.length,
      mainHtmlSnippet: mains[mains.length - 1]?.innerHTML.slice(0, 300)
    };
  })()`);
  console.log('Overview state:', overviewState);

  // Now click on "الدروس"
  console.log('Clicking "الدروس"...');
  await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const btns = Array.from(aside.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('الدروس'));
    if (b) b.click();
  })()`);

  await new Promise(r => setTimeout(r, 1500));

  const lessonsState = await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const mains = Array.from(document.querySelectorAll('main'));
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
    const activeBtn = aside ? aside.querySelector('.text-cyan-300')?.innerText : 'none';
    return {
      activeBtn,
      h1s,
      mainsCount: mains.length,
      mainHtmlSnippet: mains[mains.length - 1]?.innerHTML.slice(0, 400),
      mainClientHeight: mains[mains.length - 1]?.clientHeight
    };
  })()`);
  console.log('Lessons state:', lessonsState);

  // Now click on "الطلاب والمشرفون"
  console.log('Clicking "الطلاب والمشرفون"...');
  await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const btns = Array.from(aside.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.includes('الطلاب والمشرفون'));
    if (b) b.click();
  })()`);

  await new Promise(r => setTimeout(r, 1500));

  const studentsState = await evalJs(`(() => {
    const aside = document.querySelector('aside');
    const mains = Array.from(document.querySelectorAll('main'));
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText);
    const activeBtn = aside ? aside.querySelector('.text-cyan-300')?.innerText : 'none';
    return {
      activeBtn,
      h1s,
      mainsCount: mains.length,
      mainHtmlSnippet: mains[mains.length - 1]?.innerHTML.slice(0, 400)
    };
  })()`);
  console.log('Students state:', studentsState);

  browser.kill();
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
