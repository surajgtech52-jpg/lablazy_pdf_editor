import os

from flask import Flask, jsonify, request, send_from_directory
import requests


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
GOOGLE_APPS_SCRIPT_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbx2hOBzHbF5LWk1-xeMOKKP4H5XLDjlqdcY3jbsU0SMk_SLDsJsTrN_E9fpN1cBXKg/exec"
)


@app.post("/api/feedback")
def submit_feedback():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    priority = str(payload.get("priority", "")).strip()
    description = str(payload.get("description", "")).strip()

    if not email or "@" not in email:
        return jsonify(error="Please provide a valid email address."), 400
    if priority not in {"Low", "Normal", "High", "Urgent"}:
        return jsonify(error="Please choose a valid priority."), 400
    if not description or len(description) > 2000:
        return jsonify(error="Description must contain 1 to 2000 characters."), 400

    try:
        response = requests.post(
            GOOGLE_APPS_SCRIPT_URL,
            json={
                "email": email,
                "priority": priority,
                "description": description,
            },
            timeout=15,
        )
        response.raise_for_status()
    except requests.RequestException:
        app.logger.exception("Could not send feedback to Google Apps Script")
        return jsonify(error="The report could not be saved. Please try again."), 502

    return jsonify(message="Feedback saved."), 201


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
