.PHONY: build run docker-build clean

build:
	npm install && npm run build

run:
	npm run dev

docker-build:
	docker build -t roboshop-frontend .

clean:
	rm -rf node_modules .next
