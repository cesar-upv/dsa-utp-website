import json
import os

def generate_extended_data():
    input_path = '../data_examples/plan-conpleto-q1.json'
    output_path = '../data_examples/plan-completo-q1-extended.json'
    
    with open(input_path, 'r') as f:
        data = json.load(f)
        
    # 1. Increase Professor Availability and Max Hours
    for prof in data['profesores']:
        prof['maxHoras'] = 15 # Set limit to 15
        for day in prof['disponibilidad']:
            for slot in prof['disponibilidad'][day]:
                if slot != 'receso':
                    prof['disponibilidad'][day][slot] = 'available'
                    
    # 2. Increase Subject Hours
    for materia in data['planDeEstudios']:
        # Increase by 2, cap at 8
        materia['horasSemana'] = min(materia['horasSemana'] + 2, 8)
        
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print(f"Generated {output_path}")

if __name__ == '__main__':
    generate_extended_data()
