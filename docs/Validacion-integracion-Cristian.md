# Validación de la integración de Cristian

Fecha: 25 de noviembre de 2026.

## Base revisada

El archivo recibido NavInside.zip contiene NavInside-Wifi-Movimiento, sus fuentes Ionic/Angular, Android y NavInside-Hippocampus-debug.apk. Se comprobaron 169 archivos de la copia web Android: coinciden byte por byte con los empaquetados en esa APK. La APK recibida se conserva como referencia local y no se sube como código fuente.

El motor nuevo está en localizacion-wifi.ts, navegacion-wifi.service.ts, mapa-radio.service.ts y NavInsideWifiPlugin.java. Combina huellas Wi-Fi, pasos, rumbo, filtro de partículas sobre el grafo y RTT opcional. No se reemplazó por el servicio de la versión anterior.

## Correcciones integradas

- Restauración de los tres recorridos accesibles del nivel 3 hacia tenis, acceso accesible de piscina principal y piscina temperada; cálculo local y carga de datos remotos.
- Correspondencia de los pasos intermedios con el plano y conservación de fotografías de referencia al atravesarlos. Las fotografías de otros destinos conservan el comportamiento original.
- Los pasos auxiliares participan en el grafo y en el posicionamiento, pero no aparecen como destinos independientes en los selectores.
- Longitudes provenientes de escala identificadas como estimadas tanto en pantalla como en el modelo Wi-Fi; no se usan para recalibrar mediciones reales.
- Conservación del atajo normal de 36 m hacia tenis, y exclusión de sus escaleras del modo accesible.
- Exclusión de Galaxy A31 por petición de Pedro y conservación del inventario adicional del nivel 3.
- Dependencias fijadas a las versiones del lockfile para reproducibilidad y compatibilidad de Capacitor.
- CI ejecuta lint, pruebas unitarias, mapas integrados y compilación.

## Resultado

- Instalación limpia de dependencias con npm ci: correcta en Linux.
- Pruebas unitarias: 189 aprobadas, 23 archivos.
- Comprobación de mapas: niveles 1, 3, 4, 5 y 6; también los tres desvíos accesibles sin escaleras.
- Compilación web de producción: correcta.
- Lint: correcto.

Persisten advertencias informativas sobre mapas de fuentes de html5-qrcode y presupuestos de estilos de las pantallas. No impiden las comprobaciones anteriores.

## Límites

El mapa de radio recibido contiene cero muestras de recorridos. Se conservan las huellas puntuales incluidas, y la app permite importar las muestras guardadas en otro teléfono. No se atribuye ese estado a una falta de levantamiento por parte del usuario. No se inventaron asociaciones, BSSID, RSSI ni capturas.

Las pruebas automáticas verifican implementación y regresiones; no certifican precisión física en el recinto. No se generó una APK Android de esta integración en este entorno. La APK adjunta originalmente no contiene los cambios posteriores. Para instalar el resultado se necesita compilar la web, ejecutar cap sync android y generar una APK nueva, en ese orden.
