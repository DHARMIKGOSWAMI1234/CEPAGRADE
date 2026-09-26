from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.db.models import User, Inspection
from app.core.security import hash_password, create_access_token


def test_signup_success(client: TestClient):
    """Test successful user registration with valid credentials."""
    payload = {
        "name": "Jane Operator",
        "email": "jane.op@onionvision.ai",
        "password": "SecurePassword123!",
        "role": "operator",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["name"] == "Jane Operator"
    assert data["user"]["email"] == "jane.op@onionvision.ai"
    assert data["user"]["role"] == "operator"
    assert "password_hash" not in data["user"]


def test_signup_duplicate_email(client: TestClient):
    """Test that registering an existing email returns 400 Bad Request."""
    payload = {
        "name": "First User",
        "email": "duplicate@onionvision.ai",
        "password": "password123",
        "role": "operator",
    }
    res1 = client.post("/api/auth/signup", json=payload)
    assert res1.status_code == 201

    # Second signup with same email
    res2 = client.post("/api/auth/signup", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()


def test_signup_invalid_email(client: TestClient):
    """Test that malformed email is rejected by schema validation with 422."""
    payload = {
        "name": "Bad Email User",
        "email": "not-an-email",
        "password": "password123",
        "role": "operator",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 422


def test_signup_short_password(client: TestClient):
    """Test that weak password (< 6 chars) is rejected with 422."""
    payload = {
        "name": "Short Password User",
        "email": "short@onionvision.ai",
        "password": "123",
        "role": "operator",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 422


def test_signup_admin_role_rejection(client: TestClient):
    """Test that users cannot self-register with admin role."""
    payload = {
        "name": "Attacker",
        "email": "attacker@onionvision.ai",
        "password": "password123",
        "role": "admin",
    }
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 422


def test_login_success(client: TestClient):
    """Test successful login with registered credentials."""
    # Register user
    signup_payload = {
        "name": "John Supervisor",
        "email": "john.sup@onionvision.ai",
        "password": "password123",
        "role": "supervisor",
    }
    client.post("/api/auth/signup", json=signup_payload)

    # Login
    login_payload = {
        "email": "john.sup@onionvision.ai",
        "password": "password123",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "john.sup@onionvision.ai"
    assert data["user"]["role"] == "supervisor"


def test_login_invalid_password(client: TestClient):
    """Test that incorrect password returns 401 Unauthorized."""
    signup_payload = {
        "name": "User One",
        "email": "user1@onionvision.ai",
        "password": "correct_password",
    }
    client.post("/api/auth/signup", json=signup_payload)

    login_payload = {
        "email": "user1@onionvision.ai",
        "password": "wrong_password",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_login_nonexistent_email(client: TestClient):
    """Test that logging in with non-existent email returns 401 Unauthorized."""
    login_payload = {
        "email": "ghost@onionvision.ai",
        "password": "some_password",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401


def test_get_me_authenticated(client: TestClient):
    """Test /api/auth/me returns current user details with valid Bearer token."""
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "name": "Inspector Dave",
            "email": "dave@onionvision.ai",
            "password": "mypassword",
            "role": "inspector",
        },
    )
    token = signup_res.json()["access_token"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == "dave@onionvision.ai"
    assert user_data["name"] == "Inspector Dave"
    assert user_data["role"] == "inspector"


from app.core.firebase_auth import create_test_firebase_token, create_test_token


def test_get_me_unauthenticated(unauthenticated_client: TestClient):
    """Test /api/auth/me returns 401 when no token is provided."""
    response = unauthenticated_client.get("/api/auth/me")
    assert response.status_code == 401


def test_get_me_invalid_token(client: TestClient):
    """Test /api/auth/me returns 401 when token is tampered/invalid."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.token.payload"},
    )
    assert response.status_code == 401


def test_logout_endpoint(client: TestClient):
    """Test /api/auth/logout endpoint confirms logout."""
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "name": "Farmer Bob",
            "email": "bob@onionvision.ai",
            "password": "farmpassword",
            "role": "farmer",
        },
    )
    token = signup_res.json()["access_token"]

    response = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_user_ownership_scoping(client: TestClient, db_session: Session):
    """Test that inspection list returns user-scoped records for authenticated operator."""
    # Create two users
    u1_res = client.post(
        "/api/auth/signup",
        json={"name": "Operator 1", "email": "op1@onionvision.ai", "password": "password123", "role": "operator"},
    )
    u1_token = u1_res.json()["access_token"]
    u1_id = u1_res.json()["user"]["id"]

    u2_res = client.post(
        "/api/auth/signup",
        json={"name": "Operator 2", "email": "op2@onionvision.ai", "password": "password123", "role": "operator"},
    )
    u2_token = u2_res.json()["access_token"]
    u2_id = u2_res.json()["user"]["id"]

    # Insert inspections directly
    insp1 = Inspection(inspection_id="INS-USER1-TEST", image_path="test.jpg", status="completed", user_id=u1_id)
    insp2 = Inspection(inspection_id="INS-USER2-TEST", image_path="test.jpg", status="completed", user_id=u2_id)
    insp_unassigned = Inspection(inspection_id="INS-LEGACY-TEST", image_path="test.jpg", status="completed", user_id=None)
    db_session.add_all([insp1, insp2, insp_unassigned])
    db_session.commit()

    # User 1 requests list
    r1 = client.get("/api/inspections", headers={"Authorization": f"Bearer {u1_token}"})
    assert r1.status_code == 200
    ids_u1 = [item["inspection_id"] for item in r1.json()]
    assert "INS-USER1-TEST" in ids_u1
    assert "INS-LEGACY-TEST" in ids_u1  # Legacy unassigned visible
    assert "INS-USER2-TEST" not in ids_u1  # Other user's private data not exposed


# =========================================================================
# PHASE 08.3 — FIREBASE AUTHENTICATION & INSPECTION OWNERSHIP TESTS (PART 20)
# =========================================================================

def test_missing_authorization_header_returns_401(unauthenticated_client: TestClient):
    """1. missing Authorization header → 401"""
    response = unauthenticated_client.get("/api/inspections")
    assert response.status_code == 401
    assert "authentication required" in response.json()["detail"].lower()


def test_malformed_authorization_header_returns_401(unauthenticated_client: TestClient):
    """2. malformed Authorization header → 401"""
    # Non-bearer scheme
    res1 = unauthenticated_client.get("/api/inspections", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert res1.status_code == 401
    assert "malformed" in res1.json()["detail"].lower()

    # Bearer with empty token
    res2 = unauthenticated_client.get("/api/inspections", headers={"Authorization": "Bearer"})
    assert res2.status_code == 401

    # Bearer with whitespace only
    res3 = unauthenticated_client.get("/api/inspections", headers={"Authorization": "Bearer   "})
    assert res3.status_code == 401


def test_invalid_firebase_token_returns_401(unauthenticated_client: TestClient):
    """3. invalid Firebase token → 401"""
    valid_token = create_test_firebase_token("u1", "u1@test.com")
    tampered_token = valid_token[:-4] + "xxxx"
    res = unauthenticated_client.get(
        "/api/inspections",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert res.status_code == 401
    assert "invalid" in res.json()["detail"].lower() or "authentication failed" in res.json()["detail"].lower()


def test_expired_firebase_token_returns_401(unauthenticated_client: TestClient):
    """4. expired Firebase token → 401"""
    expired_token = create_test_firebase_token(
        uid="expired-user-123",
        email="expired@cepagrade.ai",
        expires_in_sec=-3600,
    )
    res = unauthenticated_client.get(
        "/api/inspections",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_valid_firebase_token_resolves_authenticated_user(unauthenticated_client: TestClient):
    """5. valid Firebase token → authenticated user"""
    valid_token = create_test_firebase_token(
        uid="valid-uid-999",
        email="operator999@cepagrade.ai",
        role="operator",
        name="Operator Nine",
        expires_in_sec=3600,
    )
    res = unauthenticated_client.get(
        "/api/inspections",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_unverified_firebase_user_returns_403(unauthenticated_client: TestClient):
    """6. unverified Firebase user → 403 where protected (Part 13)"""
    unverified_token = create_test_firebase_token(
        uid="unverified-uid-555",
        email="unverified@cepagrade.ai",
        email_verified=False,
    )
    res = unauthenticated_client.get(
        "/api/inspections",
        headers={"Authorization": f"Bearer {unverified_token}"},
    )
    assert res.status_code == 403
    assert "email verification required" in res.json()["detail"].lower()


def test_authenticated_user_creates_inspection(unauthenticated_client: TestClient, valid_jpeg_bytes: bytes):
    """7. authenticated user creates inspection"""
    tok = create_test_firebase_token("user-creator-1", "creator@cepagrade.ai")
    res = unauthenticated_client.post(
        "/api/inspections",
        files={"file": ("batch.jpg", valid_jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["inspection_id"].startswith("INS-")


def test_inspection_owner_id_equals_verified_firebase_uid(
    unauthenticated_client: TestClient,
    db_session: Session,
    valid_jpeg_bytes: bytes,
):
    """8. inspection owner_id equals verified Firebase UID"""
    target_firebase_uid = "firebase-auth-uid-unique-789"
    tok = create_test_firebase_token(uid=target_firebase_uid, email="verified_uid@cepagrade.ai")
    res = unauthenticated_client.post(
        "/api/inspections",
        files={"file": ("batch.jpg", valid_jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert res.status_code == 201
    insp_id = res.json()["inspection_id"]

    insp = db_session.query(Inspection).filter(Inspection.inspection_id == insp_id).first()
    assert insp is not None
    assert insp.owner_id == target_firebase_uid


def test_user_accesses_own_inspection(unauthenticated_client: TestClient, valid_jpeg_bytes: bytes):
    """9. user accesses own inspection"""
    tok = create_test_firebase_token("user-owner-1", "owner@cepagrade.ai")
    res_create = unauthenticated_client.post(
        "/api/inspections",
        files={"file": ("batch.jpg", valid_jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {tok}"},
    )
    insp_id = res_create.json()["inspection_id"]

    res_get = unauthenticated_client.get(
        f"/api/inspections/{insp_id}",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert res_get.status_code == 200
    assert res_get.json()["inspection_id"] == insp_id


def test_user_cannot_access_another_users_inspection(unauthenticated_client: TestClient, valid_jpeg_bytes: bytes):
    """10. user cannot access another user's inspection"""
    tok_owner = create_test_firebase_token("user-alice-uid", "alice@cepagrade.ai")
    tok_other = create_test_firebase_token("user-bob-uid", "bob@cepagrade.ai")

    res_create = unauthenticated_client.post(
        "/api/inspections",
        files={"file": ("alice_batch.jpg", valid_jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {tok_owner}"},
    )
    insp_id = res_create.json()["inspection_id"]

    # Bob attempts to access Alice's inspection
    res_unauth_access = unauthenticated_client.get(
        f"/api/inspections/{insp_id}",
        headers={"Authorization": f"Bearer {tok_other}"},
    )
    assert res_unauth_access.status_code == 403
    assert "access denied" in res_unauth_access.json()["detail"].lower()


def test_user_cannot_access_another_users_results(unauthenticated_client: TestClient, valid_jpeg_bytes: bytes):
    """11. user cannot access another user's results"""
    tok_owner = create_test_firebase_token("user-alice-results", "alice@cepagrade.ai")
    tok_other = create_test_firebase_token("user-bob-results", "bob@cepagrade.ai")

    res_create = unauthenticated_client.post(
        "/api/inspections",
        files={"file": ("alice_batch.jpg", valid_jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {tok_owner}"},
    )
    insp_id = res_create.json()["inspection_id"]

    # Bob attempts to access Alice's results
    res_unauth_results = unauthenticated_client.get(
        f"/api/inspections/{insp_id}/results",
        headers={"Authorization": f"Bearer {tok_other}"},
    )
    assert res_unauth_results.status_code == 403
    assert "access denied" in res_unauth_results.json()["detail"].lower()


def test_user_cannot_access_another_users_report(unauthenticated_client: TestClient, valid_jpeg_bytes: bytes):
    """12. user cannot access another user's report"""
    tok_owner = create_test_firebase_token("user-alice-report", "alice@cepagrade.ai")
    tok_other = create_test_firebase_token("user-bob-report", "bob@cepagrade.ai")

    res_create = unauthenticated_client.post(
        "/api/inspections",
        files={"file": ("alice_batch.jpg", valid_jpeg_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {tok_owner}"},
    )
    insp_id = res_create.json()["inspection_id"]

    # Bob attempts to access Alice's report metadata
    res_rep = unauthenticated_client.get(
        f"/api/inspections/{insp_id}/report",
        headers={"Authorization": f"Bearer {tok_other}"},
    )
    assert res_rep.status_code == 403

    # Bob attempts to download Alice's PDF
    res_pdf = unauthenticated_client.get(
        f"/api/inspections/{insp_id}/report/pdf",
        headers={"Authorization": f"Bearer {tok_other}"},
    )
    assert res_pdf.status_code == 403


def test_invalid_token_cannot_access_protected_resources(unauthenticated_client: TestClient):
    """13. invalid token cannot access protected resources"""
    bad_token = "Bearer this.is.a.completely.invalid.token"
    # Attempt list inspections
    res1 = unauthenticated_client.get("/api/inspections", headers={"Authorization": bad_token})
    assert res1.status_code == 401

    # Attempt get specific inspection
    res2 = unauthenticated_client.get("/api/inspections/INS-TEST-FAKE", headers={"Authorization": bad_token})
    assert res2.status_code == 401

    # Attempt get reports
    res3 = unauthenticated_client.get("/api/reports/INS-TEST-FAKE", headers={"Authorization": bad_token})
    assert res3.status_code == 401


def test_demo_access_success_and_rate_limit(client: TestClient):
    """Verifies that demo access succeeds for 2 attempts, then is rate-limited on 3rd attempt."""
    dev_id = "test-device-uuid-12345"

    # 1st attempt: should succeed
    res1 = client.post("/api/auth/demo", json={"device_id": dev_id})
    assert res1.status_code == 200
    data1 = res1.json()
    assert "access_token" in data1
    assert data1["user"]["role"] == "operator"

    # 2nd attempt: should succeed
    res2 = client.post("/api/auth/demo", json={"device_id": dev_id})
    assert res2.status_code == 200

    # 3rd attempt: should return 429 Too Many Requests
    res3 = client.post("/api/auth/demo", json={"device_id": dev_id})
    assert res3.status_code == 429
    assert "Demo access limit reached" in res3.json()["detail"]

    # Different device ID should still succeed
    res_other = client.post("/api/auth/demo", json={"device_id": "different-device-9999"})
    assert res_other.status_code == 200


