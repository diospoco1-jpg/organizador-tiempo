"""Motor de priorización de referencia en Python para Organizador de Tiempo.

La aplicación Android instalable ejecuta la misma lógica en JavaScript para no
necesitar un servidor. Este módulo permite revisar y probar el algoritmo Python
propuesto en el reporte del proyecto.
"""
from datetime import date


def puntaje_tarea(tarea: dict) -> int:
    """Calcula prioridad con importancia, fecha límite y duración.

    tarea: {"prioridad": 1|2|3, "fecha": date, "fecha_limite": date|None,
           "duracion": int}
    """
    puntaje = int(tarea.get("prioridad", 2)) * 35
    fecha_limite = tarea.get("fecha_limite")
    fecha_actividad = tarea.get("fecha") or date.today()

    if isinstance(fecha_limite, str):
        fecha_limite = date.fromisoformat(fecha_limite)
    if isinstance(fecha_actividad, str):
        fecha_actividad = date.fromisoformat(fecha_actividad)

    if fecha_limite:
        dias = (fecha_limite - fecha_actividad).days
        if dias <= 0:
            puntaje += 120
        elif dias == 1:
            puntaje += 95
        elif dias <= 3:
            puntaje += 70
        elif dias <= 7:
            puntaje += 45
        else:
            puntaje += 15

    if int(tarea.get("duracion", 30)) <= 30:
        puntaje += 8
    return puntaje


def ordenar_tareas(tareas: list[dict]) -> list[dict]:
    """Devuelve las tareas de mayor a menor prioridad calculada."""
    return sorted(tareas, key=puntaje_tarea, reverse=True)


if __name__ == "__main__":
    ejemplo = [
        {"nombre": "Leer capítulo", "prioridad": 1, "fecha": date.today(), "fecha_limite": None, "duracion": 30},
        {"nombre": "Preparar exposición", "prioridad": 3, "fecha": date.today(), "fecha_limite": date.today(), "duracion": 60},
        {"nombre": "Repasar inglés", "prioridad": 2, "fecha": date.today(), "fecha_limite": None, "duracion": 45},
    ]
    for tarea in ordenar_tareas(ejemplo):
        print(f"{tarea['nombre']}: {puntaje_tarea(tarea)} puntos")
