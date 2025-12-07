from .theme import Theme

def get_stylesheet():
    p = Theme.current
    
    return f"""
    QMainWindow {{
        background-color: {p.BACKGROUND};
        color: {p.FOREGROUND};
    }}
    
    QWidget {{
        background-color: {p.BACKGROUND};
        color: {p.FOREGROUND};
        font-family: 'Space Grotesk', 'DM Sans', sans-serif;
        font-size: 14px;
    }}
    
    /* Buttons */
    QPushButton {{
        background-color: {p.CARD};
        color: {p.FOREGROUND};
        border: 1px solid {p.BORDER};
        border-radius: 12px;
        padding: 8px 16px;
        font-weight: 600;
    }}
    
    QPushButton:hover {{
        background-color: {p.BORDER};
        border: 1px solid {p.RING};
    }}
    
    QPushButton:pressed {{
        background-color: {p.PRIMARY};
        color: #ffffff;
    }}
    
    /* Inputs */
    QLineEdit {{
        background-color: {p.INPUT};
        border: 1px solid {p.BORDER};
        border-radius: 12px;
        padding: 8px;
        color: {p.FOREGROUND};
        selection-background-color: {p.PRIMARY};
    }}
    
    QLineEdit:focus {{
        border: 1px solid {p.RING};
        background-color: {p.CARD};
    }}
    
    /* Combo Box */
    QComboBox {{
        background-color: {p.INPUT};
        border: 1px solid {p.BORDER};
        border-radius: 12px;
        padding: 8px;
        padding-right: 20px;
        color: {p.FOREGROUND};
    }}
    
    QComboBox::drop-down {{
        subcontrol-origin: padding;
        subcontrol-position: top right;
        width: 25px;
        border-left-width: 0px;
        border-top-right-radius: 12px;
        border-bottom-right-radius: 12px;
    }}
    
    QComboBox QAbstractItemView {{
        background-color: {p.CARD};
        border: 1px solid {p.BORDER};
        selection-background-color: {p.PRIMARY};
        selection-color: #ffffff;
        outline: none;
    }}
    
    /* Sliders */
    QSlider::groove:horizontal {{
        border: 1px solid {p.BORDER};
        height: 8px;
        background: {p.INPUT};
        margin: 2px 0;
        border-radius: 4px;
    }}

    QSlider::handle:horizontal {{
        background: {p.PRIMARY};
        border: 1px solid {p.PRIMARY};
        width: 18px;
        height: 18px;
        margin: -6px 0;
        border-radius: 9px;
    }}
    
    /* Text Areas / Docks */
    QTextEdit, QPlainTextEdit {{
        background-color: {p.CARD};
        border: 1px solid {p.BORDER};
        border-radius: 12px;
        padding: 10px;
        color: {p.FOREGROUND};
    }}
    
    QDockWidget::title {{
        text-align: left;
        background: {p.CARD};
        padding-left: 10px;
        padding-top: 4px;
        border-radius: 12px;
        color: {p.FOREGROUND};
    }}
    
    /* Headers / Labels */
    QLabel {{
        color: {p.MUTED_FOREGROUND};
        font-weight: 500;
    }}
    
    QCheckBox {{
        color: {p.FOREGROUND};
        spacing: 8px;
    }}
    
    QCheckBox::indicator {{
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 1px solid {p.BORDER};
        background: {p.INPUT};
    }}
    
    QCheckBox::indicator:checked {{
        background-color: {p.PRIMARY};
        border-color: {p.PRIMARY};
    }}

    /* Scrollbars */
    QScrollBar:vertical {{
        border: none;
        background: {p.INPUT};
        width: 10px;
        margin: 0px 0px 0px 0px;
        border-radius: 5px;
    }}
    QScrollBar::handle:vertical {{
        background: {p.MUTED_FOREGROUND};
        min-height: 20px;
        border-radius: 5px;
    }}
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
        height: 0px;
    }}
    """
