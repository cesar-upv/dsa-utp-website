# cython: language_level=3
import cython
from libc.stdlib cimport malloc, free
import numpy as np
cimport numpy as np
import time

# Define types for better performance
ctypedef np.int32_t INT32_t

cdef class Node:
    cdef public str id
    cdef public str grupo_id
    cdef public str materia_id
    cdef public int unit_index
    cdef public list possible_assignments # List of tuples (day_idx, slot_idx, prof_idx)
    cdef public int assigned_day
    cdef public int assigned_slot
    cdef public int assigned_prof

    def __init__(self, id, grupo_id, materia_id, unit_index):
        self.id = id
        self.grupo_id = grupo_id
        self.materia_id = materia_id
        self.unit_index = unit_index
        self.possible_assignments = []
        self.assigned_day = -1
        self.assigned_slot = -1
        self.assigned_prof = -1

cdef class GraphScheduler:
    cdef list nodes
    cdef dict nodes_by_id
    cdef int num_days
    cdef int num_slots
    cdef int num_profs
    
    # State matrices for O(1) checks
    # [prof_idx][day][slot] -> 1 if busy, 0 free
    cdef int[:, :, :] prof_schedule 
    # [group_idx][day][slot] -> 1 if busy, 0 free
    cdef int[:, :, :] group_schedule
    # [prof_idx] -> current load
    cdef int[:] prof_load
    # [prof_idx] -> max load
    cdef int[:] prof_max_load
    
    # Mappings
    cdef dict group_to_idx
    cdef dict prof_to_idx
    cdef list idx_to_prof_id
    cdef list idx_to_group_id
    cdef dict materia_to_idx
    
    # Tracking for contiguity and daily limits
    # [group_idx][materia_idx][day] -> count
    cdef int[:, :, :] group_materia_day_count
    # [group_idx][materia_idx][day] -> bitmask of slots
    cdef int[:, :, :] group_materia_day_slots

    # Professor Consistency
    # [group_idx][materia_idx] -> prof_idx (or -1)
    cdef int[:, :] prof_assignment
    # [group_idx][materia_idx] -> count of assignments
    cdef int[:, :] prof_assignment_count

    # Professor-Group-Subject Tracking
    # [prof_idx][group_idx] -> materia_idx (or -1 if none)
    cdef int[:, :] prof_group_subject
    # [prof_idx][group_idx] -> count of assignments for this subject
    cdef int[:, :] prof_group_subject_count

    # Best Partial Solution
    cdef int max_assigned_count
    cdef list best_assignments
    
    # Time Limit
    cdef double start_time
    cdef double time_limit
    cdef long long call_count
    cdef bint time_limit_reached

    def __init__(self, nodes, num_days, num_slots, profesores, grupos, materias):
        self.nodes = nodes
        self.num_days = num_days
        self.num_slots = num_slots
        self.num_profs = len(profesores)
        
        # Initialize mappings
        self.prof_to_idx = {p['id']: i for i, p in enumerate(profesores)}
        self.idx_to_prof_id = [p['id'] for p in profesores]
        self.group_to_idx = {g['id']: i for i, g in enumerate(grupos)}
        self.idx_to_group_id = [g['id'] for g in grupos]
        self.materia_to_idx = {m['id']: i for i, m in enumerate(materias)}
        
        # Initialize state arrays
        self.prof_schedule = np.zeros((self.num_profs, num_days, num_slots), dtype=np.int32)
        self.group_schedule = np.zeros((len(grupos), num_days, num_slots), dtype=np.int32)
        self.prof_load = np.zeros(self.num_profs, dtype=np.int32)
        self.prof_max_load = np.array([p['maxHoras'] for p in profesores], dtype=np.int32)
        
        self.group_materia_day_count = np.zeros((len(grupos), len(materias), num_days), dtype=np.int32)
        self.group_materia_day_slots = np.zeros((len(grupos), len(materias), num_days), dtype=np.int32)
        
        self.prof_assignment = np.full((len(grupos), len(materias)), -1, dtype=np.int32)
        self.prof_assignment_count = np.zeros((len(grupos), len(materias)), dtype=np.int32)

        self.prof_group_subject = np.full((self.num_profs, len(grupos)), -1, dtype=np.int32)
        self.prof_group_subject_count = np.zeros((self.num_profs, len(grupos)), dtype=np.int32)

        self.max_assigned_count = -1
        self.best_assignments = []

        # Pre-fill availability (blocked slots = busy)
        # Note: In a full implementation, we would mark blocked slots in prof_schedule here.
        # For now, we assume the 'possible_assignments' passed to us already filter out blocked slots.
        pass

    def solve(self, algorithm='backtracking', time_limit=300):
        if algorithm == 'greedy':
            return self.solve_greedy()
        else:
            self.time_limit = time_limit
            self.start_time = time.time()
            self.call_count = 0
            self.time_limit_reached = False
            print(f"Starting backtracking with time limit: {time_limit}s")
            
            success = self.backtrack(0)
            if not success and self.max_assigned_count > -1:
                # Restore best assignments
                self.restore_best()
                return False # It's a partial solution
            return success

    cdef void restore_best(self):
        # Restore the node states from best_assignments
        cdef int i
        cdef Node node
        for i in range(len(self.best_assignments)):
            state = self.best_assignments[i]
            node = self.nodes[i]
            node.assigned_day = state[0]
            node.assigned_slot = state[1]
            node.assigned_prof = state[2]

    cdef bint solve_greedy(self):
        cdef int i
        cdef Node node
        cdef int group_idx, materia_idx
        cdef int day_idx, slot_idx, prof_idx
        
        for i in range(len(self.nodes)):
            node = self.nodes[i]
            group_idx = self.group_to_idx[node.grupo_id]
            materia_idx = self.materia_to_idx[node.materia_id]
            
            assigned = False
            for assignment in node.possible_assignments:
                day_idx, slot_idx, prof_idx = assignment
                
                if self.is_valid(node, group_idx, materia_idx, day_idx, slot_idx, prof_idx):
                    # print(f"Assigning Node {node.id} (G:{group_idx} M:{materia_idx}) to Prof {prof_idx}")
                    self.apply_move(node, group_idx, materia_idx, day_idx, slot_idx, prof_idx)
                    assigned = True
                    break
            
            if not assigned:
                # print(f"Failed to assign Node {node.id}")
                pass
                
        return True

    cdef bint backtrack(self, int node_idx):
        self.call_count += 1
        
        # Check time limit every 1000 calls
        if self.call_count % 1000 == 0:
            if self.time_limit_reached:
                 return False
            if time.time() - self.start_time > self.time_limit:
                print(f"Time limit reached ({self.time_limit}s). Aborting search.")
                self.time_limit_reached = True
                return False
            # Progress logging
            # print(f"Backtracking at node {node_idx}/{len(self.nodes)} (Best: {self.max_assigned_count})")

        # Update best solution tracking
        if node_idx > self.max_assigned_count:
            self.max_assigned_count = node_idx
            # Snapshot current assignments
            self.best_assignments = []
            for i in range(node_idx):
                n = <Node>self.nodes[i]
                self.best_assignments.append((n.assigned_day, n.assigned_slot, n.assigned_prof))
            
            # Log progress on new best found
            print(f"New best solution found: {node_idx}/{len(self.nodes)} assignments")

        if node_idx >= len(self.nodes):
            return True
            
        if self.time_limit_reached:
            return False

        cdef Node node = self.nodes[node_idx]
        cdef int group_idx = self.group_to_idx[node.grupo_id]
        cdef int materia_idx = self.materia_to_idx[node.materia_id]
        
        # Optimization: Sort possible assignments?
        # For now, iterate as provided.
        
        for assignment in node.possible_assignments:
            if self.time_limit_reached:
                return False
                
            day_idx, slot_idx, prof_idx = assignment
            
            if self.is_valid(node, group_idx, materia_idx, day_idx, slot_idx, prof_idx):
                # Apply
                self.apply_move(node, group_idx, materia_idx, day_idx, slot_idx, prof_idx)
                
                if self.backtrack(node_idx + 1):
                    return True
                
                if self.time_limit_reached:
                    # Don't undo if we are aborting? 
                    # Actually we MUST undo to keep state consistent if we want to restore best later?
                    # But restore_best overwrites everything anyway.
                    # However, undoing is safer to leave clean state.
                    self.undo_move(node, group_idx, materia_idx, day_idx, slot_idx, prof_idx)
                    return False
                
                # Backtrack
                self.undo_move(node, group_idx, materia_idx, day_idx, slot_idx, prof_idx)
                
        return False

    cdef bint is_valid(self, Node node, int group_idx, int materia_idx, int day_idx, int slot_idx, int prof_idx):
        cdef int current_prof
        cdef int assigned_subject
        cdef int count
        cdef int mask
        cdef int adj_mask

        # 1. Prof busy
        if self.prof_schedule[prof_idx, day_idx, slot_idx] == 1: return False
        
        # 2. Group busy
        if self.group_schedule[group_idx, day_idx, slot_idx] == 1: return False
        
        # 3. Prof max load
        if self.prof_load[prof_idx] >= self.prof_max_load[prof_idx]: return False
        
        # 4. Professor Consistency (Same subject -> Same prof)
        current_prof = self.prof_assignment[group_idx, materia_idx]
        if current_prof != -1 and current_prof != prof_idx:
            return False

        # 4b. NEW: Professor Exclusivity (Same prof -> Only ONE subject per group)
        # Check if this professor is already assigned to this group for a DIFFERENT subject
        assigned_subject = self.prof_group_subject[prof_idx, group_idx]
        if assigned_subject != -1 and assigned_subject != materia_idx:
            return False

        # 5. Max 2 hours per day per subject
        if self.group_materia_day_count[group_idx, materia_idx, day_idx] >= 2: return False
        
        # 6. Contiguity (if 2nd hour)
        # If count > 0, check if adjacent to existing slot
        count = self.group_materia_day_count[group_idx, materia_idx, day_idx]
        if count > 0:
            # Check bitmask
            mask = self.group_materia_day_slots[group_idx, materia_idx, day_idx]
            # We need to be adjacent to at least one existing slot?
            # Or if count == 1, exactly adjacent to THAT slot.
            # Assuming max 2 hours, count is 1.
            # Check if (slot_idx - 1) or (slot_idx + 1) is in mask.
            adj_mask = (1 << (slot_idx - 1)) | (1 << (slot_idx + 1))
            if (mask & adj_mask) == 0:
                return False

        # 7. Max Gap <= 1 hour
        # Check if adding this slot creates a gap > 1 with existing slots
        cdef int s
        cdef int last_slot = -1
        cdef int gap
        cdef int is_busy
        cdef int daily_hours = 0
        
        for s in range(self.num_slots):
            is_busy = 0
            if s == slot_idx:
                is_busy = 1
            elif self.group_schedule[group_idx, day_idx, s] == 1:
                is_busy = 1
                daily_hours += 1 # Count existing hours
            
            if is_busy == 1:
                if last_slot != -1:
                    gap = s - last_slot - 1
                    if gap > 1:
                        return False
                last_slot = s
        
        # 8. Max 7 hours per day per group
        # daily_hours already counts existing slots. 
        # We are adding 1 new slot (slot_idx).
        # So if existing count >= 7, we can't add more.
        if daily_hours >= 7:
            return False

        return True

    cdef void apply_move(self, Node node, int group_idx, int materia_idx, int day_idx, int slot_idx, int prof_idx):
        self.prof_schedule[prof_idx, day_idx, slot_idx] = 1
        self.group_schedule[group_idx, day_idx, slot_idx] = 1
        self.prof_load[prof_idx] += 1
        
        self.group_materia_day_count[group_idx, materia_idx, day_idx] += 1
        self.group_materia_day_slots[group_idx, materia_idx, day_idx] |= (1 << slot_idx)
        
        if self.prof_assignment_count[group_idx, materia_idx] == 0:
            self.prof_assignment[group_idx, materia_idx] = prof_idx
        self.prof_assignment_count[group_idx, materia_idx] += 1

        if self.prof_group_subject_count[prof_idx, group_idx] == 0:
            self.prof_group_subject[prof_idx, group_idx] = materia_idx
        self.prof_group_subject_count[prof_idx, group_idx] += 1
        
        node.assigned_day = day_idx
        node.assigned_slot = slot_idx
        node.assigned_prof = prof_idx

    cdef void undo_move(self, Node node, int group_idx, int materia_idx, int day_idx, int slot_idx, int prof_idx):
        self.prof_schedule[prof_idx, day_idx, slot_idx] = 0
        self.group_schedule[group_idx, day_idx, slot_idx] = 0
        self.prof_load[prof_idx] -= 1
        
        self.group_materia_day_count[group_idx, materia_idx, day_idx] -= 1
        self.group_materia_day_slots[group_idx, materia_idx, day_idx] &= ~(1 << slot_idx)
        
        self.prof_assignment_count[group_idx, materia_idx] -= 1
        if self.prof_assignment_count[group_idx, materia_idx] == 0:
            self.prof_assignment[group_idx, materia_idx] = -1

        self.prof_group_subject_count[prof_idx, group_idx] -= 1
        if self.prof_group_subject_count[prof_idx, group_idx] == 0:
            self.prof_group_subject[prof_idx, group_idx] = -1
        
        node.assigned_day = -1
        node.assigned_slot = -1
        node.assigned_prof = -1

def run_scheduler(nodes_data, profesores, grupos, materias, algorithm='backtracking', time_limit=300):
    # Prepare data
    nodes = []
    for n in nodes_data:
        node = Node(n['id'], n['grupoId'], n['materiaId'], n['unitIndex'])
        node.possible_assignments = n['possibleAssignments']
        nodes.append(node)
        
    scheduler = GraphScheduler(nodes, 5, 9, profesores, grupos, materias) # 5 days, 9 slots
    success = scheduler.solve(algorithm, time_limit)
    
    result = []
    for node in nodes:
        if node.assigned_day != -1:
            result.append({
                'id': node.id,
                'grupoId': node.grupo_id,
                'materiaId': node.materia_id,
                'profesorId': scheduler.idx_to_prof_id[node.assigned_prof],
                'dia': ['mon', 'tue', 'wed', 'thu', 'fri'][node.assigned_day],
                'slotId': f"s{node.assigned_slot + 1}" if node.assigned_slot < 4 else f"s{node.assigned_slot + 1}"
            })
            
    return {'success': success, 'assignments': result}
