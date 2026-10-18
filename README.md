# Tesla Roadster — web de scroll cinematográfico

Recreación de la web mostrada en el vídeo de referencia: hero `ROADSTER` con toberas, 01 Despegue (cronómetro 0→0,65 s),
02 El salto (VUELA) y 03 La pared (HUD, giro de 180° y techo).

## Ejecutar
```
python3 -m http.server 8000   # o: npx serve .
```
Abre http://localhost:8000. Sin dependencias ni build (HTML + CSS + JS). Las fuentes se cargan de Google Fonts, con fallback del sistema.

## Estructura
- `index.html`, `css/styles.css`, `js/main.js`
- `assets/images/` arte SVG sustituible (`car-rear`, `car-top-gold`, `car-top-dark`, `wheel`, `desert-front`, `desert-road`, `desert-top`)
- `assets/videos/` ver su README para enchufar vídeos reales
- `assets/icons/`, `assets/fonts/`

## Pendiente / limitaciones
- No se dispone de los vídeos/fotos originales: todo el arte es procedural y debe sustituirse por los recursos reales.
- Textos pequeños (pies de foto) ilegibles en el vídeo: son aproximaciones.
- "Reservar" valida el formulario, pero no hay backend: no se envía nada.
