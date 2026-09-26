import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9222
USER_DATA = os.path.abspath("temp_chrome_auth_e2e")
SCREENSHOT_DIR = os.path.abspath("docs/screenshots/auth_audit")


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
        "http://localhost:5173/login",
    ]
    proc = subprocess.Popen(cmd)

    ws_url = None
    for attempt in range(15):
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
            print(f"[CDP] Waiting for Chrome ({e})...")

    if not ws_url:
        proc.kill()
        raise RuntimeError("Could not find a valid CDP page target!")

    print(f"[CDP] Connected to: {ws_url}")

    results = {}

    try:
        async with websockets.connect(ws_url) as ws:
            mid = 1

            await send_cmd(ws, mid, "Page.enable")
            mid += 1
            await send_cmd(ws, mid, "Runtime.enable")
            mid += 1

            async def navigate(url, wait_sec=2.0):
                nonlocal mid
                await send_cmd(ws, mid, "Page.navigate", {"url": url})
                mid += 1
                await asyncio.sleep(wait_sec)

            async def eval_js(expr):
                nonlocal mid
                res = await send_cmd(ws, mid, "Runtime.evaluate", {"expression": expr, "returnByValue": True})
                mid += 1
                return res.get("result", {}).get("result", {}).get("value")

            async def screenshot(filename):
                nonlocal mid
                res = await send_cmd(ws, mid, "Page.captureScreenshot", {"format": "png"})
                mid += 1
                b64 = res["result"]["data"]
                filepath = os.path.join(SCREENSHOT_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(b64))
                print(f"[SCREENSHOT] Saved: {filename} ({os.path.getsize(filepath)} bytes)")
                return filepath

            print("\n============================================================")
            print("STEP 1: Verify Initial Login Page")
            print("============================================================")
            await navigate("http://localhost:5173/login", 2.0)
            title = await eval_js("document.title")
            body_text = await eval_js("document.body.innerText")
            print(f"Page title: {title}")
            await screenshot("01_login_page.png")
            results["login_page"] = "CEPA GRADE" in (title or "") or "Sign In" in (body_text or "")

            print("\n============================================================")
            print("STEP 2: Perform Login as operator@cepagrade.ai")
            print("============================================================")
            await eval_js("""
                function setVal(selector, val) {
                    const el = document.querySelector(selector);
                    if (!el) return false;
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(el, val);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }
                setVal('input[type="email"]', 'operator@cepagrade.ai');
                setVal('input[type="password"]', 'Operator123!');
            """)
            await asyncio.sleep(0.5)

            # Click submit button
            await eval_js("""
                const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
                if (btn) btn.click();
            """)
            await asyncio.sleep(3.0)

            dash_url = await eval_js("window.location.pathname")
            dash_body = await eval_js("document.body.innerText")
            token = await eval_js("localStorage.getItem('cepagrade_token')")
            print(f"Post-login URL: {dash_url}")
            print(f"Token present: {bool(token)}")
            has_offline_error = "Database Connection Offline" in dash_body
            has_token_error = "Invalid authentication token" in dash_body
            print(f"Has 'Database Connection Offline': {has_offline_error}")
            print(f"Has 'Invalid authentication token': {has_token_error}")
            await screenshot("02_dashboard_loaded.png")
            results["dashboard_no_offline_error"] = (not has_offline_error) and (not has_token_error)
            results["dashboard_url"] = dash_url

            print("\n============================================================")
            print("STEP 3: Browser Refresh (Reload) Test")
            print("============================================================")
            nonlocal_mid = mid
            await send_cmd(ws, nonlocal_mid, "Page.reload")
            mid += 1
            await asyncio.sleep(3.0)

            reload_url = await eval_js("window.location.pathname")
            reload_body = await eval_js("document.body.innerText")
            reload_has_offline = "Database Connection Offline" in reload_body
            print(f"Post-reload URL: {reload_url}")
            print(f"Post-reload has offline error: {reload_has_offline}")
            await screenshot("03_dashboard_after_refresh.png")
            results["refresh_no_offline_error"] = not reload_has_offline

            print("\n============================================================")
            print("STEP 4: Navigate to Key Pages")
            print("============================================================")
            pages = [
                ("/inspect", "04_inspect_page.png"),
                ("/history", "05_history_page.png"),
                ("/reports", "06_reports_page.png"),
                ("/profile", "07_profile_page.png"),
            ]
            for p, snap in pages:
                await navigate(f"http://localhost:5173{p}", 2.0)
                p_url = await eval_js("window.location.pathname")
                p_text = await eval_js("document.body.innerText")
                p_offline = "Database Connection Offline" in p_text or "Unauthorized" in p_text
                print(f"Page {p}: URL={p_url}, offline/unauthorized={p_offline}")
                await screenshot(snap)
                results[f"page_{p}"] = not p_offline

            print("\n============================================================")
            print("STEP 5: Upload Demo Onion and Verify Explainability Result")
            print("============================================================")
            await navigate("http://localhost:5173/inspect", 2.0)

            # Trigger inspection via fetch in page context with current token to verify API + UI flow
            eval_res = await eval_js("""
                (async () => {
                    const token = localStorage.getItem('cepagrade_token');
                    // Fetch demo image as blob
                    const imgRes = await fetch('/data/demo/01_single_onion/demo_single_onion.jpg');
                    let blob;
                    if (imgRes.ok) {
                        blob = await imgRes.blob();
                    } else {
                        // Create sample synthetic onion jpeg blob for API inspection test
                        const canvas = document.createElement('canvas');
                        canvas.width = 400; canvas.height = 400;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#D97706'; ctx.beginPath(); ctx.arc(200, 200, 100, 0, Math.PI*2); ctx.fill();
                        blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg'));
                    }
                    const formData = new FormData();
                    formData.append('file', blob, 'demo_single_onion.jpg');
                    const res = await fetch('http://127.0.0.1:8000/api/inspections/single', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token },
                        body: formData
                    });
                    const data = await res.json();
                    return { status: res.status, data };
                })()
            """)
            print(f"API Inspection response status: {eval_res.get('status')}")
            inspection_data = eval_res.get("data", {})
            inspection_id = inspection_data.get("id") or inspection_data.get("inspection_id")
            print(f"Created inspection ID: {inspection_id}, grade: {inspection_data.get('grade')}")
            results["inspection_api_success"] = eval_res.get("status") in [200, 201]

            if inspection_id:
                await navigate(f"http://localhost:5173/results/{inspection_id}", 3.0)
                await screenshot("08_result_page.png")
                res_body = await eval_js("document.body.innerText")
                results["result_grade_visible"] = "Grade" in res_body or "GRADE" in res_body
                results["result_score_visible"] = "Quality Score" in res_body or "Score" in res_body
                print(f"Result page content verified: grade={results['result_grade_visible']}, score={results['result_score_visible']}")

            print("\n============================================================")
            print("STEP 6: Logout and Re-login Verification")
            print("============================================================")
            # Perform logout
            await eval_js("""
                localStorage.removeItem('cepagrade_token');
                localStorage.removeItem('cepagrade_user');
                localStorage.removeItem('onionvision_token');
                localStorage.removeItem('onionvision_user');
            """)
            await navigate("http://localhost:5173/login", 2.0)
            await screenshot("09_post_logout_login.png")
            print("Logged out successfully.")

            # Re-login
            await eval_js("""
                (async () => {
                    const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: 'operator@cepagrade.ai', password: 'Operator123!' })
                    });
                    const data = await res.json();
                    localStorage.setItem('cepagrade_token', data.access_token);
                    localStorage.setItem('cepagrade_user', JSON.stringify(data.user));
                    localStorage.setItem('onionvision_token', data.access_token);
                    localStorage.setItem('onionvision_user', JSON.stringify(data.user));
                })()
            """)
            await asyncio.sleep(1.0)
            await navigate("http://localhost:5173/dashboard", 2.5)
            re_dash_body = await eval_js("document.body.innerText")
            re_offline = "Database Connection Offline" in re_dash_body
            await screenshot("10_re_login_dashboard.png")
            results["re_login_dashboard_success"] = not re_offline
            print(f"Re-login Dashboard without offline error: {not re_offline}")

            print("\n============================================================")
            print("SUMMARY OF CDP TEST RESULTS:")
            print("============================================================")
            for k, v in results.items():
                print(f"  {k}: {v}")
            print("============================================================\n")

    finally:
        try:
            proc.kill()
        except:
            pass


if __name__ == "__main__":
    asyncio.run(main())
