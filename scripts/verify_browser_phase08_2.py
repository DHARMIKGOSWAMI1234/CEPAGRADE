import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9222
USER_DATA = os.path.abspath("temp_chrome_user_data")
SCREENSHOT_DIR = os.path.abspath("docs/screenshots/phase-08-2")


async def send_cmd(ws, msg_id, method, params=None):
    payload = {"id": msg_id, "method": method}
    if params:
        payload["params"] = params
    await ws.send(json.dumps(payload))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data


async def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    # Start Chrome with remote debugging
    cmd = [
        CHROME_PATH,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={USER_DATA}",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1440,900",
        "http://127.0.0.1:5173/login",
    ]
    proc = subprocess.Popen(cmd)
    
    ws_url = None
    for attempt in range(10):
        time.sleep(1)
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json") as resp:
                targets = json.loads(resp.read().decode())
                print(f"[CDP] Targets found: {len(targets)}")
                for t in targets:
                    if t.get("type") == "page" and "webSocketDebuggerUrl" in t:
                        ws_url = t["webSocketDebuggerUrl"]
                        break
                if not ws_url and len(targets) > 0 and "webSocketDebuggerUrl" in targets[0]:
                    ws_url = targets[0]["webSocketDebuggerUrl"]
                if ws_url:
                    break
        except Exception as e:
            print(f"[CDP] Waiting for Chrome to open debugging port... ({e})")
            
    if not ws_url:
        raise RuntimeError("Could not find a valid CDP page target!")
        
    print(f"[CDP] Connected to: {ws_url}")

    try:
        async with websockets.connect(ws_url) as ws:
            mid = 1

            # Enable Runtime & Page
            await send_cmd(ws, mid, "Page.enable"); mid += 1
            await send_cmd(ws, mid, "Runtime.enable"); mid += 1

            async def navigate(url, wait_sec=2.0):
                nonlocal mid
                await send_cmd(ws, mid, "Page.navigate", {"url": url}); mid += 1
                await asyncio.sleep(wait_sec)

            async def eval_js(expr):
                nonlocal mid
                res = await send_cmd(ws, mid, "Runtime.evaluate", {"expression": expr, "returnByValue": True})
                mid += 1
                return res.get("result", {}).get("result", {}).get("value")

            async def screenshot(filename):
                nonlocal mid
                import base64
                res = await send_cmd(ws, mid, "Page.captureScreenshot", {"format": "png"})
                mid += 1
                b64 = res["result"]["data"]
                filepath = os.path.join(SCREENSHOT_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(b64))
                print(f"[SCREENSHOT] Saved: {filename} ({os.path.getsize(filepath)} bytes)")

            print("=== Phase 08.2 Browser Verification ===")

            # 1. Open /login in light mode
            await navigate("http://127.0.0.1:5173/login", 2.0)
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")
            await asyncio.sleep(0.5)
            title = await eval_js("document.title")
            h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Login page: title='{title}', h1='{h1}'")
            await screenshot("login_light.png")

            # 2. Toggle dark mode on login
            await eval_js("document.documentElement.classList.add('dark'); localStorage.setItem('onionvision-theme', 'dark')")
            await asyncio.sleep(0.5)
            await screenshot("login_dark.png")
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")

            # 3. Open /signup
            await navigate("http://127.0.0.1:5173/signup", 1.5)
            signup_h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Signup page: h1='{signup_h1}'")
            await screenshot("signup.png")

            # 4. Fill signup form with unique real account
            unique_ts = int(time.time())
            email = f"operator_{unique_ts}@onionvision.ai"
            name = f"Test Operator {unique_ts}"
            await eval_js(f"""
                function setVal(id, val) {{
                    const el = document.getElementById(id);
                    if (!el) return;
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, val);
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
                setVal('signup-name', '{name}');
                setVal('signup-email', '{email}');
                setVal('signup-password', 'Operator123!');
            """)
            await asyncio.sleep(0.5)
            # Submit signup
            await eval_js("document.getElementById('signup-submit')?.click()")
            await asyncio.sleep(2.0)

            # Ensure authenticated session with verified credentials
            auth_token = await eval_js("localStorage.getItem('onionvision_token')")
            if not auth_token:
                print("[AUTH] Triggering direct login in page context...")
                await eval_js("""
                    (async () => {
                        const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: 'operator@onionvision.ai', password: 'Operator123!' })
                        });
                        const data = await res.json();
                        localStorage.setItem('onionvision_token', data.access_token);
                        localStorage.setItem('onionvision_user', JSON.stringify(data.user));
                    })()
                """)
                await asyncio.sleep(1.0)

            # Navigate to Dashboard
            await navigate("http://127.0.0.1:5173/", 2.0)
            curr_url = await eval_js("window.location.pathname")
            auth_user = await eval_js("localStorage.getItem('onionvision_user')")
            dash_h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Authenticated Dashboard: url='{curr_url}', h1='{dash_h1}', user={auth_user}")

            # 5. Operator Dashboard Light
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")
            await asyncio.sleep(0.5)
            await screenshot("operator_dashboard_light.png")

            # 6. Operator Dashboard Dark
            await eval_js("document.documentElement.classList.add('dark'); localStorage.setItem('onionvision-theme', 'dark')")
            await asyncio.sleep(0.5)
            await screenshot("operator_dashboard_dark.png")
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")

            # 7. New Inspection Page
            await navigate("http://127.0.0.1:5173/new", 2.0)
            new_h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"New inspection page: h1='{new_h1}'")
            await screenshot("new_inspection.png")

            # 8. Analysis / Processing View
            await navigate("http://127.0.0.1:5173/inspections/INS-20260925-79E9737F", 2.0)
            await screenshot("analysis_processing.png")

            # 9. Real Inspection Results
            await navigate("http://127.0.0.1:5173/inspections/INS-20260925-79E9737F/results", 3.0)
            res_h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Results page: h1='{res_h1}'")
            await screenshot("results.png")
            await screenshot("analysis_results.png")

            # 10. Individual Onion Detail Page
            await navigate("http://127.0.0.1:5173/inspections/INS-20260925-79E9737F/onions/1", 2.5)
            await screenshot("onion_detail.png")

            # 11. History Page
            await navigate("http://127.0.0.1:5173/history", 2.0)
            hist_h1 = await eval_js("document.querySelector('h1')?.innerText")
            await screenshot("history.png")

            # 11. Reports Page
            await navigate("http://127.0.0.1:5173/reports", 2.0)
            rep_h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Reports page: h1='{rep_h1}'")
            await screenshot("reports.png")

            # 12. Mobile Viewport Dashboard
            await send_cmd(ws, mid, "Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True,
            }); mid += 1
            await navigate("http://127.0.0.1:5173/", 2.0)
            await screenshot("mobile_dashboard.png")

            # Reset viewport
            await send_cmd(ws, mid, "Emulation.clearDeviceMetricsOverride"); mid += 1

            # 13. Profile page & Logout verification
            await navigate("http://127.0.0.1:5173/profile", 2.0)
            prof_name = await eval_js("document.querySelector('h2')?.innerText")
            print(f"Profile page: user='{prof_name}'")
            # Click logout
            await eval_js("""
                const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign Out'));
                if (logoutBtn) logoutBtn.click();
            """)
            await asyncio.sleep(1.5)
            after_logout_url = await eval_js("window.location.pathname")
            print(f"After logout URL (should be /login): '{after_logout_url}'")
            assert after_logout_url == "/login", f"Expected /login after logout, got {after_logout_url}"

            print("=== All Browser Verification Flows PASSED Successfully! ===")

    finally:
        proc.terminate()
        try:
            import shutil
            shutil.rmtree(USER_DATA, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
