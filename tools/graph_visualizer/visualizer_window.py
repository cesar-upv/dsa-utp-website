from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QPushButton, QLabel, QFileDialog, QComboBox, QDockWidget,
                             QTextEdit, QLineEdit, QCheckBox, QSlider)
from PyQt6.QtCore import Qt
from graph_widget import GraphWidget
from data_loader import DataLoader
import os

class VisualizerWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Visualizador de Grafos UTP")
        self.resize(1200, 800)
        self.showMaximized()
        
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
        
        self.lbl_status = QLabel("Ningún archivo cargado")
        controls_layout.addWidget(self.lbl_status)
        
        controls_layout.addStretch()

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Buscar nodos...")
        self.search_input.textChanged.connect(self.filter_nodes)
        self.search_input.setFixedWidth(200)
        controls_layout.addWidget(self.search_input)
        
        self.chk_neighbors = QCheckBox("Mostrar Vecinos")
        self.chk_neighbors.stateChanged.connect(lambda: self.filter_nodes(self.search_input.text()))
        controls_layout.addWidget(self.chk_neighbors)
        
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
        self.dock = QDockWidget("Estadísticas", self)
        self.stats_text = QTextEdit()
        self.stats_text.setReadOnly(True)
        self.dock.setWidget(self.stats_text)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.dock)

    def filter_nodes(self, text):
        show_neighbors = self.chk_neighbors.isChecked()
        self.graph_widget.highlight_nodes(text, show_neighbors=show_neighbors)

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
                neighbor_by_type[t_key].append(f"{n_label} ({n})")
            
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
            pyvis_graph = self.loader.graph.copy()
            for n, d in pyvis_graph.nodes(data=True):
                t = d.get("Type", "Unknown") # 'Professor', 'Group', 'Subject'
                
                # Colors matching the app theme
                if t == "Group": color, group = "#3b82f6", "Grupos" # Blue
                elif t == "Professor": color, group = "#ef4444", "Profesores" # Red
                elif t == "Subject": color, group = "#10b981", "Materias" # Green
                else: color, group = "#9ca3af", "Otros" # Gray
                
                d["color"] = color
                d["group"] = group # Use 'group' for easier filtering in JS
                d["title"] = d.get("Label", str(n)) 
                d["label"] = d.get("Label", str(n)) 

            # Create network - Disable default menus
            net = Network(height="100vh", width="100%", bgcolor="#0f172a", font_color="white", select_menu=False, filter_menu=False)
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
                 "font": { "size": 16, "face": "Outfit", "strokeWidth": 2, "strokeColor": "#000" },
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
            
            output_file = os.path.abspath("graph_export.html")
            net.write_html(output_file)
            
            # --- CUSTOM UI INJECTION ---
            with open(output_file, 'r', encoding='utf-8') as f:
                html = f.read()

            # 1. Custom CSS
            custom_style = """
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');
                
                body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; background-color: #0f172a; color: #e2e8f0; overflow: hidden; }
                
                #mynetwork {
                    position: fixed !important; top: 80px !important; left: 0 !important;
                    width: 100vw !important; height: calc(100vh - 80px) !important;
                    background: #0f172a; z-index: 1; outline: none;
                }
                
                /* HEADER */
                #custom-header {
                    position: fixed; top: 0; left: 0; right: 0; height: 72px; /* Compact height */
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 24px; z-index: 9999;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                }
                
                .header-left { display: flex; align-items: center; gap: 14px; }
                .logo-icon {
                    width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    border-radius: 10px; display: flex; align-items: center; justify-content: center;
                    font-size: 20px; color: white; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
                }
                .header-title h1 { margin: 0; font-size: 18px; font-weight: 600; color: #f8fafc; }
                .header-title p { margin: 0; font-size: 11px; color: #94a3b8; font-weight: 500; letter-spacing: 0.5px; }

                /* CONTROLS */
                .controls-wrapper { display: flex; align-items: center; gap: 16px; }
                
                .control-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
                .control-label {
                    font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; 
                    color: #94a3b8; font-weight: 700; display: flex; align-items: center; gap: 4px;
                }
                
                /* Selects - Compact */
                .custom-select {
                    appearance: none; background: #1e293b; border: 1px solid #334155;
                    color: #f1f5f9; padding: 6px 12px; padding-right: 32px;
                    border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 500;
                    min-width: 180px; height: 34px; cursor: pointer; transition: all 0.2s;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat; background-position: right 10px center;
                }
                .custom-select:hover { background-color: #334155; border-color: #475569; }
                .custom-select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
                .custom-select option { background: #1e293b; color: white; padding: 8px; }

                /* Action Button - Compact */
                .btn-action {
                    height: 34px; padding: 0 16px; border-radius: 8px; border: 1px solid #334155;
                    background: #1e293b; color: #e2e8f0; font-family: 'Outfit', sans-serif;
                    font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;
                    transition: all 0.2s; margin-top: 14px;
                }
                .btn-action:hover { background: #334155; color: white; transform: translateY(-1px); }
                .btn-action:active { transform: translateY(0); }
                
                /* Slider - Fixed Visibility */
                input[type=range] {
                    -webkit-appearance: none; width: 120px; background: transparent; margin-top: 8px;
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none; height: 14px; width: 14px; border-radius: 50%;
                    background: #6366f1; cursor: pointer; margin-top: -5px;
                    box-shadow: 0 0 8px rgba(99, 102, 241, 0.5); border: 1px solid rgba(255,255,255,0.2);
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%; height: 4px; cursor: pointer;
                    background: #475569; border-radius: 2px;
                }
                input[type=range]:focus { outline: none; }
            </style>
            """
            html = html.replace('</head>', f'{custom_style}</head>')
            
            # 2. Custom HTML Injection
            custom_header = """
            <div id="custom-header">
                <div class="header-left">
                    <div class="logo-icon">🖇</div>
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
                </div>
            </div>
            """
            html = html.replace('<body>', f'<body>{custom_header}')

            # 3. Custom JS Logic (Highlighting & Init)
            custom_js = """
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
                const spacingRange = document.getElementById("ui-spacing");
                const resetBtn = document.getElementById("ui-reset");
                const physicsBtn = document.getElementById("ui-physics");
                
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
                
                // 3. Spacing
                spacingRange.addEventListener("input", (e) => {
                    const val = parseInt(e.target.value);
                    network.setOptions({ physics: { forceAtlas2Based: { springLength: val } } });
                });
                
                // 4. Reset
                resetBtn.addEventListener("click", () => {
                   network.fit({ animation: true });
                   resetHighlight();
                   searchSel.value = "";
                });
                
                // 5. Physics
                let physicsEnabled = true;
                physicsBtn.addEventListener("click", () => {
                    physicsEnabled = !physicsEnabled;
                    network.setOptions({ physics: { enabled: physicsEnabled } });
                    physicsBtn.style.opacity = physicsEnabled ? "1" : "0.5";
                });
            }

            function initHighlighting() {
                network.on("click", function(params) {
                    if (params.nodes.length > 0) {
                        highlightNeighborhood(params.nodes[0]);
                    } else {
                        resetHighlight();
                    }
                });
            }

            function highlightNeighborhood(selectedId) {
                const allNodes = nodes.get();
                const allEdges = edges.get();
                const connectedNodes = network.getConnectedNodes(selectedId);
                const connectedEdges = network.getConnectedEdges(selectedId);

                // Dim unconnected nodes
                const nodeUpdates = allNodes.map(n => {
                    const isLinked = n.id === selectedId || connectedNodes.includes(n.id);
                    // Use color object to set opacity without losing original color
                    // We assume n.color is a string (hex) from our python generation
                    // We need to convert hex to rgba for opacity? 
                    // Simpler: Vis.js supports 'opacity' in options? No.
                    // We must edit color. 
                    // Hack: use color: { background: 'rgba(...)', border: 'rgba(...)' }
                    // But parsing hex in JS is tedious.
                    // Alternative: Set n.color.opacity if using RGBA, but we used hex.
                    // EASIER: Just use 'hidden' for extreme cleaning? User asked for 'opacity'.
                    // Let's try modifying the color object opacity property if supported (Vis 4.21+ supports it partially).
                    // Actually, let's keep it simple: Gray out unconnected.
                    
                    if (isLinked) {
                         // Restore full color if we have it stored? 
                         // Vis.js DataSets merge updates. If we overwrite color, we lose original.
                         // We should assume original color is in 'group' style or we re-assign based on group logic?
                         // Better: Set opacity directly on the color object.
                         return { id: n.id, opacity: 1 }; 
                    } else {
                         return { id: n.id, opacity: 0.1 };
                    }
                });
                
                // Dim unconnected edges
                const edgeUpdates = allEdges.map(e => {
                    const isLinked = connectedEdges.includes(e.id);
                    return { id: e.id, color: { opacity: isLinked ? 1.0 : 0.05 } };
                });

                nodes.update(nodeUpdates);
                edges.update(edgeUpdates);
            }

            function resetHighlight() {
                const allNodes = nodes.getIds();
                const allEdges = edges.getIds();
                nodes.update(allNodes.map(id => ({ id: id, opacity: 1 })));
                edges.update(allEdges.map(id => ({ id: id, color: { opacity: 1 } })));
            }

            });
            </script>
            """
            html = html.replace('</body>', f'{custom_js}</body>')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html)
            
            webbrowser.open(f"file://{output_file}")
            self.lbl_status.setText("Exportado y abierto HTML")
            
        except ImportError:
            self.lbl_status.setText("Error: pyvis no instalado")
        except Exception as e:
            self.lbl_status.setText(f"Fallo exportación: {e}")
            print(e) # Debug output
