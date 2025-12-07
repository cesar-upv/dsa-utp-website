from PyQt6.QtWidgets import QGraphicsView, QGraphicsScene, QGraphicsEllipseItem, QGraphicsLineItem, QGraphicsItem, QGraphicsTextItem, QGraphicsSimpleTextItem
from PyQt6.QtCore import Qt, QRectF, QPointF, pyqtSignal
from PyQt6.QtGui import QPen, QBrush, QColor, QPainter, QTransform, QFont
import networkx as nx
import math

class GraphNode(QGraphicsEllipseItem):
    def __init__(self, node_id, data, x, y, radius=20):
        super().__init__(-radius, -radius, 2*radius, 2*radius)
        self.node_id = node_id
        self.data = data
        self.setPos(x, y)
        
        # Style based on type
        node_type = data.get("Type", "Unknown")
        self.color = self._get_color(node_type)
        
        self.setBrush(QBrush(self.color))
        self.setPen(QPen(Qt.GlobalColor.black))
        
        # Flags
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemIsMovable)
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemIsSelectable)
        self.setFlag(QGraphicsItem.GraphicsItemFlag.ItemSendsGeometryChanges)
        
        # Label
        label_text = data.get("Label", str(node_id))
        if len(label_text) > 18:
            label_text = label_text[:15] + "..."
            
        self.label = QGraphicsSimpleTextItem(label_text, self)
        # White text with black outline for readability
        self.label.setBrush(QBrush(Qt.GlobalColor.white))
        self.label.setPen(QPen(Qt.GlobalColor.black, 1)) 
        
        font = QFont()
        font.setBold(True)
        self.label.setFont(font)

        # Center label roughly
        rect = self.label.boundingRect()
        self.label.setPos(-rect.width()/2, -rect.height()/2)

        # Tooltip
        self.setToolTip(f"{node_type}: {data.get('Label', node_id)}")
        
        self.edges = []
        
        # Interaction styling
        self.setAcceptHoverEvents(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)

    def hoverEnterEvent(self, event):
        # Visual feedback
        self.setScale(1.15)
        super().hoverEnterEvent(event)

    def hoverLeaveEvent(self, event):
        self.setScale(1.0)
        super().hoverLeaveEvent(event)

    def _get_color(self, node_type):
        from ui.theme import Theme
        p = Theme.current
        if node_type == "Group":
            return Theme.get_qcolor(p.NODE_GROUP)
        elif node_type == "Professor":
            return Theme.get_qcolor(p.NODE_PROFESSOR)
        elif node_type == "Subject":
            return Theme.get_qcolor(p.NODE_SUBJECT)
        elif node_type == "Slot":
            return Theme.get_qcolor(p.NODE_SLOT)
        return Theme.get_qcolor(p.NODE_DEFAULT)

    def add_edge(self, edge):
        self.edges.append(edge)

    def itemChange(self, change, value):
        if change == QGraphicsItem.GraphicsItemChange.ItemPositionHasChanged:
            for edge in self.edges:
                edge.adjust()
        return super().itemChange(change, value)
        
    def update_theme(self):
        # Refresh colors
        self.color = self._get_color(self.data.get("Type"))
        self.setBrush(QBrush(self.color))
        # Label color might need invert if we had white background? 
        # For now, we keep Node Text white/contrast on colored nodes.
        # But for default nodes (grey), maybe? Keeping it simple.

class GraphEdge(QGraphicsLineItem):
    def __init__(self, source_node, target_node):
        super().__init__()
        self.source = source_node
        self.target = target_node
        self.source.add_edge(self)
        self.target.add_edge(self)
        
        from ui.theme import Theme
        self.setPen(QPen(Theme.get_qcolor(Theme.current.EDGE_DEFAULT), 1, Qt.PenStyle.SolidLine))
        self.setZValue(-1) # Behind nodes
        self.adjust()
        
    def update_theme(self):
        from ui.theme import Theme
        self.setPen(QPen(Theme.get_qcolor(Theme.current.EDGE_DEFAULT), 1, Qt.PenStyle.SolidLine))

    def adjust(self):
        line = self.line()
        source_pos = self.source.scenePos()
        target_pos = self.target.scenePos()
        self.setLine(source_pos.x(), source_pos.y(), target_pos.x(), target_pos.y())

class GraphWidget(QGraphicsView):
    nodeClicked = pyqtSignal(str, dict)
    backgroundClicked = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.scene = QGraphicsScene(self)
        self.setScene(self.scene)
        
        self.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.setDragMode(QGraphicsView.DragMode.ScrollHandDrag)
        self.setTransformationAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        self.setResizeAnchor(QGraphicsView.ViewportAnchor.AnchorUnderMouse)
        
        self.graph = None
        self.current_layout = "spring"
        self.layout_scale = 1200.0 # Default requested by user
        self.norm_pos = None # Normalized positions (scale=1.0)
        self.node_items = {}
        self.selected_node_id = None

    def wheelEvent(self, event):
        zoom_factor = 1.15
        if event.angleDelta().y() > 0:
            self.scale(zoom_factor, zoom_factor)
        else:
            self.scale(1 / zoom_factor, 1 / zoom_factor)

    def mousePressEvent(self, event):
        super().mousePressEvent(event)
        item = self.itemAt(event.position().toPoint())
        
        if isinstance(item, QGraphicsSimpleTextItem) and isinstance(item.parentItem(), GraphNode):
            item = item.parentItem() # Treat label click as node click

        if isinstance(item, GraphNode):
            # Emit signal
            self.nodeClicked.emit(item.node_id, item.data)
            # Internal highlight effect with neighbors
            self.highlight_nodes(center_node=item.node_id, show_neighbors=True)
        else:
            self.backgroundClicked.emit()

    def set_graph(self, nx_graph):
        self.graph = nx_graph
        self.norm_pos = None
        self.draw_graph()

    def set_layout_algorithm(self, layout_name):
        self.current_layout = layout_name
        self.norm_pos = None # Force recompute
        if self.graph:
            self.draw_graph()
            
    def set_layout_scale(self, scale):
        self.layout_scale = scale
        # Redraw using cached normalized positions if available
        if self.graph and self.norm_pos:
            self.draw_graph()

    def reload_theme(self):
        # Refresh all items
        for item in self.scene.items():
            if hasattr(item, 'update_theme'):
                item.update_theme()
        
        # Update background if needed? The view background is handled by stylesheet on parent.
        # But Scene might need update? No, scene is transparent usually.

    def highlight_nodes(self, text=None, center_node=None, show_neighbors=False):
        targets = set()
        
        if text:
            text = text.lower()
            for n, d in self.graph.nodes(data=True):
                 label = d.get('Label', n).lower()
                 if text in str(label) or text in str(n).lower():
                     targets.add(n)
        
        if center_node:
            targets.add(center_node)
        
        if show_neighbors and targets:
            current_targets = list(targets)
            for t in current_targets:
                try:
                    neighbors = list(nx.all_neighbors(self.graph, t))
                    targets.update(neighbors)
                except:
                    pass

        if not text and not center_node:
             for item in self.scene.items():
                 item.setOpacity(1.0)
             return

        for item in self.scene.items():
            if isinstance(item, GraphNode):
                if item.node_id in targets:
                    item.setOpacity(1.0)
                else:
                    item.setOpacity(0.1) 
            elif isinstance(item, GraphEdge):
                if item.source.node_id in targets and item.target.node_id in targets:
                     item.setOpacity(1.0)
                else:
                     item.setOpacity(0.05) 

    def compute_layout(self):
        # Calculates normalized positions (base scale=1.0)
        # This allows applying the layout_scale later without re-running the physics
        scale = 1.0
        try:
            if self.current_layout == "kamada-kawai":
                pos = nx.kamada_kawai_layout(self.graph, scale=scale)
            elif self.current_layout == "circular":
                pos = nx.circular_layout(self.graph, scale=scale)
            elif self.current_layout == "shell":
                pos = nx.shell_layout(self.graph, scale=scale)
            elif self.current_layout == "random":
                pos = nx.random_layout(self.graph)
            elif self.current_layout == "hierarchical":
                # IMPROVED Multipartite layout with Barycenter Heuristic
                
                # 1. Organize into layers
                layers = {} 
                
                for n, d in self.graph.nodes(data=True):
                    t = d.get("Type", "Unknown")
                    if t == "Professor":
                        self.graph.nodes[n]["subset"] = 0
                        layers.setdefault(0, []).append(n)
                    elif t == "Group":
                        self.graph.nodes[n]["subset"] = 1
                        layers.setdefault(1, []).append(n)
                    elif t == "Subject":
                        self.graph.nodes[n]["subset"] = 2
                        layers.setdefault(2, []).append(n)
                    else:
                        self.graph.nodes[n]["subset"] = 3
                        layers.setdefault(3, []).append(n)
                
                # Pre-sorting 
                layers[0].sort(key=lambda x: self.graph.nodes[x].get("Label", str(x)))
                idx_map_0 = {n: i for i, n in enumerate(layers[0])}
                
                def get_avg_pos(node, prev_layer_map):
                    neighbors = [nbr for nbr in self.graph.neighbors(node) if nbr in prev_layer_map]
                    for nbr in self.graph.predecessors(node):
                        if nbr in prev_layer_map: neighbors.append(nbr)
                    
                    if not neighbors: return 999999
                    indices = [prev_layer_map[n] for n in neighbors]
                    return sum(indices) / len(indices)

                if 1 in layers:
                    layers[1].sort(key=lambda x: get_avg_pos(x, idx_map_0))

                if 1 in layers and 2 in layers:
                    idx_map_1 = {n: i for i, n in enumerate(layers[1])}
                    layers[2].sort(key=lambda x: get_avg_pos(x, idx_map_1))

                # Generate Positions Manually (Normalized)
                # Aspect ratio: 1.0 : 0.4
                pos = {}
                x_spacing = 1.0 
                # y_spacing relative to x. previously 600/1500 = 0.4
                y_spacing = 0.4 
                
                for layer_idx in sorted(layers.keys()):
                    nodes = layers[layer_idx]
                    layer_height = (len(nodes) - 1) * y_spacing
                    y_start = -layer_height / 2
                    
                    for i, node in enumerate(nodes):
                        pos[node] = (layer_idx * x_spacing, y_start + i * y_spacing)
                
            else: # Spring default
                # k relative to scale=1. 
                # k=0.1 seems reasonable for unit square to separate clusters
                k_val = 0.15 # Tuned for unit scale
                pos = nx.spring_layout(self.graph, k=k_val, iterations=50, scale=scale, seed=42)
        except Exception as e:
            print(f"Layout failed: {e}, falling back to spring")
            pos = nx.spring_layout(self.graph, scale=scale)
        
        self.norm_pos = pos

    def draw_graph(self):
        self.scene.clear()
        if not self.graph:
            return

        if not self.norm_pos:
            self.compute_layout()

        # Apply Real-time Scale
        current_pos = {}
        for n, (x, y) in self.norm_pos.items():
            current_pos[n] = (x * self.layout_scale, y * self.layout_scale)
            
        # Draw Nodes
        self.node_items = {}
        for node_id, (x, y) in current_pos.items():
            data = self.graph.nodes[node_id]
            item = GraphNode(node_id, data, x, y)
            self.scene.addItem(item)
            self.node_items[node_id] = item

        # Draw Edges
        for u, v in self.graph.edges():
            if u in self.node_items and v in self.node_items:
                edge = GraphEdge(self.node_items[u], self.node_items[v])
                self.scene.addItem(edge)

        self.scene.setSceneRect(self.scene.itemsBoundingRect())
        
        # Restore selection
        if self.selected_node_id and self.selected_node_id in self.node_items:
            # We restore visual highlight but don't re-emit clicked signal to avoid recursion/spam
            self.highlight_nodes(center_node=self.selected_node_id, show_neighbors=True)

    def select_node(self, node_id):
        self.selected_node_id = node_id 
        if node_id in self.node_items:
            item = self.node_items[node_id]
            # Emit signal to update sidebar
            self.nodeClicked.emit(node_id, item.data)
            # Highlight
            self.highlight_nodes(center_node=node_id, show_neighbors=True)
            # Center view
            self.centerOn(item)
