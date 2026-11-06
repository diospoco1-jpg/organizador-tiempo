# Organizador de Tiempo — versión móvil 1.0

Aplicación educativa basada en el reporte del proyecto del Instituto Nacional de Corinto.

## Funciones incluidas

- Calendario semanal y agenda diaria por horas.
- Registro de tareas con fecha, duración, categoría, prioridad, fecha límite y hora fija opcional.
- Rutinas repetidas en los días de la semana que el usuario seleccione.
- Asistente de planificación que ordena las tareas pendientes según prioridad, urgencia y duración, y busca espacios libres sin mover las rutinas ni las tareas con hora fija.
- Cuatro paletas de colores.
- Copia de seguridad e importación de datos en formato JSON.
- Diseño adaptable a celular y computadora.
- Caché de archivos para abrir la aplicación sin conexión después de la primera visita.

## Qué significa “inteligencia artificial” en esta versión

El reporte propone un algoritmo sencillo para analizar la urgencia de las actividades. Esta versión implementa ese motor de priorización con reglas y puntuaciones locales: no utiliza un chatbot ni un modelo generativo externo. El cálculo ocurre en el teléfono, no necesita una clave de API y no envía las tareas a un servidor.

## Tecnología y diferencia respecto al reporte

El reporte propone Python. Se incluye `motor_prioridad.py` como versión de referencia y prueba del algoritmo en Python. La versión móvil instalable usa HTML, CSS y JavaScript para que funcione directamente en Chrome para Android como PWA, sin tener que compilar un APK ni instalar Python en el teléfono. La lógica de priorización está replicada en `app.js`.

## Datos y privacidad

Las tareas, rutinas y preferencias se guardan en el almacenamiento local del navegador (`localStorage`). No hay cuentas ni sincronización entre dispositivos. Ese almacenamiento no equivale a cifrado; evita guardar contraseñas u otros datos sensibles. Si se borran los datos del navegador, se puede perder la agenda; por eso se incluye la función **Descargar respaldo**.

## Archivos principales

- `index.html`: estructura de las pantallas y formularios.
- `styles.css`: diseño adaptable y temas de color.
- `app.js`: tareas, rutinas, calendario y algoritmo de organización.
- `manifest.webmanifest`: datos de instalación de la PWA.
- `sw.js`: caché para uso sin conexión.
- `icons/`: iconos de la aplicación.
- `motor_prioridad.py`: versión de referencia del motor en Python.
- `GUIA_INSTALACION_ANDROID.md`: publicación e instalación en Android.

## Prueba local en computadora

La PWA necesita servirse desde un sitio web (HTTPS para instalarla; `localhost` sirve para probarla en la computadora). Puedes abrir una terminal en esta carpeta y ejecutar:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000` en Chrome. Para probar la instalación en un teléfono, publica la carpeta en un sitio HTTPS siguiendo la guía.
