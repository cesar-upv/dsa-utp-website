import sys
import os
from PyQt6.QtWidgets import QApplication
from visualizer_window import VisualizerWindow

def main():
    app = QApplication(sys.argv)
    app.setApplicationName("UTP Schedule Graph Visualizer")
    
    window = VisualizerWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
