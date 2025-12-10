#!/bin/bash
# setup_visualizer.sh

TOOLS_DIR="$(dirname "$0")/../tools/graph_visualizer"
VENV_DIR="$TOOLS_DIR/venv"

echo "Setting up Graph Visualizer..."

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate and install
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$TOOLS_DIR/requirements.txt"

echo "Setup complete. To run: npm run visualize-graph"
