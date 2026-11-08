import os
import time
import logging
import pymysql
from flask import Flask, request, jsonify
from flask_cors import CORS

from obs import setup_json_logging
setup_json_logging()
logger = logging.getLogger("ratings")

app = Flask(__name__)
CORS(app)
# metrics pillar: PrometheusMetrics adds /metrics for the node agent scrape
from prometheus_flask_exporter import PrometheusMetrics
metrics = PrometheusMetrics(app)

MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql")
MYSQL_USER = os.getenv("MYSQL_USER", "ratings")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "RoboShop@1")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "ratings")


def get_db():
    for i in range(30):
        try:
            conn = pymysql.connect(
                host=MYSQL_HOST,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True,
            )
            return conn
        except Exception as e:
            logger.warning(f"MySQL connection attempt {i+1}/30 failed: {e}")
            time.sleep(2)
    raise Exception("Failed to connect to MySQL")


@app.route("/health")
def health():
    return jsonify({"status": "OK", "service": "ratings"})


@app.route("/ratings", methods=["POST"])
def add_rating():
    data = request.json
    product_id = data.get("productId")
    user_id = data.get("userId")
    score = data.get("score")
    review = data.get("review", "")

    if not all([product_id, user_id, score]):
        return jsonify({"error": "productId, userId, and score are required"}), 400

    if not (1 <= int(score) <= 5):
        return jsonify({"error": "Score must be between 1 and 5"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO ratings (product_id, user_id, score, review)
                   VALUES (%s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE score = %s, review = %s""",
                (product_id, user_id, score, review, score, review),
            )
        logger.info(f"Rating added: product={product_id}, user={user_id}, score={score}")
        return jsonify({"status": "ok"})
    finally:
        conn.close()


@app.route("/ratings/product/<int:product_id>")
def get_ratings(product_id):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, product_id, user_id, score, review, created_at FROM ratings WHERE product_id = %s ORDER BY created_at DESC",
                (product_id,),
            )
            ratings = cursor.fetchall()
        return jsonify(ratings)
    finally:
        conn.close()


@app.route("/ratings/product/<int:product_id>/average")
def get_average(product_id):
    conn = get_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT AVG(score) as average, COUNT(*) as count FROM ratings WHERE product_id = %s",
                (product_id,),
            )
            result = cursor.fetchone()
        return jsonify({
            "productId": product_id,
            "average": float(result["average"]) if result["average"] else 0,
            "count": result["count"],
        })
    finally:
        conn.close()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8006")))
