package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/XSAM/otelsql"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	otelgin "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
)

type Product struct {
	ID          int64   `json:"id"`
	SKU         string  `json:"sku"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	ImageURL    string  `json:"imageUrl"`
	Category    string  `json:"category"`
	Stock       int     `json:"stock"`
}

var db *sql.DB

// --- Observability: metrics pillar ---
// RED latency histogram exposed at /metrics, scraped by the node agent (prometheus.io/scrape).
var httpDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
	Name:    "http_server_request_duration_seconds",
	Help:    "HTTP request latency by method, route and status.",
	Buckets: prometheus.DefBuckets,
}, []string{"method", "route", "status"})

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// --- Observability: traces pillar ---
// OTLP/gRPC tracer provider. Endpoint + resource attributes come from OTEL_* env (set in the
// manifest); we strip the scheme because the gRPC exporter wants host:port, and use an insecure
// connection (TLS is not terminated inside the cluster mesh).
func initTracer(ctx context.Context) func() {
	endpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector.obs.internal:4317")
	endpoint = strings.TrimPrefix(strings.TrimPrefix(endpoint, "http://"), "https://")

	exp, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		log.Printf("otlp exporter init failed (traces disabled): %v", err)
		return func() {}
	}
	res, _ := resource.New(ctx,
		resource.WithFromEnv(), // OTEL_SERVICE_NAME + OTEL_RESOURCE_ATTRIBUTES
		resource.WithAttributes(semconv.ServiceName(getEnv("OTEL_SERVICE_NAME", "catalogue"))),
	)
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{}, propagation.Baggage{},
	))
	return func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = tp.Shutdown(shutdownCtx)
	}
}

// --- Observability: logs pillar ---
// JSON access log on stdout carrying the active span's trace_id/span_id, so Loki's derived field
// links each line to its Jaeger trace.
func jsonLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		if c.Request.URL.Path == "/metrics" {
			return // don't log scrape traffic
		}
		sc := trace.SpanFromContext(c.Request.Context()).SpanContext()
		slog.Info("request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"trace_id", sc.TraceID().String(),
			"span_id", sc.SpanID().String(),
		)
	}
}

func prometheusMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		route := c.FullPath()
		if route == "" {
			route = "unmatched"
		}
		httpDuration.WithLabelValues(c.Request.Method, route, strconv.Itoa(c.Writer.Status())).
			Observe(time.Since(start).Seconds())
	}
}

func connectDB() {
	mysqlHost := getEnv("MYSQL_HOST", "mysql")
	mysqlUser := getEnv("MYSQL_USER", "catalogue")
	mysqlPass := getEnv("MYSQL_PASSWORD", "RoboShop@1")
	mysqlDB := getEnv("MYSQL_DATABASE", "catalogue")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?parseTime=true", mysqlUser, mysqlPass, mysqlHost, mysqlDB)

	var err error
	for i := 0; i < 30; i++ {
		// otelsql.Open wraps database/sql so every query emits a DB span under the request trace.
		db, err = otelsql.Open("mysql", dsn, otelsql.WithAttributes(semconv.DBSystemMySQL))
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Println("Connected to MySQL")
				return
			}
		}
		log.Printf("MySQL connection attempt %d/30 failed, retrying in 2s...", i+1)
		time.Sleep(2 * time.Second)
	}
	log.Fatal("Failed to connect to MySQL:", err)
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	ctx := context.Background()
	shutdown := initTracer(ctx)
	defer shutdown()

	connectDB()
	defer db.Close()

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(otelgin.Middleware(getEnv("OTEL_SERVICE_NAME", "catalogue"))) // HTTP server spans
	r.Use(prometheusMiddleware())
	r.Use(jsonLogger())
	r.Use(cors.Default())

	r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "OK", "service": "catalogue"})
	})

	r.GET("/products", getProducts)
	r.GET("/products/search", searchProducts)
	r.GET("/products/:id", getProductByID)
	r.GET("/categories", getCategories)

	port := getEnv("PORT", "8002")
	log.Printf("Catalogue service listening on port %s", port)
	r.Run(":" + port)
}

func getProducts(c *gin.Context) {
	category := c.Query("category")
	var rows *sql.Rows
	var err error

	// Pass the request context so DB spans attach to the request trace.
	if category != "" {
		rows, err = db.QueryContext(c.Request.Context(), "SELECT id, sku, name, description, price, image_url, category, stock FROM products WHERE category = ?", category)
	} else {
		rows, err = db.QueryContext(c.Request.Context(), "SELECT id, sku, name, description, price, image_url, category, stock FROM products")
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	products := scanProducts(rows)
	c.JSON(http.StatusOK, products)
}

func searchProducts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	rows, err := db.QueryContext(c.Request.Context(),
		"SELECT id, sku, name, description, price, image_url, category, stock FROM products WHERE name LIKE ? OR description LIKE ?",
		"%"+query+"%", "%"+query+"%",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	products := scanProducts(rows)
	c.JSON(http.StatusOK, products)
}

func getProductByID(c *gin.Context) {
	id := c.Param("id")
	var p Product
	err := db.QueryRowContext(c.Request.Context(),
		"SELECT id, sku, name, description, price, image_url, category, stock FROM products WHERE id = ?", id,
	).Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.Category, &p.Stock)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func getCategories(c *gin.Context) {
	rows, err := db.QueryContext(c.Request.Context(), "SELECT DISTINCT category FROM products ORDER BY category")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var cat string
		rows.Scan(&cat)
		categories = append(categories, cat)
	}
	c.JSON(http.StatusOK, categories)
}

func scanProducts(rows *sql.Rows) []Product {
	var products []Product
	for rows.Next() {
		var p Product
		rows.Scan(&p.ID, &p.SKU, &p.Name, &p.Description, &p.Price, &p.ImageURL, &p.Category, &p.Stock)
		products = append(products, p)
	}
	if products == nil {
		products = []Product{}
	}
	return products
}
