# Default: help
.DEFAULT_GOAL := help
SHELL := /bin/bash

ROOT := /Users/drazzilb/GitHub/daps
VENV := $(ROOT)/.venv
PY := python3
UI := $(ROOT)/ui
NPM := npm

.PHONY: help bootstrap venv install dev lock format check fix lint test coverage clean \
        ui-install ui-dev ui-build ui-lint ui-format ui-stylelint ui-check ui-preview ui-clean \
        visual-test-setup visual-test-baseline visual-test-check visual-test-report \
        audit-frontend baseline-quality check-backend check-frontend verify-backend verify-frontend \
        verify-all improve-quality

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

# ---- Visual Testing (Optional) ----
visual-test-setup: ## Setup Playwright for visual regression testing
	@echo "🎭 Setting up Playwright for visual testing..."
	@cd .local/playwright && npm install && npx playwright install
	@echo "✅ Playwright ready for visual testing"

visual-test-baseline: ## Capture visual regression baselines
	@echo "📸 Capturing visual baselines..."
	@cd .local/playwright && npm run test:update
	@echo "✅ Visual baselines captured"

visual-test-check: ## Run visual regression tests
	@echo "🔍 Running visual regression tests..."
	@cd .local/playwright && npm test
	@echo "✅ Visual tests complete"

visual-test-report: ## View detailed visual test results
	@echo "📊 Opening visual test report..."
	@cd .local/playwright && npm run test:report

# ---- Quality Gates ----
audit-frontend: ## Run frontend quality audit (detects agent drift)
	@echo "🔍 Running frontend quality audit..."
	@.local/scripts/audit-frontend.sh
	@echo "✅ Quality check complete"

audit-frontend-css: ## Run CSS architecture audit only
	@echo "🎨 Running CSS architecture audit..."
	@.local/scripts/audit-frontend.sh css

audit-frontend-hooks: ## Run React hooks audit only
	@echo "⚛️  Running React hooks audit..."
	@.local/scripts/audit-frontend.sh hooks

audit-frontend-components: ## Run component architecture audit only
	@echo "📦 Running component architecture audit..."
	@.local/scripts/audit-frontend.sh components

audit-frontend-agents: ## Run agent drift pattern audit only
	@echo "🤖 Running agent drift pattern audit..."
	@.local/scripts/audit-frontend.sh agents

audit-frontend-maintainability: ## Run CSS maintainability audit only
	@echo "🔧 Running CSS maintainability audit..."
	@.local/scripts/audit-frontend.sh maintainability

# ---- Progressive Quality Improvement ----
baseline-quality: ## Capture current quality metrics
	@echo "📊 Capturing quality baseline..."
	@echo "Backend violations:" > .local/.quality-baseline
	@$(VENV)/bin/ruff check $(ROOT) --quiet 2>/dev/null | wc -l >> .local/.quality-baseline || echo "0" >> .local/.quality-baseline
	@echo "Frontend violations:" >> .local/.quality-baseline
	@.local/scripts/audit-frontend.sh 2>/dev/null | grep "Total violations:" | sed 's/.*Total violations: //' >> .local/.quality-baseline || echo "0" >> .local/.quality-baseline
	@echo "✅ Baseline captured in .local/.quality-baseline"
	@cat .local/.quality-baseline

check-backend: venv ## Quick backend check (lint + format check)
	@echo "🔍 Quick backend check..."
	@$(VENV)/bin/ruff check $(ROOT) --quiet
	@$(VENV)/bin/black --check $(ROOT) --quiet
	@echo "✅ Backend check passed"

check-frontend: ## Quick frontend check (lint + audit)
	@echo "🔍 Quick frontend check..."
	@$(NPM) --prefix $(UI) run lint --silent
	@AUDIT_OUTPUT=$$(.local/scripts/audit-frontend.sh); \
	if echo "$$AUDIT_OUTPUT" | grep -q "✅ No violations found"; then \
		echo "✅ Frontend check complete - no violations"; \
	else \
		echo "❌ Frontend check found issues:"; \
		echo "$$AUDIT_OUTPUT" | grep -E "Total violations:" | tail -1; \
		exit 1; \
	fi

verify-backend: venv ## Full backend verification (fix + test + coverage)
	@echo "🔧 Full backend verification..."
	@echo "→ Auto-fixing issues..."
	@$(VENV)/bin/ruff check --fix $(ROOT) --quiet
	@$(VENV)/bin/isort $(ROOT) --quiet
	@$(VENV)/bin/black $(ROOT) --quiet
	@echo "→ Running tests..."
	@$(VENV)/bin/pytest --quiet
	@echo "✅ Backend verification complete - all tests passed"

verify-frontend: ## Full frontend verification (fix + lint + audit + build)
	@echo "🔧 Full frontend verification..."
	@echo "→ Auto-fixing formatting..."
	@$(NPM) --prefix $(UI) run format --silent
	@$(NPM) --prefix $(UI) run stylelint --silent
	@echo "→ Running linting..."
	@$(NPM) --prefix $(UI) run lint --silent
	@echo "→ Testing production build..."
	@$(NPM) --prefix $(UI) run build --silent
	@echo "→ Running quality audit..."
	@AUDIT_OUTPUT=$$(.local/scripts/audit-frontend.sh); \
	if echo "$$AUDIT_OUTPUT" | grep -q "✅ No violations found"; then \
		echo "✅ Frontend verification complete - ready for production"; \
	else \
		echo "❌ Frontend verification failed - quality issues detected"; \
		echo "$$AUDIT_OUTPUT" | grep -E "Total violations:" | tail -1; \
		exit 1; \
	fi

verify-all: verify-backend verify-frontend ## Complete project verification
	@echo ""
	@echo "🎯 PROJECT VERIFICATION COMPLETE"
	@echo "================================="
	@echo "✅ Backend: Fixed + Tested + Formatted"
	@echo "✅ Frontend: Fixed + Linted + Built + Audited"  
	@echo "✅ Ready for commit"

improve-quality: baseline-quality verify-all ## Measure and improve quality
	@echo ""
	@echo "📊 QUALITY IMPROVEMENT REPORT"
	@echo "============================="
	@echo "Before:"
	@cat .local/.quality-baseline
	@echo ""
	@echo "After:" 
	@echo "Backend violations:"
	@$(VENV)/bin/ruff check $(ROOT) --quiet 2>/dev/null | wc -l || echo "0"
	@echo "Frontend violations:"
	@.local/scripts/audit-frontend.sh 2>/dev/null | grep "Total violations:" | sed 's/.*Total violations: //' || echo "0"
	@echo ""
	@echo "✅ Quality improvement cycle complete"

