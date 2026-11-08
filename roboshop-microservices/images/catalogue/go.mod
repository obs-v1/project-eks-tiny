module github.com/roboshop/catalogue

go 1.22

require (
	github.com/XSAM/otelsql v0.32.0
	github.com/gin-contrib/cors v1.7.2
	github.com/gin-gonic/gin v1.10.0
	github.com/go-sql-driver/mysql v1.8.1
	github.com/prometheus/client_golang v1.19.1
	go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin v0.52.0
	go.opentelemetry.io/otel v1.27.0
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.27.0
	go.opentelemetry.io/otel/sdk v1.27.0
	go.opentelemetry.io/otel/trace v1.27.0
)
