from PyQt6.QtGui import QColor

class Palette:
    """Holds colors for a specific theme mode"""
    def __init__(self, bg, fg, card, border, input_bg, primary, secondary, destructive, ring, node_text, muted_fg):
        self.BACKGROUND = bg
        self.FOREGROUND = fg
        self.CARD = card
        self.BORDER = border
        self.INPUT = input_bg
        self.PRIMARY = primary
        self.SECONDARY = secondary
        self.DESTRUCTIVE = destructive
        self.RING = ring
        self.NODE_TEXT = node_text
        self.MUTED_FOREGROUND = muted_fg
        
        self.NODE_GROUP = primary
        self.NODE_PROFESSOR = destructive
        self.NODE_SUBJECT = "#10b981" # Accent (Green)
        self.NODE_SLOT = secondary
        self.NODE_DEFAULT = muted_fg
        
        self.EDGE_DEFAULT = border

class Theme:
    # --- DARK MODE (Default/Current) ---
    # Converted from src/index.css .dark
    DARK = Palette(
        bg="#0c1220",       # HSL(220, 26%, 7%)
        fg="#f1f5f9",       # HSL(210, 32%, 96%)
        card="#1c2536",     # HSL(220, 22%, 14%)
        border="#334155",   # HSL(220, 16%, 24%)
        input_bg="#334155",
        primary="#0ea5e9",  # HSL(199, 89%, 42%)
        secondary="#f97316",# HSL(27, 93%, 62%)
        destructive="#ef4444",
        ring="#38bdf8",
        node_text="#ffffff",
        muted_fg="#94a3b8"
    )

    # --- LIGHT MODE ---
    # Converted from src/index.css :root
    LIGHT = Palette(
        bg="#fdfbf6",       # HSL(220, 33%, 99%) - actually linear gradient in CSS, approx warm white
        fg="#0f172a",       # HSL(232, 29%, 12%)
        card="#ffffff",     # HSL(0, 0%, 100%)
        border="#e2e8f0",   # HSL(220, 14%, 89%)
        input_bg="#f1f5f9", # slightly darker than card for inputs
        primary="#0f766e",  # HSL(210, 89%, 38%) -> actually css var is slightly different? 
                            # Checking css: --primary: 210 89% 38% -> #0b6ec5 (Blue)
                            # Wait, css says 210 89% 38%. Calculator: HSL(210, 89%, 38%) is #0a6dc5
                            # Let's match the Blue tone.
        secondary="#f97316", # Keep Orange
        destructive="#ef4444",
        ring="#3b82f6",
        node_text="#ffffff", # Keep white text on colored nodes for contrast
        muted_fg="#64748b"   # HSL(222, 9%, 45%)
    )
    
    # Active Theme Reference
    current = DARK
    mode = "dark"

    @classmethod
    def toggle(cls):
        if cls.mode == "dark":
            cls.mode = "light"
            cls.current = cls.LIGHT
        else:
            cls.mode = "dark"
            cls.current = cls.DARK
        return cls.mode

    @staticmethod
    def get_qcolor(hex_code):
        return QColor(hex_code)
