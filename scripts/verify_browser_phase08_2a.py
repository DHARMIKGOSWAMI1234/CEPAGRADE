import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9223
USER_DATA = os.path.abspath("temp_chrome_user_data_2a")
SCREENSHOT_DIR = os.path.abspath("docs/screenshots/phase-08-2a")


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

    # Start Chrome with remote debugging on unique port
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
    for attempt in range(12):
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
            print(f"[CDP] Waiting for Chrome port {PORT}... ({e})")

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

            print("=== Phase 08.2A CEPA GRADE Browser Verification ===")

            # 1. Login Light Mode
            await navigate("http://127.0.0.1:5173/login", 2.0)
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")
            await asyncio.sleep(0.5)
            page_title = await eval_js("document.title")
            h1_text = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Login page: title='{page_title}', h1='{h1_text}'")
            await screenshot("login_light.png")

            # 2. Login Dark Mode
            await eval_js("document.documentElement.classList.add('dark'); localStorage.setItem('onionvision-theme', 'dark')")
            await asyncio.sleep(0.5)
            await screenshot("login_dark.png")
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")

            # 3. Signup Light Mode
            await navigate("http://127.0.0.1:5173/signup", 1.5)
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")
            await asyncio.sleep(0.5)
            signup_h1 = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Signup page: h1='{signup_h1}'")
            await screenshot("signup_light.png")

            # 4. Signup Dark Mode
            await eval_js("document.documentElement.classList.add('dark'); localStorage.setItem('onionvision-theme', 'dark')")
            await asyncio.sleep(0.5)
            await screenshot("signup_dark.png")
            await eval_js("document.documentElement.classList.remove('dark'); localStorage.setItem('onionvision-theme', 'light')")

            # 5. Authenticate session
            print("[AUTH] Authenticating session...")
            await eval_js("""
                (async () => {
                    const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: 'operator@onionvision.ai', password: 'Operator123!' })
                    });
                    const data = await res.json();
                    localStorage.setItem('cepagrade_token', data.access_token);
                    localStorage.setItem('cepagrade_user', JSON.stringify(data.user));
                    localStorage.setItem('onionvision_token', data.access_token);
                    localStorage.setItem('onionvision_user', JSON.stringify(data.user));
                })()
            """)
            await asyncio.sleep(1.0)

            # 6. Operator Dashboard (Desktop)
            await navigate("http://127.0.0.1:5173/", 2.0)
            dash_h2 = await eval_js("document.querySelector('h2')?.innerText")
            print(f"Operator Dashboard: greeting='{dash_h2}'")
            await screenshot("operator_dashboard.png")

            # 7. New Inspection Page
            await navigate("http://127.0.0.1:5173/new", 2.0)
            new_title = await eval_js("document.querySelector('h1')?.innerText")
            print(f"New inspection page: title='{new_title}'")
            await screenshot("new_inspection.png")

            # 8. Real Results Page
            await navigate("http://127.0.0.1:5173/inspections/INS-20260925-79E9737F/results", 3.0)
            res_title = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Results page: title='{res_title}'")
            await screenshot("real_results.png")

            # 9. Individual Onion Detail Page
            await navigate("http://127.0.0.1:5173/inspections/INS-20260925-79E9737F/onions/1", 2.5)
            onion_title = await eval_js("document.querySelector('h2')?.innerText")
            print(f"Onion detail page: title='{onion_title}'")
            await screenshot("individual_onion_detail.png")

            # 10. History Page
            await navigate("http://127.0.0.1:5173/history", 2.0)
            hist_title = await eval_js("document.querySelector('h1')?.innerText")
            print(f"History page: title='{hist_title}'")
            await screenshot("history.png")

            # 11. Report Page
            await navigate("http://127.0.0.1:5173/inspections/INS-20260925-79E9737F/report", 2.5)
            rep_title = await eval_js("document.querySelector('h1')?.innerText")
            print(f"Report page: title='{rep_title}'")
            await screenshot("report.png")

            # 12. Mobile Dashboard (390 x 844)
            await send_cmd(ws, mid, "Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True,
            }); mid += 1
            await navigate("http://127.0.0.1:5173/", 2.0)
            await screenshot("mobile_dashboard.png")

            # 13. Mobile Inspection Page (390 x 844)
            await navigate("http://127.0.0.1:5173/new", 2.0)
            await screenshot("mobile_inspection.png")

            # Clear device emulation
            await send_cmd(ws, mid, "Emulation.clearDeviceMetricsOverride"); mid += 1

            # 14. Sign Out verification
            await navigate("http://127.0.0.1:5173/profile", 2.0)
            await eval_js("""
                const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign Out'));
                if (logoutBtn) logoutBtn.click();
            """)
            await asyncio.sleep(1.5)
            after_logout = await eval_js("window.location.pathname")
            print(f"After logout pathname (should be /login): '{after_logout}'")
            assert after_logout == "/login", f"Expected redirect to /login, got {after_logout}"

            print("=== All CEPA GRADE Phase 08.2A Browser Flows Verified Successfully! ===")

    finally:
        proc.terminate()
        try:
            import shutil
            shutil.rmtree(USER_DATA, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
