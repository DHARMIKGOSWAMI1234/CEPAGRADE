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


def test_get_me_unauthenticated(client: TestClient):
    """Test /api/auth/me returns 401 when no token is provided."""
    response = client.get("/api/auth/me")
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
