.PHONY: build run docker-build package-lambda clean

build:
	pip install -r requirements.txt

run:
	python app.py

docker-build:
	docker build -t roboshop-notification .

package-lambda:
	mkdir -p dist
	pip install -r requirements.txt -t dist/
	cp app.py lambda_handler.py dist/
	cd dist && zip -r ../notification-lambda.zip .
	rm -rf dist

clean:
	rm -f notification-lambda.zip
	rm -rf dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
