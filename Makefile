# Default: help
.DEFAULT_GOAL := help
SHELL := /bin/bash

# Dynamic path resolution
ROOT := $(shell pwd)
VENV := $(ROOT)/.venv
PY := python3
UI := $(ROOT)/frontend
NPM := npm


.PHONY: help bootstrap install dev format lint test clean ui-install ui-dev ui-build

help: ## Show available targets
	@echo "Available targets:"
	@grep -E '^[a-zA-Z0-9_/-]+:.*?## ' $(lastword $(MAKEFILE_LIST)) | awk -F':|##' '{printf "  %-15s %s\n", $$1, $$3}'

# ---- Setup ----
bootstrap: install ui-install ## Setup everything

install: ## Install backend dependencies
	@echo "Installing backend..."
	@test -d $(VENV) || $(PY) -m venv $(VENV)
	@$(VENV)/bin/python -m pip install --upgrade pip
	@$(VENV)/bin/pip install -r requirements.txt
	@$(VENV)/bin/pip install black isort ruff pytest
	@echo "Backend ready"

ui-install: ## Install UI dependencies
	@echo "Installing UI..."
	@cd $(UI) && $(NPM) ci
	@echo "UI ready"

# ---- Development ----
dev: ## Start development servers
	@echo "Starting servers..."
	@cd $(UI) && $(NPM) run dev &
	@$(VENV)/bin/python main.py

ui-dev: ## Start UI dev server only
	@cd $(UI) && $(NPM) run dev

ui-build: ## Build UI for production
	@cd $(UI) && $(NPM) run build

# ---- Code Quality ----
format: ## Format all code
	@echo "Formatting backend..."
	@$(VENV)/bin/isort $(ROOT)
	@$(VENV)/bin/black $(ROOT)
	@echo "Formatting frontend..."
	@cd $(UI) && $(NPM) run format
	@echo "Code formatted"

lint: ## Lint all code
	@echo "Linting backend..."
	@$(VENV)/bin/ruff check $(ROOT)
	@echo "Linting frontend..."
	@cd $(UI) && $(NPM) run lint
	@echo "Linting complete"

# ---- Cleanup ----
clean: ## Clean build artifacts
	@echo "Cleaning..."
	@find $(ROOT) -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
	@find $(ROOT) -name '*.pyc' -delete 2>/dev/null || true
	@rm -rf $(ROOT)/.pytest_cache $(ROOT)/.ruff_cache $(ROOT)/htmlcov 2>/dev/null || true
	@rm -rf $(UI)/node_modules $(UI)/dist 2>/dev/null || true
	@echo "Cleanup complete"