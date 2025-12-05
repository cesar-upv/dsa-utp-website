from flask import Flask, request, jsonify
from flask_cors import CORS
import scheduler
import sys

app = Flask(__name__)
CORS(app)

@app.route('/api/solve', methods=['POST'])
def solve():
    data = request.json
    profesores = data.get('profesores', [])
    grupos = data.get('grupos', [])
    plan_de_estudios = data.get('planDeEstudios', [])
    algorithm = data.get('algorithm', 'backtracking')
    time_limit = data.get('timeLimit', 300) # Default 5 minutes
    
    # Pre-process data to create "Nodes" (Units)
    nodes_data = []
    
    # Helper to map slot IDs to indices
    slot_map = {
        's1': 0, 's2': 1, 's3': 2, 's4': 3,
        's5': 4, 's6': 5, 's7': 6, 's8': 7, 's9': 8
    }
    day_map = {'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4}
    days_list = ['mon', 'tue', 'wed', 'thu', 'fri']
    
    materia_global_idx = 0
    
    for grupo in grupos:
        materias = [m for m in plan_de_estudios if m['cuatrimestre'] == grupo['cuatrimestre']]
        for materia in materias:
            materia_global_idx += 1
            
            # 1. Day Rotation Strategy
            # Rotate starting day based on materia index to distribute load
            start_day_idx = materia_global_idx % 5
            day_order = days_list[start_day_idx:] + days_list[:start_day_idx]
            
            for i in range(materia['horasSemana']):
                # Calculate possible assignments for this unit
                # (day_idx, slot_idx, prof_idx)
                possible = []
                
                # Filter eligible professors
                eligible_profs = [p for p in profesores if materia['id'] in p['competencias']]
                
                # 2. Professor Load Balancing (Static Round Robin)
                # Rotate eligible professors to avoid always picking the first one
                # This helps distribute the "first pick" advantage
                if eligible_profs:
                    prof_start_idx = (materia_global_idx + i) % len(eligible_profs)
                    eligible_profs = eligible_profs[prof_start_idx:] + eligible_profs[:prof_start_idx]
                
                # We need to map back to original indices for the backend
                # Create a list of (prof_obj, original_idx)
                eligible_profs_with_idx = []
                for p in eligible_profs:
                     # Find original index efficiently? 
                     # We can just iterate the main list or build a map. 
                     # Since num_profs is small, index() is fine.
                     eligible_profs_with_idx.append((p, profesores.index(p)))

                # Generate assignments following the rotated day order
                for day_id in day_order:
                    day_idx = day_map[day_id]
                    
                    # Iterate slots (standard order s1-s9 is usually fine, but could also be rotated)
                    for slot_id, slot_idx in sorted(slot_map.items(), key=lambda x: x[1]):
                        
                        # Check each professor
                        for prof, p_idx in eligible_profs_with_idx:
                            # Check availability
                            if prof['disponibilidad'].get(day_id, {}).get(slot_id) == 'available':
                                possible.append((day_idx, slot_idx, p_idx))
                                
                nodes_data.append({
                    'id': f"{grupo['id']}-{materia['id']}-{i}",
                    'grupoId': grupo['id'],
                    'materiaId': materia['id'],
                    'unitIndex': i,
                    'possibleAssignments': possible
                })

    try:
        result = scheduler.run_scheduler(nodes_data, profesores, grupos, plan_de_estudios, algorithm, time_limit)
        
        # Format response to match frontend expected format
        horarios = []
        assignments = result['assignments']
        
        for grupo in grupos:
            bloques = []
            grp_assignments = [a for a in assignments if a['grupoId'] == grupo['id']]
            
            for a in grp_assignments:
                # Fix slot ID mapping (reverse of what we did in pyx)
                # In pyx we just did s{i+1}, but we need to handle receso gap if we want to be precise
                # For now let's trust the simple mapping s1..s9
                
                bloques.append({
                    'id': a['id'],
                    'grupoId': a['grupoId'],
                    'materiaId': a['materiaId'],
                    'profesorId': a['profesorId'],
                    'dia': a['dia'],
                    'slotId': a['slotId'], # This needs to be correct s1..s9
                    'duracion': 1,
                    'huecoPrevio': False,
                    'esContinuo': True
                })
                
            horarios.append({
                'grupoId': grupo['id'],
                'bloques': bloques,
                'metricas': {
                    'huecos': 0, # TODO: Calculate
                    'violacionesDuras': 0 if result['success'] else 1,
                    'softScore': 10
                }
            })

        # Calculate Warnings
        warnings = []
        
        # 1. Unassigned Subjects
        assigned_ids = set(a['id'] for a in assignments)
        unassigned_count = 0
        missing_summary = {}
        
        for node in nodes_data:
            if node['id'] not in assigned_ids:
                unassigned_count += 1
                key = f"{node['grupoId']}|{node['materiaId']}"
                missing_summary[key] = missing_summary.get(key, 0) + 1
                
        for key, count in missing_summary.items():
            grp_id, mat_id = key.split('|')
            # Find names
            grp_name = next((g['nombre'] for g in grupos if g['id'] == grp_id), grp_id)
            mat_name = next((m['nombre'] for m in plan_de_estudios if m['id'] == mat_id), mat_id)
            warnings.append(f"No se pudieron asignar {count} horas de {mat_name} al grupo {grp_name}")

        # 2. Min 6 Classes per Day (Warning)
        for grupo in grupos:
            grp_assignments = [a for a in assignments if a['grupoId'] == grupo['id']]
            by_day = {'mon': 0, 'tue': 0, 'wed': 0, 'thu': 0, 'fri': 0}
            for a in grp_assignments:
                if a['dia'] in by_day:
                    by_day[a['dia']] += 1
            
            for day, count in by_day.items():
                if 0 < count < 6:
                    grp_name = grupo['nombre']
                    day_name = {'mon': 'Lunes', 'tue': 'Martes', 'wed': 'Miércoles', 'thu': 'Jueves', 'fri': 'Viernes'}.get(day, day)
                    warnings.append(f"El grupo {grp_name} tiene pocas clases ({count}) el {day_name} (mínimo recomendado: 6)")

        return jsonify({
            'status': 'ok' if result['success'] else 'infeasible',
            'horarios': horarios,
            'resumen': {
                'mensaje': 'Generado con Cython Backend' if result['success'] else f"Incompleto ({len(assignments)}/{len(nodes_data)} asignados)",
                'tiempoMs': 0, 
                'violacionesDuras': len(warnings),
                'huecosPromedio': 0
            },
            'advertencias': warnings
        })
        
    except Exception as e:
        print(e)
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
