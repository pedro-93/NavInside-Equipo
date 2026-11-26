# Vista tipo Waze, metraje e íconos

## Pantalla principal tipo Waze

Al abrir la app, el **plano ocupa la pantalla** y todo se hace desde abajo, como en Waze:

- **☰ (arriba a la izquierda):** idioma (español, inglés, portugués) y las opciones del menú de la app: buscar destino, Aquí estoy, leer código QR, ruta accesible, Explora, Tour virtual 360, Planos, vista clásica y salir.
- **Barra de marcas (arriba, al centro):** logo de Hippocampus Resort y nombre NavInside.
- **Botón redondo con el logo de Hippocampus (arriba a la derecha):** abre los planos de la app (niveles 1, 3, 4, 5, piso 6 y resort completo). Debajo, **⌖ Aquí estoy**.
- **Hoja inferior «¿Adónde vas?»** (se arrastra hacia arriba o abajo con el dedo, como en Waze; un toque en el asa la sube o la baja):
  - Debajo del buscador y los atajos está la tira **«Puntos de interés · nivel»**: la misma lista del plano, con las mismas fotos y orden; los puntos sin foto muestran un ícono.
  - Al tocarla o al subirla aparecen **todos los puntos de interés**, agrupados por nivel, con su foto o ícono.
  - Busca aunque el texto no sea exacto: «jim nacio» → Gimnasio, «terra mar» → Salón Terramar, «resepcion» → Recepciones.
  - **🎙 Voz:** usa la misma lógica de reconocimiento de lugares que ya tenía la app. Si reconoce el lugar, lo elige; si no, muestra los lugares que más se parecen a lo dicho.
  - Origen y destino: al elegir el destino, pregunta «¿Desde dónde sales?». Con ambos puntos elegidos, calcula la ruta y vuelve al plano. ⇅ intercambia origen y destino.
  - Atajos: Origen, ♿ Accesible y 🧭 Explora.
  - **Más opciones:** 🧭 Explora y 🌐 Tour virtual 360, con miniaturas.
- **Con ruta activa:** indicación verde arriba (máximo 2 líneas) y una tarjeta abajo con origen → destino, distancia, ← Iniciar/Pausar →, ✕ cancelar y «Ver fotos de la parada» (la misma galería del recorrido).
- **Explora:** puntos de cada nivel con sus fotos; «Ver en el mapa» o «Ir aquí».
- **Tour virtual 360:** las 29 escenas del tour con sus miniaturas guardadas en la app. El recorrido 360 se abre en el sitio del tour y necesita Internet, igual que antes.
- **Vista clásica:** desde ☰ → «Vista clásica» se ven todas las secciones de siempre; «← Atrás», «🗺️ Volver al mapa» o el botón atrás del teléfono regresan al mapa.

No se quitó ninguna función ni ninguna foto. Las fotos interactivas de cada plano siguen en su lugar: la tarjeta del plano, las galerías y la foto de llegada.

## Voz de la guía

**Lo que dice la voz al guiar no cambió.** La aproximación de metros se agrega solo al texto en pantalla. Se verificó comparando la versión original y la nueva en 576 casos (3 idiomas, con y sin medidas, escaleras, referencias): la voz es idéntica en todos.

## Metraje de todos los niveles

- **Nivel 1:** conserva sus medidas de terreno de punto a punto.
- **Tramos sin medida, en cualquier nivel:** se calculan con el recorrido dibujado en el plano interactivo y su escala en metros (`src/app/data/metraje-planos.data.ts`, generado con `node scripts/generar-metraje-planos.mjs`).
- **Corrección por nivel:** el dibujo se ajusta con las medidas de terreno del mismo nivel (mediana medido/dibujado). Ejemplo: el dibujo del piso 6 exagera cerca de un 40 %, y con el factor 0,70 el recorrido hasta Tinajas queda en ~46 m, frente a 48,3 m medidos.
- **Dónde se ven:** en «Distancia total / restante / próximo tramo» y en el texto de la guía, como «≈ 25 m (aprox.)» o «Aproximado según el plano: ≈ 25 m». **No se dibujan sobre el plano.**
- **El seguimiento por pasos sigue exigiendo medidas de terreno:** las aproximaciones no lo habilitan.
- **El cursor Wi-Fi también usa este metraje corregido.**

## Íconos para puntos sin foto

- **Puntos sin fotografía:** muestran un ícono según el lugar: 🛗 ascensor, 🪜 escalera, 🧺 Entrega de Toallas (antes mostraba 🚻), 🚻 baños, ♨️ jacuzzi/tinajas, 🧖 sauna, 🏋️ gimnasio, 🎉 salones, 🛎️ recepción, 🚪 accesos, etc.
- **Dónde:** en las listas de la app, en el buscador, en Explora y en los marcadores y la lista de cada plano.
- **Las fotos existentes no se reemplazan.**

## Modo administrador (navegación Wi-Fi)

- **Huéspedes:** no ven nada de Wi-Fi: ni la opción del menú, ni el panel, ni el botón «Seguirme», ni el indicador 📶.
- **Para entrar:** abrir ☰, **tocar 5 veces el logo** del encabezado del menú e ingresar el PIN.
  - **PIN inicial: `2468`.** Cámbialo antes de entregar la app (instrucciones en `src/app/services/admin.service.ts`).
- **Ya dentro:** aparece «Administrador → Navegación Wi-Fi en movimiento» y «Salir del modo administrador».
- **Importante:** es una protección de la interfaz dentro de la app (oculta las opciones a los huéspedes), no una autenticación con servidor.

«Planifica tu recorrido» se quitó del menú ☰. El planificador sigue disponible en la vista clásica, y el buscador «¿Adónde vas?» cumple esa función.

## Ningún punto sin imagen e íconos de la app

- **Puntos sin foto:** muestran un **ícono imagen**, un cuadro de color con un dibujo, en lugar de un emoji (algunos teléfonos muestran los emoji en blanco o como cuadros vacíos). Aparecen en la tira de puntos, el buscador, Explora, la lista clásica, la tarjeta del punto en el plano, la lista del plano y los marcadores del mapa. Las fotos existentes no se tocan.
  - Son 28 íconos en `src/assets/iconos-puntos/`, generados con `node scripts/generar-iconos-puntos.mjs`.
  - Usan dibujos de Ionicons (licencia MIT, ya incluido en el proyecto), más tres dibujos propios: ascensor, escalera y toallas.
- **Ícono de la app en Android:** cuadrado, redondo y adaptable, con el logo de Hippocampus sobre fondo blanco. Antes era el ícono de Ionic.
- **Pantalla de inicio (splash):** logo de Hippocampus sobre fondo blanco, en las 11 resoluciones. Antes era la de Capacitor.
- **Web:** la pestaña dice «NavInside Hippocampus» y usa el logo como ícono.
- **Para regenerarlos si cambia el logo:** `node scripts/generar-icono-app.mjs` (solo usa Node.js).
