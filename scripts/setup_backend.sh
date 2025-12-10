#!/bin/bash

# Define backend directory
BACKEND_DIR="$(dirname "$0")/../backend"
VENV_DIR="$BACKEND_DIR/venv"

echo "Setting up backend environment..."

# Check if venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
else
    echo "Virtual environment already exists."
fi

# Activate venv and install requirements
echo "Installing requirements..."
"$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

# Build Cython extensions
echo "Building Cython extensions..."
cd "$BACKEND_DIR"
"$VENV_DIR/bin/python" setup.py build_ext --inplace
cd ..

echo "Backend setup complete."
