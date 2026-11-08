.PHONY: build run docker-build db-init clean

build:
	pip install -r requirements.txt

run:
	MYSQL_HOST=localhost python app.py

docker-build:
	docker build -t roboshop-ratings .

db-init:
	mysql -h $${MYSQL_HOST:-localhost} -u root -pRoboShop@1 < db/app-user.sql
	mysql -h $${MYSQL_HOST:-localhost} -u root -pRoboShop@1 < db/schema.sql

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
