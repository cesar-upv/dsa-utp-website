import json
import sys
import os

# Add current directory to path to import scheduler
sys.path.append(os.getcwd())
import scheduler

def run_debug():
    # Load data
    with open('../data_examples/plan-conpleto-q1.json', 'r') as f:
        data = json.load(f)

    profesores = data['profesores']
    grupos = data['grupos']
    plan_de_estudios = data['planDeEstudios']
    
    # Pre-process data (copied from app.py)
    nodes_data = []
    slot_map = {
        's1': 0, 's2': 1, 's3': 2, 's4': 3,
        's5': 4, 's6': 5, 's7': 6, 's8': 7, 's9': 8
    }
    day_map = {'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4}
    
    print("Generating nodes...")
    for grupo in grupos:
        materias = [m for m in plan_de_estudios if m['cuatrimestre'] == grupo['cuatrimestre']]
        for materia in materias:
            for i in range(materia['horasSemana']):
                possible = []
                eligible_profs = [p for p in profesores if materia['id'] in p['competencias']]
                
                for p_idx, prof in enumerate(profesores):
                    if prof not in eligible_profs: continue
                    for day_id, slots in prof['disponibilidad'].items():
                        if day_id not in day_map: continue
                        day_idx = day_map[day_id]
                        for slot_id, status in slots.items():
                            if status == 'available' and slot_id in slot_map:
                                slot_idx = slot_map[slot_id]
                                possible.append((day_idx, slot_idx, p_idx))
                                
                nodes_data.append({
                    'id': f"{grupo['id']}-{materia['id']}-{i}",
                    'grupoId': grupo['id'],
                    'materiaId': materia['id'],
                    'unitIndex': i,
                    'possibleAssignments': possible
                })

    print(f"Running scheduler with {len(nodes_data)} nodes...")
    result = scheduler.run_scheduler(nodes_data, profesores, grupos, plan_de_estudios, 'greedy')
    
    print(f"Success: {result['success']}")
    assignments = result['assignments']
    
    # Check consistency
    print("Checking consistency...")
    inconsistencies = 0
    
    # Group assignments by (Grupo, Materia)
    grouped = {}
    for a in assignments:
        key = (a['grupoId'], a['materiaId'])
        if key not in grouped: grouped[key] = set()
        grouped[key].add(a['profesorId'])
        
    for (grp, mat), profs in grouped.items():
        if len(profs) > 1:
            print(f"INCONSISTENCY: Group {grp}, Materia {mat} has professors: {profs}")
            inconsistencies += 1
            
    if inconsistencies == 0:
        print("No inconsistencies found.")
    else:
        print(f"Found {inconsistencies} inconsistencies.")

if __name__ == '__main__':
    run_debug()
