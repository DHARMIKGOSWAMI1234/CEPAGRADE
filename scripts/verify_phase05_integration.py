import urllib.request
import json
import uuid
from pathlib import Path

BASE = 'http://127.0.0.1:8000'
VITE = 'http://localhost:5173'

print("=" * 60)
print("ONIONVISION PHASE 05 — REAL END-TO-END INTEGRATION TEST")
print("=" * 60)

# 1. Health
h = json.loads(urllib.request.urlopen(f'{BASE}/api/health').read().decode())
assert h['status'] == 'ok' and h['models_ready'] == True, f'Health failed: {h}'
print('[PASS] Health check: Backend online & ML models ready')

# 2. Upload real image with multipart
test_images = list(Path('data/processed/segmentation/images/test').glob('*.jpg'))
assert len(test_images) > 0, "No real test images found"
test_img = test_images[0]
print(f'Using real test image: {test_img.name} ({test_img.stat().st_size} bytes)')

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
from app.core.security import create_access_token

test_token = create_access_token(data={"sub": "phase05_operator", "email": "phase05@cepagrade.ai", "role": "operator"})
auth_headers = {"Authorization": f"Bearer {test_token}"}

boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="{test_img.name}"\r\n'
    f'Content-Type: image/jpeg\r\n\r\n'
).encode('latin1') + test_img.read_bytes() + f'\r\n--{boundary}--\r\n'.encode('latin1')

req = urllib.request.Request(
    f'{BASE}/api/inspections?process=true&reference_diameter_mm=25.0',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}', **auth_headers},
    method='POST'
)
resp = urllib.request.urlopen(req)
assert resp.status == 201
up_data = json.loads(resp.read().decode())
insp_id = up_data['inspection_id']
print(f'[PASS] Created & executed real CV inspection: {insp_id}')

# 3. Details
req_det = urllib.request.Request(f'{BASE}/api/inspections/{insp_id}', headers=auth_headers)
det = json.loads(urllib.request.urlopen(req_det).read().decode())
assert det['status'] in ['completed', 'review_required']
assert det['total_onions'] > 0
assert len(det['onions']) == det['total_onions']
assert det['overlay_url'] is not None
print(f'[PASS] Inspection details verified: {det["total_onions"]} onions detected, Quality Score: {det["quality_score"]}')

# 4. Check Overlay Image
req_overlay = urllib.request.Request(f'{BASE}/api/inspections/{insp_id}/overlay', headers=auth_headers)
overlay_resp = urllib.request.urlopen(req_overlay)
assert overlay_resp.status == 200
overlay_bytes = overlay_resp.read()
assert len(overlay_bytes) > 1000
print(f'[PASS] Segmentation overlay image verified ({len(overlay_bytes)} bytes)')

# 5. Check Onion 1 Details & Crops
req_onion1 = urllib.request.Request(f'{BASE}/api/inspections/{insp_id}/onions/1', headers=auth_headers)
onion1 = json.loads(urllib.request.urlopen(req_onion1).read().decode())
assert onion1['onion_number'] == 1
assert 'morphometry' in onion1 and onion1['morphometry'] is not None
assert onion1['grade'] in ['Grade A', 'Grade B', 'Grade C', 'Reject']
print(f'[PASS] Onion #1 details: Grade={onion1["grade"]}, Class={onion1["quality_class"]}, Confidence={onion1["confidence"]:.2f}')

req_crop = urllib.request.Request(f'{BASE}/api/inspections/{insp_id}/onions/1/crop', headers=auth_headers)
crop_resp = urllib.request.urlopen(req_crop)
assert crop_resp.status == 200
crop_bytes = crop_resp.read()

req_mask = urllib.request.Request(f'{BASE}/api/inspections/{insp_id}/onions/1/mask', headers=auth_headers)
mask_resp = urllib.request.urlopen(req_mask)
assert mask_resp.status == 200
mask_bytes = mask_resp.read()
print(f'[PASS] Individual crop ({len(crop_bytes)} bytes) and masked crop ({len(mask_bytes)} bytes) verified')

# 6. Check History Listing
req_hist = urllib.request.Request(f'{BASE}/api/inspections', headers=auth_headers)
hist = json.loads(urllib.request.urlopen(req_hist).read().decode())
assert any(i['inspection_id'] == insp_id for i in hist)
print(f'[PASS] Inspection successfully listed in database history (Total batches: {len(hist)})')

# 7. Check Report
req_rep = urllib.request.Request(f'{BASE}/api/inspections/{insp_id}/report', headers=auth_headers)
rep = json.loads(urllib.request.urlopen(req_rep).read().decode())
assert rep['inspection_id'] == insp_id
print(f'[PASS] Report endpoint verified: status={rep["status"]}')

# 8. Check Vite Dev Server Proxy
vite_proxy = json.loads(urllib.request.urlopen(f'{VITE}/api/health').read().decode())
assert vite_proxy['status'] == 'ok'
print('[PASS] Vite dev server proxy to FastAPI verified on port 5173')

print("=" * 60)
print("ALL REAL END-TO-END INTEGRATION CHECKS PASSED SUCCESSFULLY!")
print("=" * 60)
