from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QPushButton, QLabel, QFileDialog, QComboBox, QDockWidget,
                             QTextEdit, QLineEdit, QCheckBox, QSlider)
from PyQt6.QtCore import Qt
from graph_widget import GraphWidget
from data_loader import DataLoader
import os
import json

from ui.styles import get_stylesheet
from ui.theme import Theme

class VisualizerWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Visualizador de Grafos UTP")
        self.resize(1200, 800)
        self.showMaximized()
        self.setStyleSheet(get_stylesheet())
        
        self.loader = DataLoader()
        
        # Central Widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        self.layout = QVBoxLayout(central_widget)
        
        # Toolbar / Control Panel
        controls_layout = QHBoxLayout()
        
        self.btn_load = QPushButton("Cargar JSON")
        self.btn_load.clicked.connect(self.load_file)
        controls_layout.addWidget(self.btn_load)
        
        self.btn_export = QPushButton("Exportar HTML (PyVis)")
        self.btn_export.clicked.connect(self.export_pyvis)
        controls_layout.addWidget(self.btn_export)

        self.btn_theme = QPushButton("Temas") # Unicode causing issues in some envs, using text or handled via icon later if needed
        self.btn_theme.setFixedWidth(40)
        self.btn_theme.setToolTip("Cambiar Tema")
        self.btn_theme.clicked.connect(self.toggle_theme)
        controls_layout.addWidget(self.btn_theme)
        
        self.lbl_status = QLabel("Ningún archivo cargado")
        controls_layout.addWidget(self.lbl_status)
        
        controls_layout.addStretch()

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Buscar nodos...")
        self.search_input.textChanged.connect(self.filter_nodes)
        self.search_input.setFixedWidth(200)
        controls_layout.addWidget(self.search_input)
        
        
        self.combo_layout = QComboBox()
        self.combo_layout.addItems(["Spring", "Jerárquico", "Kamada-Kawai", "Circular", "Shell", "Aleatorio"])
        self.combo_layout.currentTextChanged.connect(self.change_layout)
        controls_layout.addWidget(QLabel("Distribución:"))
        controls_layout.addWidget(self.combo_layout)

        controls_layout.addWidget(QLabel("Espaciado:"))
        self.slider_spacing = QSlider(Qt.Orientation.Horizontal)
        self.slider_spacing.setRange(500, 5000)
        self.slider_spacing.setValue(2000)
        self.slider_spacing.setFixedWidth(150)
        self.slider_spacing.valueChanged.connect(self.change_spacing)
        controls_layout.addWidget(self.slider_spacing)

        self.layout.addLayout(controls_layout)
        
        # Graph Area
        self.graph_widget = GraphWidget()
        self.graph_widget.nodeClicked.connect(self.show_node_details)
        self.graph_widget.backgroundClicked.connect(lambda: self.filter_nodes(self.search_input.text()))
        self.layout.addWidget(self.graph_widget)
        
        # Stats Dock
        # Stats Dock
        self.dock = QDockWidget("Estadísticas", self)
        
        # Use QTextBrowser for clickable links
        from PyQt6.QtWidgets import QTextBrowser
        self.stats_text = QTextBrowser()
        self.stats_text.setOpenExternalLinks(False)
        self.stats_text.setReadOnly(True)
        self.stats_text.anchorClicked.connect(self.on_sidebar_link_click)
        
        self.dock.setWidget(self.stats_text)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.dock)

    def on_sidebar_link_click(self, url):
        node_id = url.toString()
        if node_id:
            self.graph_widget.select_node(node_id)

    def filter_nodes(self, text):
        self.graph_widget.highlight_nodes(text)

    def change_spacing(self, value):
        self.graph_widget.set_layout_scale(value)

    def load_file(self):
        # Default starting path (project root/data)
        start_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
        
        file_path, _ = QFileDialog.getOpenFileName(
            self, 
            "Abrir Horario JSON", 
            start_dir, 
            "Archivos JSON (*.json);;Todos los archivos (*)"
        )
        
        if file_path:
            try:
                self.lbl_status.setText(f"Cargando: {os.path.basename(file_path)}...")
                graph = self.loader.load_file(file_path)
                self.graph_widget.set_graph(graph)
                self.lbl_status.setText(f"Cargado: {os.path.basename(file_path)}")
                self.update_stats()
            except Exception as e:
                self.lbl_status.setText(f"Error: {str(e)}")
                print(e)
    
    def change_layout(self, layout_name):
        mapping = {
            "Jerárquico": "hierarchical",
            "Aleatorio": "random",
            "Circular": "circular",
            "Spring": "spring",
            "Shell": "shell",
            "Kamada-Kawai": "kamada-kawai"
        }
        internal_name = mapping.get(layout_name, "spring")
        self.graph_widget.set_layout_algorithm(internal_name)

    def update_stats(self):
        stats = self.loader.get_stats()
        text = "<h3>Estadísticas del Grafo</h3>"
        text += f"<b>Nodos:</b> {stats['nodes']}<br>"
        text += f"<b>Aristas:</b> {stats['edges']}<br><br>"
        text += "<b>Tipos de Nodos:</b><ul>"
        for t, count in stats['types'].items():
            text += f"<li>{t}: {count}</li>"
        text += "</ul>"
        self.stats_text.setHtml(text)
        
    def toggle_theme(self):
        from ui.theme import Theme
        new_mode = Theme.toggle()
        self.btn_theme.setText("Claro" if new_mode == "light" else "Oscuro")
        self.setStyleSheet(get_stylesheet())
        self.graph_widget.reload_theme()
        # Update stats text color? It resets content style.
        self.update_stats() 

    def show_node_details(self, node_id, data):
        text = f"<h3>Nodo Seleccionado</h3>"
        text += f"<b>ID:</b> {node_id}<br>"
        text += "<hr>"
        
        # Show specific fields first
        label = data.get("Label")
        if label:
            text += f"<b>Etiqueta:</b> {label}<br>"
            
        type_ = data.get("Type")
        if type_:
            text += f"<b>Tipo:</b> {type_}<br>"

        for k, v in data.items():
            if k not in ["Label", "Type", "color", "subset", "title", "group"]: 
                text += f"<b>{k}:</b> {v}<br>"
        
        # Find neighbors
        if self.loader.graph:
            neighbors = set()
            try:
                import networkx as nx 
                neighbors = set(nx.all_neighbors(self.loader.graph, node_id))
            except Exception: 
                pass 
            
            if not neighbors:
                neighbors = list(self.loader.graph.neighbors(node_id))
            
            neighbor_by_type = {}
            translate_type = {"Group": "Grupos", "Professor": "Profesores", "Subject": "Materias"}

            for n in neighbors:
                n_data = self.loader.graph.nodes.get(n, {})
                n_label = n_data.get("Label", n)
                n_type = n_data.get("Type", "Other")
                t_key = translate_type.get(n_type, n_type + "s")
                
                if t_key not in neighbor_by_type:
                    neighbor_by_type[t_key] = []
                
                # HTML Link for interaction
                from ui.theme import Theme
                link_color = Theme.current.PRIMARY
                # We use the node ID as the href
                link_html = f'<a href="{n}" style="color: {link_color}; text-decoration: none; font-weight:bold;">{n_label}</a> <span style="font-size:0.9em;">({n})</span>'
                neighbor_by_type[t_key].append(link_html)
            
            if neighbor_by_type:
                text += "<br><b>Vecinos:</b><br>"
                for t, items in neighbor_by_type.items():
                    text += f"<u>{t}:</u><ul>"
                    for item in items:
                        text += f"<li>{item}</li>"
                    text += "</ul>"

        self.stats_text.setHtml(text)

    def export_pyvis(self):
        if not self.loader.graph:
            self.lbl_status.setText("Ningún grafo para exportar")
            return
        
        try:
            from pyvis.network import Network
            import webbrowser
            import networkx as nx
            
            # Prepare graph - colors and labels
            from ui.theme import Theme
            p = Theme.current
            pyvis_graph = self.loader.graph.copy()
            for n, d in pyvis_graph.nodes(data=True):
                t = d.get("Type", "Unknown") # 'Professor', 'Group', 'Subject'
                
                # Colors matching the app theme
                if t == "Group": color, group = p.NODE_GROUP, "Grupos"
                elif t == "Professor": color, group = p.NODE_PROFESSOR, "Profesores"
                elif t == "Subject": color, group = p.NODE_SUBJECT, "Materias"
                else: color, group = p.NODE_DEFAULT, "Otros"
                
                d["color"] = color
                d["group"] = group # Use 'group' for easier filtering in JS
                d["title"] = d.get("Label", str(n)) 
                d["label"] = d.get("Label", str(n)) 

            # Create network - Disable default menus
            # We use 'rgba(0,0,0,0)' for background to let CSS control it
            net = Network(height="100vh", width="100%", bgcolor="rgba(0,0,0,0)", font_color="white", select_menu=False, filter_menu=False)
            net.from_nx(pyvis_graph)
            
            # Physics Configuration
            net.toggle_physics(True)
            net.set_options("""
            var options = {
              "physics": {
                "forceAtlas2Based": {
                  "gravitationalConstant": -50,
                  "centralGravity": 0.01,
                  "springLength": 100,
                  "springConstant": 0.08
                },
                "maxVelocity": 50,
                "solver": "forceAtlas2Based",
                "timestep": 0.35,
                "stabilization": { "enabled": true, "iterations": 1000 }
              },
              "nodes": {
                 "font": { "size": 16, "face": "Outfit", "color": "#ffffff", "strokeWidth": 2, "strokeColor": "#000000" },
                 "shape": "dot",
                 "size": 14
              },
              "edges": {
                 "color": { "inherit": true },
                 "smooth": { "type": "continuous" }
              },
              "interaction": {
                 "hover": true, 
                 "tooltipDelay": 200,
                 "hideEdgesOnDrag": true 
              }
            }
            """)
            
            # --- LAYOUT PRE-CALCULATION ---
            # Generate static positions for different visualization modes to support switching without Python
            layout_data = {}
            scale = 1.0 # layout scale for JS (Normalized)
            
            # 1. Spring (Static) - The specific look the user likes
            pos_spring = nx.spring_layout(pyvis_graph, k=0.15, iterations=50, scale=scale, seed=42)
            layout_data['spring'] = {str(n): {'x': float(x), 'y': float(y)} for n, (x, y) in pos_spring.items()}

            # 2. Circular
            pos_circ = nx.circular_layout(pyvis_graph, scale=scale)
            layout_data['circular'] = {str(n): {'x': float(x), 'y': float(y)} for n, (x, y) in pos_circ.items()}
            
            # 2. Kamada-Kawai
            try:
                pos_kk = nx.kamada_kawai_layout(pyvis_graph, scale=scale)
                layout_data['kamada'] = {str(n): {'x': float(x), 'y': float(y)} for n, (x, y) in pos_kk.items()}
            except:
                layout_data['kamada'] = layout_data['circular'] # Fallback
                
            # 3. Shell
            try:
                pos_shell = nx.shell_layout(pyvis_graph, scale=scale)
                layout_data['shell'] = {str(n): {'x': float(x), 'y': float(y)} for n, (x, y) in pos_shell.items()}
            except:
                layout_data['shell'] = layout_data['circular']

            # 4. Hierarchical (Custom Logic Ported from GraphWidget)
            # Layers: Professor(0) -> Group(1) -> Subject(2) -> Others(3)
            h_layers = {}
            for n, d in pyvis_graph.nodes(data=True):
                t = d.get("Type", "Unknown")
                if t == "Professor": sub = 0
                elif t == "Group": sub = 1
                elif t == "Subject": sub = 2
                else: sub = 3
                h_layers.setdefault(sub, []).append(n)
            
            # Sorting
            if 0 in h_layers: h_layers[0].sort(key=lambda x: pyvis_graph.nodes[x].get("Label", str(x)))
            
            # Helper for avg pos
            idx_map_0 = {n: i for i, n in enumerate(h_layers.get(0, []))}
            def get_avg(node, param_map):
                nbrs = [nb for nb in pyvis_graph.neighbors(node) if nb in param_map]
                for nb in pyvis_graph.predecessors(node): 
                    if nb in param_map: nbrs.append(nb)
                if not nbrs: return 999999
                val = sum(param_map[n] for n in nbrs) / len(nbrs)
                return val

            if 1 in h_layers: h_layers[1].sort(key=lambda x: get_avg(x, idx_map_0))
            if 2 in h_layers:
                 idx_map_1 = {n: i for i, n in enumerate(h_layers.get(1, []))}
                 h_layers[2].sort(key=lambda x: get_avg(x, idx_map_1))
                 
            # Assign Positions (x=layer, y=rank)
            pos_hier = {}
            x_spacing = scale * 1.5
            y_spacing = scale * 0.4
            
            for l_idx in sorted(h_layers.keys()):
                nodes_in_layer = h_layers[l_idx]
                h = (len(nodes_in_layer) - 1) * y_spacing
                y_start = -h / 2
                for i, node in enumerate(nodes_in_layer):
                    pos_hier[str(node)] = {'x': float(l_idx * x_spacing), 'y': float(y_start + i * y_spacing)}
            
            layout_data['hierarchical'] = pos_hier
            
            layout_json = json.dumps(layout_data)
            # --- END LAYOUT PRE-CALCULATION ---
            
            output_file = os.path.abspath("graph_export.html")
            net.write_html(output_file)
            
            # --- CUSTOM UI INJECTION ---
            with open(output_file, 'r', encoding='utf-8') as f:
                html = f.read()

            # 1. Custom CSS
            # 1. Custom CSS
            # We use a separate f-string for the variables to avoid escaping hell
            # 1. Custom CSS
            # Design Tokens matching React App
            css_vars = f"""
                :root {{
                    /* LIGHT MODE TOKENS */
                    --background: {Theme.LIGHT.BACKGROUND};
                    --text: {Theme.LIGHT.FOREGROUND};
                    --border: {Theme.LIGHT.BORDER};
                    --card: {Theme.LIGHT.CARD};
                    --primary: {Theme.LIGHT.PRIMARY};
                    
                    /* Controls (Inputs/Buttons) */
                    --control-bg: #f1f5f9; /* Slate 100 */
                    --control-border: #e2e8f0;
                    --control-text: #0f172a;
                    --control-hover: #e2e8f0;
                    
                    /* Text Utilities */
                    --muted-foreground: #64748b; /* Slate 500 */
                    
                    /* Highlight Colors (Ghosting) */
                    --ghost-node: #e2e8f0; /* Light Gray for dissolving */
                    --ghost-edge: #f1f5f9;
                }}
                
                body.dark {{
                    /* DARK MODE TOKENS */
                    --background: {Theme.DARK.BACKGROUND};
                    --text: {Theme.DARK.FOREGROUND};
                    --border: {Theme.DARK.BORDER};
                    --card: {Theme.DARK.CARD};
                    --primary: {Theme.DARK.PRIMARY};
                    
                    /* Controls */
                    --control-bg: #1e293b; /* Slate 800 */
                    --control-border: #334155;
                    --control-text: #f8fafc;
                    --control-hover: #334155;
                    
                    /* Text Utilities */
                    --muted-foreground: #94a3b8; /* Slate 400 */
                    
                    /* Highlight Colors */
                    --ghost-node: #1e293b; /* Deep Slate for receding */
                    --ghost-edge: #0f172a;
                }}
            """
            
            # Static CSS (No f-string)
            static_css = '''
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
                
                body { margin: 0; padding: 0; font-family: 'Space Grotesk', 'DM Sans', sans-serif; background-color: var(--background); color: var(--text); overflow: hidden; transition: background-color 0.3s, color 0.3s; }
                
                /* Default Body Class = Dark (applied via JS or HTML) */
                
                #mynetwork {
                    position: fixed !important; top: 80px !important; left: 0 !important;
                    width: 100vw !important; height: calc(100vh - 80px) !important;
                    background: var(--background); z-index: 1; outline: none;
                }
                
                /* HEADER */
                #custom-header {
                    position: fixed; top: 0; left: 0; right: 0; height: 72px;
                    background: var(--card);
                    opacity: 0.98;
                    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 24px; z-index: 9999;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    transition: all 0.3s ease;
                }
                
                .header-left { display: flex; align-items: center; gap: 14px; }
                .logo-icon {
                    width: 36px; height: 36px; background: linear-gradient(135deg, var(--primary), #8b5cf6);
                    border-radius: 10px; display: flex; align-items: center; justify-content: center;
                    font-size: 20px; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .header-title h1 { margin: 0; font-size: 18px; font-weight: 600; color: var(--text); }
                .header-title p { margin: 0; font-size: 11px; color: var(--muted-foreground); font-weight: 500; letter-spacing: 0.5px; }

                /* CONTROLS */
                .controls-wrapper { display: flex; align-items: center; gap: 16px; }
                
                .control-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
                .control-label {
                    font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; 
                    color: var(--muted-foreground); font-weight: 700; display: flex; align-items: center; gap: 4px;
                }
                
                /* Selects */
                .custom-select {
                    appearance: none; 
                    background-color: var(--control-bg);
                    border: 1px solid var(--control-border);
                    color: var(--control-text);
                    padding: 6px 12px; padding-right: 32px;
                    border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500;
                    min-width: 180px; height: 34px; cursor: pointer; transition: all 0.2s;
                    /* Arrow logic needs to invert color or be SVG variable? SVG currentColor works if we set color. */
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 10px center;
                }
                .custom-select:hover { background-color: var(--control-hover); border-color: var(--border); }
                .custom-select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(var(--primary), 0.2); }
                .custom-select option { background: var(--card); color: var(--text); padding: 8px; }

                /* Buttons */
                .btn-action {
                    height: 34px; padding: 0 16px; border-radius: 8px; 
                    border: 1px solid var(--control-border);
                    background: var(--control-bg); color: var(--control-text);
                    font-family: 'Outfit', sans-serif;
                    font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;
                    transition: all 0.2s; margin-top: 14px;
                }
                .btn-action:hover { background: var(--control-hover); transform: translateY(-1px); }
                .btn-action:active { transform: translateY(0); }
                
                /* Custom Scrollbar */
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--control-border); border-radius: 99px; }
                ::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }
                
                /* Slider fix */
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%; height: 4px; cursor: pointer;
                    background: var(--control-border); border-radius: 2px;
                }
                
                /* SIDEBAR */
                .sidebar {
                    position: fixed; top: 88px; right: -320px; width: 300px; bottom: 24px;
                    background: var(--card); border: 1px solid var(--border);
                    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    border-radius: 12px 0 0 12px;
                    box-shadow: -4px 0 24px rgba(0,0,0,0.1);
                    padding: 24px; display: flex; flex-direction: column; gap: 16px;
                    transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 1000; overflow-y: auto;
                }
                .sidebar.active { right: 0; }
                
                .sidebar-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
                .sidebar-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
                .btn-close { background: transparent; border: none; color: var(--muted-foreground); cursor: pointer; padding: 4px; }
                .btn-close:hover { color: var(--text); }
                
                .sidebar-content { display: flex; flex-direction: column; gap: 12px; }
                .sidebar-divider { height: 1px; background: var(--border); margin: 8px 0; }
                .info-item { display: flex; flex-direction: column; gap: 4px; }
                .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted-foreground); font-weight: 600; }
                .info-value { font-size: 13px; color: var(--text); font-weight: 500; word-break: break-word; line-height: 1.4; }
                
                .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: var(--control-bg); border: 1px solid var(--control-border); color: var(--control-text); }
            '''
            
            custom_style = f"<style>{css_vars}{static_css}</style>"
            html = html.replace('</head>', f'{custom_style}</head>')
            
            # 2. Custom HTML Injection
            custom_header = '''
            <div id="custom-header">
                <div class="header-left">
                    <div class="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </div>
                    <div class="header-title">
                        <h1>Visualizador</h1>
                        <p>NETWORK EXPLORER</p>
                    </div>
                </div>
                
                <div class="controls-wrapper">
                    <!-- Search -->
                    <div class="control-group">
                        <div class="control-label">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                             BUSCAR
                        </div>
                        <select id="ui-search" class="custom-select">
                            <option value="">Buscar nodo...</option>
                        </select>
                    </div>
                    
                    <!-- Filter -->
                    <div class="control-group">
                        <div class="control-label">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                             FILTRAR
                        </div>
                        <select id="ui-filter" class="custom-select">
                            <option value="all">Todo</option>
                        </select>
                    </div>

                    <!-- Layout -->
                    <div class="control-group">
                        <div class="control-label">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                             DISTRIBUCIÓN
                        </div>
                        <select id="ui-layout" class="custom-select">
                            <option value="physics">Física</option>
                            <option value="spring">Spring</option>
                            <option value="hierarchical">Jerárquico</option>
                            <option value="circular">Circular</option>
                            <option value="kamada">Kamada-Kawai</option>
                            <option value="shell">Shell</option>
                        </select>
                    </div>

                    <!-- Spacing Slider -->
                    <div class="control-group">
                        <div class="control-label">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                             ESPACIADO
                        </div>
                        <input type="range" id="ui-spacing" min="50" max="800" value="100">
                    </div>
                    
                    <!-- Reset -->
                    <button id="ui-reset" class="btn-action">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        Recentrar
                    </button>
                    
                     <!-- Physics Toggle -->
                    <button id="ui-physics" class="btn-action" style="background: #3b82f6; border-color: #2563eb; color: white;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><activity path="M22 12h-4l-3 9L9 3l-3 9H2"/></activity><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        Física
                    </button>
                    
                     <!-- Theme Toggle -->
                    <button id="ui-theme" class="btn-action" style="min-width: 40px; justify-content: center;">
                        <svg id="theme-icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    </button>
                    
                </div>
            </div>
            
            <!-- Sidebar Structure -->
            <div id="ui-sidebar" class="sidebar">
                <div class="sidebar-header">
                    <h2 class="sidebar-title">Detalles</h2>
                    <button id="btn-close-sidebar" class="btn-close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div id="sidebar-content" class="sidebar-content">
                    <!-- Dynamic Content -->
                </div>
            </div>
            '''
            html = html.replace('<body>', f'<body class="dark">{custom_header}')

            # 3a. Generate High-Fidelity Node Data for JS
            
            node_data_map = {}
            for n, d in pyvis_graph.nodes(data=True):
                 # Sanitize & Format Data
                 # Exclude technical fields
                 exclude_keys = ['color', 'font', 'shape', 'x', 'y', 'hidden', 'title', 'label', 'size', 'physics', 'mass', 'widthConstraint']
                 info = {k: v for k, v in d.items() if k not in exclude_keys}
                 # Ensure defaults
                 info['ID'] = str(n)
                 # Translate Type for internal usage if needed but usually better to stick to raw type for logic
                 info['Label'] = d.get('Label', str(n))
                 info['Group'] = d.get('group', 'Default')
                 node_data_map[str(n)] = info
                 
            json_payload = json.dumps(node_data_map)

            # 3. Custom JS Logic (Highlighting & Init)
            # We inject the data separately to avoid f-string escaping hell in the large JS block
            
            js_data_block = f'''
            <script>
            // Injected Data from Python
            const GRAPH_DATA = {json_payload};
            const LAYOUTS = {layout_json};
            </script>
            '''
            
            custom_js = '''
            <script>
            document.addEventListener("DOMContentLoaded", function() {
                const checkNet = setInterval(() => {
                    if (typeof network !== 'undefined' && typeof nodes !== 'undefined' && typeof edges !== 'undefined') {
                        clearInterval(checkNet);
                        initCustomControls();
                        initHighlighting();
                    }
                }, 200);
            
            function initCustomControls() {
                const searchSel = document.getElementById("ui-search");
                const filterSel = document.getElementById("ui-filter");
                const layoutSel = document.getElementById("ui-layout");
                const spacingRange = document.getElementById("ui-spacing");
                const resetBtn = document.getElementById("ui-reset");
                const physicsBtn = document.getElementById("ui-physics");
                const themeBtn = document.getElementById("ui-theme");
                
                // Theme Toggle
                themeBtn.addEventListener("click", () => {
                   document.body.classList.toggle("dark");
                   const isDark = document.body.classList.contains("dark");
                   
                   // Icon: Sun (Light Mode Target) vs Moon (Dark Mode Target)
                   // If isDark is true, we are in Dark Mode, so button should show Sun (to switch to Light)
                   // Wait, logic: Default is Dark. Button shows Sun. Click -> Light. Button shows Moon.
                   // SVG strings for safety
                   // Icon update
                   const sunIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
                   const moonIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
                   
                   themeBtn.innerHTML = isDark ? sunIcon : moonIcon;
                   
                   // Update Network Fonts? NO. User requested fixed White fonts with Stroke.
                   // We do NOT change node fonts on theme toggle anymore.
                   
                   // Reset highlighting if active to prevent stuck wrong colors
                   resetHighlight();
                });
                
                // 1. Populate Search
                const allNodes = nodes.get();
                allNodes.sort((a,b) => (a.label || "").localeCompare(b.label || ""));
                
                allNodes.forEach(n => {
                    const opt = document.createElement("option");
                    opt.value = n.id;
                    opt.text = n.label || n.id;
                    searchSel.appendChild(opt);
                });
                
                searchSel.addEventListener("change", (e) => {
                    const id = e.target.value;
                    if(id) {
                        network.selectNodes([id]);
                        network.focus(id, { scale: 1.2, animation: true });
                        // Trigger highlight manually if needed, but click listener handles selection too
                        highlightNeighborhood(id);
                    }
                });
                
                // 2. Populate Filter
                const groups = [...new Set(allNodes.map(n => n.group))].filter(Boolean).sort();
                groups.forEach(g => {
                    const opt = document.createElement("option");
                    opt.value = g;
                    opt.text = g;
                    filterSel.appendChild(opt);
                });
                
                filterSel.addEventListener("change", (e) => {
                    const group = e.target.value;
                    if (group === "all") {
                        nodes.update(allNodes.map(n => ({id: n.id, hidden: false})));
                    } else {
                        nodes.update(allNodes.map(n => ({id: n.id, hidden: n.group !== group})));
                    }
                });
                
                // 3. Spacing & Layout Logic
                let currentLayoutBase = null; // Store normalized positions
                
                function applyStaticLayout() {
                    const mode = layoutSel.value;
                    if (mode === 'physics' || !currentLayoutBase) return;
                    
                    const sliderVal = parseInt(spacingRange.value);
                    const multiplier = sliderVal * 10; // 100 -> 1000 spacing
                    
                    const updates = [];
                    for(const [nid, pos] of Object.entries(currentLayoutBase)) {
                        updates.push({ id: nid, x: pos.x * multiplier, y: pos.y * multiplier });
                    }
                    nodes.update(updates);
                    // We don't call fit() every frame of slider dragging because it's jarring, 
                    // but we might want it on change? Let's rely on user pan/zoom or call fit once after selection.
                }

                spacingRange.addEventListener("input", (e) => {
                    const val = parseInt(e.target.value);
                    if (layoutSel.value === 'physics') {
                         network.setOptions({ physics: { forceAtlas2Based: { springLength: val } } });
                    } else {
                         applyStaticLayout(); 
                    }
                });
                
                // 3b. Layout Switching
                if (layoutSel) {
                    layoutSel.addEventListener("change", (e) => {
                        const mode = e.target.value;
                        if (mode === 'physics') {
                            // Enable Physics
                            network.setOptions({ physics: { enabled: true, stabilization: { iterations: 100 } } });
                            physicsBtn.style.opacity = "1";
                            physicsEnabled = true;
                            spacingRange.disabled = false;
                            
                        } else {
                            // Disable Physics
                            network.setOptions({ physics: { enabled: false } });
                            physicsBtn.style.opacity = "0.5";
                            physicsEnabled = false;
                            // Static layouts allow spacing scaling too!
                            spacingRange.disabled = false; 
                            
                            if (typeof LAYOUTS !== 'undefined' && LAYOUTS[mode]) {
                                currentLayoutBase = LAYOUTS[mode];
                                applyStaticLayout();
                                network.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
                            }
                        }
                    });
                }
                
                // 4. Reset
                resetBtn.addEventListener("click", () => {
                   network.fit({ animation: true });
                   resetHighlight();
                   searchSel.value = "";
                   currentSelectedId = null;
                });
                
                // 5. Physics Toggle Listener
                // ...
            }
            
            // Global State
            let currentSelectedId = null;

            function initHighlighting() {
                network.on("click", function(params) {
                    if (params.nodes.length > 0) {
                        currentSelectedId = params.nodes[0];
                        highlightNeighborhood(currentSelectedId);
                    } else {
                        currentSelectedId = null;
                        resetHighlight();
                    }
                });
            }
            
            // ... I18N ...
            
            // ... I18N ...
            
            
            // ... updateSidebar ...
            // ... closeSidebar ...

            function highlightNeighborhood(selectedId) {
                const allNodes = nodes.get();
                const allEdges = edges.get();
                
                // Show Sidebar
                updateSidebar(selectedId);

                // Calculate Visible Set (Standard 1st Degree)
                const connectedNodes = network.getConnectedNodes(selectedId);
                const isConnected = new Set(connectedNodes);
                isConnected.add(selectedId);
                
                // Dim unconnected nodes
                const nodeUpdates = allNodes.map(n => {
                    if (isConnected.has(n.id)) {
                         return { 
                             id: n.id, 
                             opacity: 1, 
                             font: { color: '#ffffff', strokeWidth: 2, strokeColor: '#000000' } 
                         }; 
                    } else {
                         return { 
                             id: n.id, 
                             opacity: 0.2, 
                             font: { color: 'rgba(255, 255, 255, 0.4)', strokeWidth: 2, strokeColor: 'rgba(0, 0, 0, 0.2)' } 
                         }; 
                    }
                });
                
                // Edge visual logic: Show edges connected to the selected node OR between visible nodes?
                // Standard: Show edges connected to selected node.
                // Extended: Show edges between any two visible nodes.
                // Let's stick to edges connected to SELECTED node + edges between neighbors.
                // Simply: If an edge's source and target are both in 'isConnected', show it.
                
                const edgeUpdates = allEdges.map(e => {
                     const bothVisible = isConnected.has(e.from) && isConnected.has(e.to);
                     if (bothVisible) {
                        return { id: e.id, color: { opacity: 1.0, inherit: true } };
                     } else {
                        return { id: e.id, color: { opacity: 0.1, inherit: true } };
                     }
                });

                nodes.update(nodeUpdates);
                edges.update(edgeUpdates);
            }

            function resetHighlight() {
                const allNodes = nodes.get();
                const allEdges = edges.get();
                
                nodes.update(allNodes.map(n => ({ 
                    id: n.id, opacity: 1, 
                    font: { color: '#ffffff', strokeWidth: 2, strokeColor: '#000000' } 
                })));
                edges.update(allEdges.map(e => ({ 
                    id: e.id, color: { opacity: 1.0, inherit: true } 
                })));
                closeSidebar();
            }

            const I18N = {
                'Professor': 'Profesor',
                'Subject': 'Materia',
                'Group': 'Grupo',
                'Slot': 'Horario', 
                'Type': 'Tipo',
                'Unknown': 'Desconocido',
                // Plurals for Headers
                'Professor_plural': 'Profesores',
                'Subject_plural': 'Materias',
                'Group_plural': 'Grupos',
                'Slot_plural': 'Horarios',
                'Unknown_plural': 'Otros',
                // Keys
                'Label': 'Nombre',
                'ID': 'ID'
            };
            
            function t(key) { return I18N[key] || key; }
            function tPlural(key) { return I18N[key + '_plural'] || key + 's'; }

            // Make it global so onclick works
            window.selectNodeFromSidebar = function(id) {
                // Focus and Highlight
                network.selectNodes([id]);
                // Smooth Animation
                network.focus(id, { 
                    scale: 1.2, 
                    animation: { duration: 600, easingFunction: 'easeInOutQuad' } 
                });
                currentSelectedId = id;
                highlightNeighborhood(id);
            }

            function updateSidebar(selectedId) {
                const sidebar = document.getElementById("ui-sidebar");
                const container = document.getElementById("sidebar-content");
                const data = GRAPH_DATA[selectedId];
                
                if (!data) return;
                
                let html = "";
                
                // 1. Header Info (Label & Type)
                const typeLabel = data.Type ? t(data.Type) : '';
                html += `<div class="sidebar-section">
                    <h3 style="margin:0 0 8px 0; font-size:18px; color: var(--foreground);">${data.Label || data.ID}</h3>
                    ${typeLabel ? `<span class="tag">${typeLabel}</span>` : ''}
                </div>`;
                
                // 2. Properties (Filtered)
                html += `<div class="sidebar-divider"></div>`;
                const exclude = ['Label', 'Type', 'Group', 'group', 'ID', 'subset']; 
                // Note: We hide 'Group' property usually as it matches Type or ID, but if present we translate key
                
                Object.keys(data).forEach(key => {
                    if (!exclude.includes(key)) {
                         html += `
                        <div class="info-item">
                            <span class="info-label">${t(key)}</span>
                            <span class="info-value">${data[key]}</span>
                        </div>`;
                    }
                });
                
                // 3. Relations (Neighbors)
                const connectedIds = network.getConnectedNodes(selectedId);
                if (connectedIds.length > 0) {
                    html += `<div class="sidebar-divider"></div>`;
                    html += `<h4 style="margin:0 0 12px 0; font-size:14px; text-transform:uppercase; color:var(--muted-foreground);">Relaciones</h4>`;
                    
                    // Group neighbors by Type
                    const groups = {};
                    connectedIds.forEach(nid => {
                        const nData = GRAPH_DATA[nid];
                        const type = nData ? (nData.Type || 'Unknown') : 'Unknown';
                        if (!groups[type]) groups[type] = [];
                        groups[type].push({ id: nid, label: nData ? (nData.Label || nid) : nid });
                    });
                    
                    // Render Groups
                    Object.keys(groups).sort().forEach(type => {
                        const count = groups[type].length;
                        const header = tPlural(type).toUpperCase();
                        
                        html += `<div class="relation-group" style="margin-bottom:12px;">
                            <div class="info-label" style="margin-bottom:6px;">${header} (${count})</div>
                            <div class="relation-list" style="display:flex; flex-direction:column; gap:6px;">`;
                            
                        groups[type].forEach(item => {
                            html += `
                            <div class="relation-item" onclick="window.selectNodeFromSidebar('${item.id}')" 
                                 style="cursor:pointer; padding:6px 10px; background:var(--control-bg); border-radius:6px; font-size:13px; border:1px solid transparent; transition:all 0.2s;">
                                ${item.label}
                            </div>`;
                        });
                        
                        html += `</div></div>`;
                    });
                }
                
                container.innerHTML = html;
                sidebar.classList.add("active");
                
                // Hover effects
                const items = container.querySelectorAll('.relation-item');
                items.forEach(el => {
                    el.addEventListener('mouseenter', () => { el.style.borderColor = 'var(--primary)'; el.style.background = 'var(--control-hover)'; });
                    el.addEventListener('mouseleave', () => { el.style.borderColor = 'transparent'; el.style.background = 'var(--control-bg)'; });
                });
            }

            function closeSidebar() {
                document.getElementById("ui-sidebar").classList.remove("active");
            }

            function highlightNeighborhood(selectedId) {
                const allNodes = nodes.get();
                const allEdges = edges.get();
                const connectedNodes = network.getConnectedNodes(selectedId);
                const connectedEdges = network.getConnectedEdges(selectedId);
                
                // Show Sidebar
                updateSidebar(selectedId);
                
                // Dim unconnected nodes to Ghost Opacity
                const nodeUpdates = allNodes.map(n => {
                    const isLinked = n.id === selectedId || connectedNodes.includes(n.id);
                    if (isLinked) {
                         return { 
                             id: n.id, 
                             opacity: 1, 
                             font: { color: '#ffffff', strokeWidth: 2, strokeColor: '#000000' } 
                         }; 
                    } else {
                         return { 
                             id: n.id, 
                             opacity: 0.2, 
                             font: { color: 'rgba(255, 255, 255, 0.4)', strokeWidth: 2, strokeColor: 'rgba(0, 0, 0, 0.2)' } 
                         }; 
                    }
                });
                
                const edgeUpdates = allEdges.map(e => {
                    const isLinked = connectedEdges.includes(e.id);
                    if (isLinked) {
                        return { id: e.id, color: { opacity: 1.0, inherit: true } };
                    } else {
                        return { id: e.id, color: { opacity: 0.1, inherit: true } };
                    }
                });

                nodes.update(nodeUpdates);
                edges.update(edgeUpdates);
            }

            function resetHighlight() {
                closeSidebar();
                const allNodes = nodes.getIds();
                const allEdges = edges.getIds();
                
                // Restore all to defaults
                nodes.update(allNodes.map(id => ({ 
                    id: id, 
                    opacity: 1, 
                    font: { color: '#ffffff', strokeWidth: 2, strokeColor: '#000000' } // Always restore High Contrast
                })));
                
                edges.update(allEdges.map(id => ({ 
                    id: id, 
                    color: { opacity: 1, inherit: true } 
                })));
            }

            });
            </script>'''

            html = html.replace('</body>', f'{js_data_block}{custom_js}</body>')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html)
            
            webbrowser.open(f"file://{output_file}")
            self.lbl_status.setText("Exportado y abierto HTML")
            
        except ImportError:
            self.lbl_status.setText("Error: pyvis no instalado")
        except Exception as e:
            self.lbl_status.setText(f"Fallo exportación: {e}")
            print(e) # Debug output
