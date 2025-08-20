# Default: help
.DEFAULT_GOAL := help
SHELL := /bin/bash

ROOT := /Users/drazzilb/GitHub/daps
VENV := $(ROOT)/.venv
PY := python3
UI := $(ROOT)/ui
NPM := npm

.PHONY: help bootstrap venv install dev lock format check fix lint test coverage clean \
        ui-install ui-dev ui-build ui-lint ui-format ui-stylelint ui-check ui-preview ui-clean

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_/-]+:.*?## ' $(lastword $(MAKEFILE_LIST)) | awk -F':|##' '{printf "  %-20s %s\n", $$1, $$3}'

bootstrap: install dev ui-install ## Setup backend venv and UI deps

venv: ## Create venv if missing
	test -d $(VENV) || $(PY) -m venv $(VENV)

install: venv ## Install backend requirements
	$(VENV)/bin/python -m pip install --upgrade pip
	$(VENV)/bin/pip install -r $(ROOT)/requirements.txt

dev: venv ## Install backend dev tools (black, isort, ruff, pytest)
	$(VENV)/bin/pip install -U black isort ruff pytest pytest-cov

lock: ## Freeze current venv into requirements.txt
	$(VENV)/bin/pip freeze > $(ROOT)/requirements.txt

format: venv ## Format backend (isort + black)
	$(VENV)/bin/isort $(ROOT)
	$(VENV)/bin/black $(ROOT)

check: venv ## Check backend formatting and lint (no changes)
	$(VENV)/bin/ruff check $(ROOT)
	$(VENV)/bin/isort --check-only $(ROOT)
	$(VENV)/bin/black --check $(ROOT)

fix: venv ## Auto-fix backend with Ruff, then format
	$(VENV)/bin/ruff check --fix $(ROOT)
	$(VENV)/bin/isort $(ROOT)
	$(VENV)/bin/black $(ROOT)

lint: venv ## Lint backend with Ruff
	$(VENV)/bin/ruff check $(ROOT)

test: venv ## Run backend tests
	$(VENV)/bin/pytest

coverage: venv ## Run backend tests with coverage (HTML report in htmlcov/)
	$(VENV)/bin/pytest --cov --cov-report=term-missing --cov-report=html

clean: ## Clean Python caches, build artifacts, coverage
	find $(ROOT) -name '__pycache__' -type d -prune -exec rm -rf {} +
	find $(ROOT) -name '*.pyc' -delete
	rm -rf $(ROOT)/.pytest_cache $(ROOT)/.ruff_cache $(ROOT)/.mypy_cache $(ROOT)/.coverage $(ROOT)/htmlcov $(ROOT)/build $(ROOT)/dist $(ROOT)/*.egg-info

# ---- UI (React) ----
ui-install: ## Install UI dependencies (npm ci)
	$(NPM) --prefix $(UI) ci

ui-dev: ## Start UI dev server (Vite)
	$(NPM) --prefix $(UI) run dev

ui-build: ## Build UI for production
	$(NPM) --prefix $(UI) run build

ui-preview: ## Preview built UI
	$(NPM) --prefix $(UI) run preview

ui-lint: ## Lint UI JS/JSX with ESLint
	$(NPM) --prefix $(UI) run lint

ui-stylelint: ## Lint UI CSS with Stylelint (auto-fix)
	$(NPM) --prefix $(UI) run stylelint

ui-format: ## Format UI files with Prettier (write)
	$(NPM) --prefix $(UI) run format

ui-check: ## Check UI formatting with Prettier (no write)
	$(NPM) --prefix $(UI) exec prettier --check "src/**/*.{js,jsx,css,json,md}"

ui-clean: ## Remove UI node_modules and dist
	rm -rf $(UI)/node_modules $(UI)/dist