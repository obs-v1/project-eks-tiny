.PHONY: build run docker-build db-init clean

build:
	mvn clean package -DskipTests

run:
	DB_HOST=localhost mvn spring-boot:run

docker-build:
	docker build -t roboshop-shipping .

db-init:
	mysql -h $${MYSQL_HOST:-localhost} -u root -pRoboShop@1 < db/app-user.sql
	mysql -h $${MYSQL_HOST:-localhost} -u root -pRoboShop@1 < db/schema.sql

clean:
	mvn clean
