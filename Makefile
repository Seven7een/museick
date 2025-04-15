# Makefile.mk

DEBUG_COMPOSE_FILE=docker-compose-debug.yml
DEV_COMPOSE_FILE=docker-compose-dev.yml
TEST_COMPOSE_FILE=docker-compose-test.yml

BACKEND_DIR=./museick-backend

export PATH := $(shell go env GOPATH)/bin:$(PATH)

# Check if swag command exists
ifeq (, $(shell which swag))
$(error swag could not be found. Please install it using: go install github.com/swaggo/swag/cmd/swag@latest)
endif

# Generate Swagger documentation for the backend
.PHONY: swag
swag:
	@echo "--- Generating Swagger Docs ---"
	@cd $(BACKEND_DIR) && swag init --pd

# Build all services defined in the dev compose file
.PHONY: compose-build
compose-build: swag
	@echo "--- Building Docker Images (Dev) ---"
	sudo docker compose -f $(DEV_COMPOSE_FILE) build

# Start all services defined in the dev compose file
.PHONY: compose-up
compose-up: swag
	@echo "--- Starting Docker Containers (Dev) ---"
	sudo docker compose -f $(DEV_COMPOSE_FILE) up

# Stop and remove all services defined in the dev compose file
.PHONY: compose-down
compose-down:
	@echo "--- Stopping Docker Containers (Dev) ---"
	sudo docker compose -f $(DEV_COMPOSE_FILE) down

.PHONY: compose-up-backend
compose-up-backend: swag
	@echo "--- Starting Backend and Mongo Containers (Dev) ---"
	sudo docker compose -f $(DEV_COMPOSE_FILE) up museick-backend mongo

# Run backend tests using docker compose
.PHONY: run-tests
run-tests: swag
	@echo "--- Running Backend Tests ---"
	sudo docker compose -f $(DEV_COMPOSE_FILE) -f $(TEST_COMPOSE_FILE) run --rm museick-backend

# Optional: Add a clean target to remove volumes
.PHONY: clean-volumes
clean-volumes: compose-down
	@echo "--- Removing Docker Volumes (WARNING: DATA LOSS) ---"
	sudo docker volume rm museick_mongodata museick_frontend_node_modules || true # Ignore errors if volumes don't exist

# Optional: Add a prune target for general cleanup
.PHONY: docker-prune
docker-prune:
	@echo "--- Pruning unused Docker resources ---"
	sudo docker system prune -f
	sudo docker volume prune -f

