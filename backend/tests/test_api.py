from fastapi.testclient import TestClient

from app.main import app


def client():
    return TestClient(app)


def test_health():
    with client() as c:
        r = c.get("/api/health")
        assert r.status_code == 200 and r.json()["status"] == "ok"


def test_teams_are_the_48_world_cup_teams():
    with client() as c:
        teams = c.get("/api/teams").json()
        assert len(teams) == 48
        assert {"colombia", "argentina", "estados-unidos"} <= {t["id"] for t in teams}


def test_predict_probabilities_sum_to_one():
    with client() as c:
        r = c.post("/api/predict", json={"team_a": "colombia", "team_b": "japon"})
        assert r.status_code == 200
        p = r.json()["probabilities"]
        assert abs(p["win"] + p["draw"] + p["loss"] - 1) < 0.01


def test_neutral_match_is_symmetric():
    with client() as c:
        ab = c.post("/api/predict", json={"team_a": "espana", "team_b": "brasil"}).json()["probabilities"]
        ba = c.post("/api/predict", json={"team_a": "brasil", "team_b": "espana"}).json()["probabilities"]
        assert abs(ab["win"] - ba["loss"]) < 1e-3 and abs(ab["draw"] - ba["draw"]) < 1e-3


def test_rejects_unknown_or_repeated_team():
    with client() as c:
        assert c.post("/api/predict", json={"team_a": "italia", "team_b": "japon"}).status_code == 422
        assert c.post("/api/predict", json={"team_a": "japon", "team_b": "japon"}).status_code == 422
        assert c.post("/api/predict", json={"team_a": "<script>", "team_b": "japon"}).status_code == 422


def test_teams_have_fifa_ranking_and_form():
    with client() as c:
        for t in c.get("/api/teams").json():
            assert 1 <= t["fifa_rank"] <= 211 and t["fifa_points"] > 0
            assert len(t["form"]) == 5 and set(t["form"]) <= {"V", "E", "D"}


def test_model_is_knn_with_notebook_metrics():
    with client() as c:
        m = c.get("/api/model").json()
        assert m["algorithm"].startswith("KNN")
        assert m["metrics"]["test_matches"] == 32 and m["metrics"]["hits"] == 23


def test_host_plays_as_local():
    with client() as c:
        r = c.post("/api/predict", json={"team_a": "japon", "team_b": "mexico"}).json()
        assert r["venue"] == "visitante"
