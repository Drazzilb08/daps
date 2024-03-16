# Set PIPENV_VERBOSITY to suppress verbosity of pipenv commands
export PIPENV_VERBOSITY=-1

# Define a phony target 'install' to create a virtual environment and install dependencies
.PHONY: install
install: venv
	. venv/bin/activate && pipenv install --dev

# Define a phony target 'venv' to create a virtual environment if it doesn't exist
.PHONY: venv
venv:
	test -d venv || python3 -m venv venv

# Define a phony target 'lock' to lock dependencies using pipenv
.PHONY: lock
lock:
	. venv/bin/activate && pipenv lock

# Define a phony target 'lint' to run linting using flake8
.PHONY: lint
lint:
	. venv/bin/activate && pipenv run flake8
