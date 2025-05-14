# Create venv if it doesn't exist
.PHONY: venv
venv:
	test -d venv || python3 -m venv venv

# Install requirements
.PHONY: install
install: venv
	. venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

# Freeze current venv into requirements.txt
.PHONY: lock
lock:
	. venv/bin/activate && pip freeze > requirements.txt

# Lint using flake8 (must be installed in requirements.txt)
.PHONY: lint
lint:
	. venv/bin/activate && flake8