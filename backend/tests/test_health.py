from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Verify health check endpoint returns 200 and expected payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "onionvision-backend"


def test_root_endpoint(client: TestClient):
    """Verify API root endpoint provides navigation metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "ONIONVISION"
    assert "docs" in data


def test_openapi_docs(client: TestClient):
    """Verify OpenAPI specification is accessible and valid JSON."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == "ONIONVISION"
