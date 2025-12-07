import json
import networkx as nx
from pathlib import Path
from typing import Dict, Any, List

class DataLoader:
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.raw_data = {}

    def load_file(self, file_path: str) -> nx.MultiDiGraph:
        """
        Loads a JSON file and builds a networkx graph.
        Legacy format 'horarios.json' or new format with multiple schedules.
        """
        self.graph = nx.MultiDiGraph()
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with path.open("r", encoding="utf-8") as f:
            self.raw_data = json.load(f)

        # Build Name Map if definitions are present
        self.names_map = {}
        self.meta_map = {} # Store extra metadata like cuatrimestre
        if "planDeEstudios" in self.raw_data:
            for m in self.raw_data["planDeEstudios"]:
                self.names_map[m["id"]] = m["nombre"]
                # Capture cuatrimestre if available
                if "cuatrimestre" in m:
                    self.meta_map[m["id"]] = {"cuatrimestre": m["cuatrimestre"]}
        if "grupos" in self.raw_data:
            for g in self.raw_data["grupos"]:
                self.names_map[g["id"]] = g["nombre"]
        if "profesores" in self.raw_data:
            for p in self.raw_data["profesores"]:
                self.names_map[p["id"]] = p["nombre"]

        # Handle different structures
        if "horarios" in self.raw_data:
            # "horarios" is the list of schedules for EACH group (the full solution).
            schedules = self.raw_data["horarios"]
            if not schedules:
                return self.graph
            
            # Process ALL group schedules to build the complete graph
            for schedule in schedules:
                self._build_graph_from_schedule(schedule)
        else:
            # Assume it might be a single schedule object or raw input? 
            # If it's the valid output format, it should have "horarios" key.
            # If raw input, it has "profesores", "grupos", etc.
            # For now, let's assume output format.
            pass
            
        return self.graph

    def _build_graph_from_schedule(self, schedule: Dict[str, Any]):
        """
        Nodes:
         - Group (Type: Group)
         - Professor (Type: Professor)
         - Subject (Type: Subject)
        
        Edges:
         - Group -> Subject (takes)
         - Professor -> Subject (teaches)
         - Assignment (Group -> Professor via Subject at Slot)
        """
        bloques = schedule.get("bloques", [])
        
        for bloque in bloques:
            group_id = bloque.get("grupoId")
            prof_id = bloque.get("profesorId")
            subject_id = bloque.get("materiaId")
            
            # Add nodes if not exist
            if group_id:
                label = self.names_map.get(group_id, group_id)
                self.graph.add_node(group_id, Type="Group", Label=label, title=label, group="Group")
            if prof_id:
                label = self.names_map.get(prof_id, prof_id)
                self.graph.add_node(prof_id, Type="Professor", Label=label, title=label, group="Professor")
            if subject_id:
                label = self.names_map.get(subject_id, subject_id)
                # Attach metadata
                meta = self.meta_map.get(subject_id, {})
                self.graph.add_node(subject_id, Type="Subject", Label=label, title=label, group="Subject", **meta)
            
            # Add edges
            # Group takes Subject
            if group_id and subject_id:
                self.graph.add_edge(group_id, subject_id, relation="takes")
            
            # Professor teaches Subject
            if prof_id and subject_id:
                self.graph.add_edge(prof_id, subject_id, relation="teaches")
            
            # Professor teaches Group (derived)
            if prof_id and group_id:
                self.graph.add_edge(prof_id, group_id, relation="assigned_to")

    def get_stats(self):
        return {
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges(),
            "types": self._count_types()
        }

    def _count_types(self):
        counts = {}
        for _, data in self.graph.nodes(data=True):
            t = data.get("Type", "Unknown")
            counts[t] = counts.get(t, 0) + 1
        return counts
