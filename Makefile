# Default: help
.DEFAULT_GOAL := help
SHELL := /bin/bash

# Dynamic path resolution - works regardless of user/location
ROOT := $(shell pwd)
VENV := $(ROOT)/.venv
PY := python3
UI := $(ROOT)/ui
NPM := npm

# Color output for better UX
GREEN := \033[32m
RED := \033[31m
BLUE := \033[34m
RESET := \033[0m

.PHONY: help bootstrap venv install dev lock format check fix lint test coverage clean \
        ui-install ui-dev ui-build ui-lint ui-format ui-stylelint ui-check ui-preview ui-clean \
        visual-test-setup visual-test-baseline visual-test-check visual-test-report \
        audit-frontend baseline-quality check-backend check-frontend verify-backend verify-frontend \
        verify-all improve-quality validate-env

help: ## Show available targets
	@echo "$(BLUE)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z0-9_/-]+:.*?## ' $(lastword $(MAKEFILE_LIST)) | awk -F':|##' '{printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$3}'

validate-env: ## Validate environment and dependencies
	@echo "$(BLUE)Validating environment...$(RESET)"
	@command -v $(PY) >/dev/null 2>&1 || (echo "$(RED)Error: $(PY) not found$(RESET)" && exit 1)
	@command -v $(NPM) >/dev/null 2>&1 || (echo "$(RED)Error: $(NPM) not found$(RESET)" && exit 1)
	@test -d $(UI) || (echo "$(RED)Error: UI directory not found at $(UI)$(RESET)" && exit 1)
	@test -f $(ROOT)/requirements.txt || (echo "$(RED)Error: requirements.txt not found$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Environment validation passed$(RESET)"

bootstrap: validate-env install dev ui-install ## Setup backend venv and UI deps

venv: validate-env ## Create venv if missing
	@echo "$(BLUE)Creating virtual environment...$(RESET)"
	@test -d $(VENV) || $(PY) -m venv $(VENV)
	@echo "$(GREEN)✅ Virtual environment ready$(RESET)"

install: venv ## Install backend requirements
	@echo "$(BLUE)Installing backend requirements...$(RESET)"
	@$(VENV)/bin/python -m pip install --upgrade pip || (echo "$(RED)Failed to upgrade pip$(RESET)" && exit 1)
	@$(VENV)/bin/pip install -r $(ROOT)/requirements.txt || (echo "$(RED)Failed to install requirements$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Backend requirements installed$(RESET)"

dev: venv ## Install backend dev tools (black, isort, ruff, pytest)
	@echo "$(BLUE)Installing development tools...$(RESET)"
	@$(VENV)/bin/pip install -U black isort ruff pytest pytest-cov || (echo "$(RED)Failed to install dev tools$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Development tools installed$(RESET)"

lock: ## Freeze current venv into requirements.txt
	@echo "$(BLUE)Freezing requirements...$(RESET)"
	@$(VENV)/bin/pip freeze > $(ROOT)/requirements.txt
	@echo "$(GREEN)✅ Requirements frozen$(RESET)"

format: venv ## Format backend (isort + black)
	@echo "$(BLUE)Formatting backend code...$(RESET)"
	@$(VENV)/bin/isort $(ROOT) || (echo "$(RED)isort failed$(RESET)" && exit 1)
	@$(VENV)/bin/black $(ROOT) || (echo "$(RED)black failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Code formatted$(RESET)"

check: venv ## Check backend formatting and lint (no changes)
	@echo "$(BLUE)Checking backend code...$(RESET)"
	@$(VENV)/bin/ruff check $(ROOT) || (echo "$(RED)Ruff check failed$(RESET)" && exit 1)
	@$(VENV)/bin/isort --check-only $(ROOT) || (echo "$(RED)Import order check failed$(RESET)" && exit 1)
	@$(VENV)/bin/black --check $(ROOT) || (echo "$(RED)Black format check failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Backend check passed$(RESET)"

fix: venv ## Auto-fix backend with Ruff, then format
	@echo "$(BLUE)Auto-fixing backend issues...$(RESET)"
	@$(VENV)/bin/ruff check --fix $(ROOT) || (echo "$(RED)Ruff fix failed$(RESET)" && exit 1)
	@$(VENV)/bin/isort $(ROOT) || (echo "$(RED)isort failed$(RESET)" && exit 1)
	@$(VENV)/bin/black $(ROOT) || (echo "$(RED)black failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Backend issues fixed$(RESET)"

lint: venv ## Lint backend with Ruff
	@echo "$(BLUE)Linting backend...$(RESET)"
	@$(VENV)/bin/ruff check $(ROOT) || (echo "$(RED)Lint check failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Lint passed$(RESET)"

test: venv ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(RESET)"
	@$(VENV)/bin/pytest || (echo "$(RED)Tests failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Tests passed$(RESET)"

coverage: venv ## Run backend tests with coverage (HTML report in htmlcov/)
	@echo "$(BLUE)Running tests with coverage...$(RESET)"
	@$(VENV)/bin/pytest --cov --cov-report=term-missing --cov-report=html || (echo "$(RED)Coverage test failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Coverage report generated$(RESET)"

clean: ## Clean Python caches, build artifacts, coverage
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	@find $(ROOT) -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find $(ROOT) -name '*.pyc' -delete 2>/dev/null || true
	@rm -rf $(ROOT)/.pytest_cache $(ROOT)/.ruff_cache $(ROOT)/.mypy_cache $(ROOT)/.coverage $(ROOT)/htmlcov $(ROOT)/build $(ROOT)/dist $(ROOT)/*.egg-info 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

# ---- UI (React) ----
ui-install: validate-env ## Install UI dependencies (npm ci)
	@echo "$(BLUE)Installing UI dependencies...$(RESET)"
	@test -f $(UI)/package.json || (echo "$(RED)Error: package.json not found in $(UI)$(RESET)" && exit 1)
	@cd $(UI) && $(NPM) ci || (echo "$(RED)npm ci failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ UI dependencies installed$(RESET)"

ui-dev: ## Start UI dev server (Vite)
	@echo "$(BLUE)Starting UI dev server...$(RESET)"
	@cd $(UI) && $(NPM) run dev

ui-build: ## Build UI for production
	@echo "$(BLUE)Building UI for production...$(RESET)"
	@cd $(UI) && $(NPM) run build || (echo "$(RED)UI build failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ UI build complete$(RESET)"

ui-preview: ## Preview built UI
	@echo "$(BLUE)Previewing built UI...$(RESET)"
	@cd $(UI) && $(NPM) run preview

ui-lint: ## Lint UI JS/JSX with ESLint
	@echo "$(BLUE)Linting UI code...$(RESET)"
	@cd $(UI) && $(NPM) run lint || (echo "$(RED)UI lint failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ UI lint passed$(RESET)"

ui-stylelint: ## Lint UI CSS with Stylelint (auto-fix)
	@echo "$(BLUE)Linting UI styles...$(RESET)"
	@cd $(UI) && $(NPM) run stylelint || (echo "$(RED)Stylelint failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Style lint complete$(RESET)"

ui-format: ## Format UI files with Prettier (write)
	@echo "$(BLUE)Formatting UI files...$(RESET)"
	@cd $(UI) && $(NPM) run format || (echo "$(RED)UI format failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ UI files formatted$(RESET)"

ui-check: ## Check UI formatting with Prettier (no write)
	@echo "$(BLUE)Checking UI formatting...$(RESET)"
	@cd $(UI) && $(NPM) exec prettier --check "src/**/*.{js,jsx,css,json,md}" || (echo "$(RED)Format check failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Format check passed$(RESET)"

ui-clean: ## Remove UI node_modules and dist
	@echo "$(BLUE)Cleaning UI build artifacts...$(RESET)"
	@rm -rf $(UI)/node_modules $(UI)/dist 2>/dev/null || true
	@echo "$(GREEN)✅ UI cleanup complete$(RESET)"

# ---- Visual Testing (Optional) ----
visual-test-setup: ## Setup Playwright for visual regression testing
	@echo "$(BLUE)🎭 Setting up Playwright for visual testing...$(RESET)"
	@test -d .local/playwright || (echo "$(RED)Error: .local/playwright directory not found$(RESET)" && exit 1)
	@cd .local/playwright && npm install && npx playwright install || (echo "$(RED)Playwright setup failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Playwright ready for visual testing$(RESET)"

visual-test-baseline: ## Capture visual regression baselines
	@echo "$(BLUE)📸 Capturing visual baselines...$(RESET)"
	@cd .local/playwright && npm run test:update || (echo "$(RED)Baseline capture failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Visual baselines captured$(RESET)"

visual-test-check: ## Run visual regression tests
	@echo "$(BLUE)🔍 Running visual regression tests...$(RESET)"
	@cd .local/playwright && npm test || (echo "$(RED)Visual tests failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Visual tests complete$(RESET)"

visual-test-report: ## View detailed visual test results
	@echo "$(BLUE)📊 Opening visual test report...$(RESET)"
	@cd .local/playwright && npm run test:report

# ---- Quality Gates ----
audit-frontend: ## Run frontend quality audit (detects agent drift)
	@echo "$(BLUE)🔍 Running frontend quality audit...$(RESET)"
	@test -f .local/scripts/audit-frontend.sh || (echo "$(RED)Error: audit-frontend.sh not found$(RESET)" && exit 1)
	@test -x .local/scripts/audit-frontend.sh || chmod +x .local/scripts/audit-frontend.sh
	@.local/scripts/audit-frontend.sh || (echo "$(RED)Frontend audit failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Quality check complete$(RESET)"

# Simplified audit commands with better error handling
audit-frontend-css: ## Run CSS architecture audit only
	@echo "$(BLUE)🎨 Running CSS architecture audit...$(RESET)"
	@test -f .local/scripts/audit-frontend.sh || (echo "$(RED)Error: audit-frontend.sh not found$(RESET)" && exit 1)
	@.local/scripts/audit-frontend.sh css || (echo "$(RED)CSS audit failed$(RESET)" && exit 1)

audit-frontend-hooks: ## Run React hooks audit only
	@echo "$(BLUE)⚛️  Running React hooks audit...$(RESET)"
	@test -f .local/scripts/audit-frontend.sh || (echo "$(RED)Error: audit-frontend.sh not found$(RESET)" && exit 1)
	@.local/scripts/audit-frontend.sh hooks || (echo "$(RED)Hooks audit failed$(RESET)" && exit 1)

audit-frontend-components: ## Run component architecture audit only
	@echo "$(BLUE)📦 Running component architecture audit...$(RESET)"
	@test -f .local/scripts/audit-frontend.sh || (echo "$(RED)Error: audit-frontend.sh not found$(RESET)" && exit 1)
	@.local/scripts/audit-frontend.sh components || (echo "$(RED)Component audit failed$(RESET)" && exit 1)

audit-frontend-agents: ## Run agent drift pattern audit only
	@echo "$(BLUE)🤖 Running agent drift pattern audit...$(RESET)"
	@test -f .local/scripts/audit-frontend.sh || (echo "$(RED)Error: audit-frontend.sh not found$(RESET)" && exit 1)
	@.local/scripts/audit-frontend.sh agents || (echo "$(RED)Agent audit failed$(RESET)" && exit 1)

audit-frontend-maintainability: ## Run CSS maintainability audit only
	@echo "$(BLUE)🔧 Running CSS maintainability audit...$(RESET)"
	@test -f .local/scripts/audit-frontend.sh || (echo "$(RED)Error: audit-frontend.sh not found$(RESET)" && exit 1)
	@.local/scripts/audit-frontend.sh maintainability || (echo "$(RED)Maintainability audit failed$(RESET)" && exit 1)

# ---- Progressive Quality Improvement ----
baseline-quality: ## Capture current quality metrics
	@echo "$(BLUE)📊 Capturing quality baseline...$(RESET)"
	@mkdir -p .local
	@echo "Backend violations:" > .local/.quality-baseline
	@$(VENV)/bin/ruff check $(ROOT) --quiet 2>/dev/null | wc -l >> .local/.quality-baseline || echo "0" >> .local/.quality-baseline
	@echo "Frontend violations:" >> .local/.quality-baseline
	@.local/scripts/audit-frontend.sh 2>/dev/null | grep "Total violations:" | sed 's/.*Total violations: //' >> .local/.quality-baseline || echo "0" >> .local/.quality-baseline
	@echo "$(GREEN)✅ Baseline captured in .local/.quality-baseline$(RESET)"
	@cat .local/.quality-baseline

check-backend: venv ## Quick backend check (lint + format check)
	@echo "$(BLUE)🔍 Quick backend check...$(RESET)"
	@$(VENV)/bin/ruff check $(ROOT) || (echo "$(RED)Backend check failed$(RESET)" && exit 1)
	@$(VENV)/bin/black --check $(ROOT) || (echo "$(RED)Format check failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Backend check passed$(RESET)"

check-frontend: ## Quick frontend check (lint + audit)
	@echo "$(BLUE)🔍 Quick frontend check...$(RESET)"
	@cd $(UI) && $(NPM) run lint || (echo "$(RED)Frontend lint failed$(RESET)" && exit 1)
	@AUDIT_OUTPUT=$$(.local/scripts/audit-frontend.sh 2>&1); \
	if echo "$$AUDIT_OUTPUT" | grep -q "✅ No violations found"; then \
		echo "$(GREEN)✅ Frontend check complete - no violations$(RESET)"; \
	else \
		echo "$(RED)❌ Frontend check found issues:$(RESET)"; \
		echo "$$AUDIT_OUTPUT" | grep -E "Total violations:" | tail -1; \
		exit 1; \
	fi

verify-backend: venv ## Full backend verification (fix + test + coverage)
	@echo "$(BLUE)🔧 Full backend verification...$(RESET)"
	@echo "$(BLUE)→ Auto-fixing issues...$(RESET)"
	@$(VENV)/bin/ruff check --fix $(ROOT) || (echo "$(RED)Ruff fix failed$(RESET)" && exit 1)
	@$(VENV)/bin/isort $(ROOT) || (echo "$(RED)isort failed$(RESET)" && exit 1)
	@$(VENV)/bin/black $(ROOT) || (echo "$(RED)black failed$(RESET)" && exit 1)
	@echo "$(BLUE)→ Running tests...$(RESET)"
	@$(VENV)/bin/pytest || (echo "$(RED)Tests failed$(RESET)" && exit 1)
	@echo "$(GREEN)✅ Backend verification complete - all tests passed$(RESET)"

verify-frontend: ## Full frontend verification (fix + lint + audit + build)
	@echo "$(BLUE)🔧 Full frontend verification...$(RESET)"
	@echo "$(BLUE)→ Auto-fixing formatting...$(RESET)"
	@cd $(UI) && $(NPM) run format || (echo "$(RED)Format failed$(RESET)" && exit 1)
	@cd $(UI) && $(NPM) run stylelint || (echo "$(RED)Stylelint failed$(RESET)" && exit 1)
	@echo "$(BLUE)→ Running linting...$(RESET)"
	@cd $(UI) && $(NPM) run lint || (echo "$(RED)Lint failed$(RESET)" && exit 1)
	@echo "$(BLUE)→ Testing production build...$(RESET)"
	@cd $(UI) && $(NPM) run build || (echo "$(RED)Build failed$(RESET)" && exit 1)
	@echo "$(BLUE)→ Running quality audit...$(RESET)"
	@AUDIT_OUTPUT=$$(.local/scripts/audit-frontend.sh 2>&1); \
	if echo "$$AUDIT_OUTPUT" | grep -q "✅ No violations found"; then \
		echo "$(GREEN)✅ Frontend verification complete - ready for production$(RESET)"; \
	else \
		echo "$(RED)❌ Frontend verification failed - quality issues detected$(RESET)"; \
		echo "$$AUDIT_OUTPUT" | grep -E "Total violations:" | tail -1; \
		exit 1; \
	fi

verify-all: verify-backend verify-frontend ## Complete project verification
	@echo ""
	@echo "$(GREEN)🎯 PROJECT VERIFICATION COMPLETE$(RESET)"
	@echo "================================="
	@echo "$(GREEN)✅ Backend: Fixed + Tested + Formatted$(RESET)"
	@echo "$(GREEN)✅ Frontend: Fixed + Linted + Built + Audited$(RESET)"  
	@echo "$(GREEN)✅ Ready for commit$(RESET)"

improve-quality: baseline-quality verify-all ## Measure and improve quality
	@echo ""
	@echo "$(BLUE)📊 QUALITY IMPROVEMENT REPORT$(RESET)"
	@echo "============================="
	@echo "$(BLUE)Before:$(RESET)"
	@cat .local/.quality-baseline
	@echo ""
	@echo "$(BLUE)After:$(RESET)" 
	@echo "Backend violations:"
	@$(VENV)/bin/ruff check $(ROOT) --quiet 2>/dev/null | wc -l || echo "0"
	@echo "Frontend violations:"
	@.local/scripts/audit-frontend.sh 2>/dev/null | grep "Total violations:" | sed 's/.*Total violations: //' || echo "0"
	@echo ""
	@echo "$(GREEN)✅ Quality improvement cycle complete$(RESET)"