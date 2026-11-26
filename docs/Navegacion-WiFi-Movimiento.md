# Navegación Wi-Fi en movimiento

Esta versión agrega un **cursor Wi-Fi verde** que se mueve por el plano mientras la persona camina. No necesita GPS, ni QR, ni balizas.

## Sin conexión y sin Internet (seguridad)

- **El teléfono del huésped no se conecta a ninguna red Wi-Fi ni usa Internet.** Solo *escucha* las señales que las antenas ya emiten para todos (nombre de red, BSSID e intensidad), igual que la lista de redes de Ajustes.
- **No se envían datos.** El mapa de radio va incluido en la app (`assets/mapa-radio/mapa-radio.json`) y la posición se calcula dentro del teléfono.
- **No hace falta contraseña ni abrir la red de huéspedes:** las redes del resort siguen igual.
- **El movimiento entre escaneos sale del acelerómetro** (detector de pasos propio). No usa red ni pide permisos.
- Al escanear, Android envía las solicitudes estándar de búsqueda de redes (*probe requests*) con una dirección MAC aleatoria. Wi-Fi RTT mide la distancia sin conectarse a la antena.
- Si un teléfono estuviera conectado, la app también aprovecharía la intensidad de esa red, pero **no es necesario**.

Nota: la app completa ya tenía el permiso `INTERNET` para otras funciones (Supabase, el enlace al panorama 360). La navegación Wi-Fi no lo usa.

## Por qué la versión anterior no se movía

La app anterior solo hacía escaneos completos con `startScan()`. Android permite **4 escaneos cada 2 minutos**, y la app pedía dos escaneos iguales seguidos para corregir la posición, o sea entre 40 y 90 s. Además, comparaba con 9 puntos fijos. Por eso el WiFi solo podía hacer saltar el cursor a un punto de vez en cuando.

## Qué cambia

| Fuente | Frecuencia | ¿Requiere conexión? |
|---|---|---|
| Escaneo completo de redes | cada 30 s (límite de Android; cada 3 s si se desactiva la limitación) | No |
| Escucha pasiva de escaneos del sistema | cuando ocurren | No |
| Wi-Fi RTT (802.11mc), distancia a la antena | ~1 por segundo | No (si teléfono y antenas lo admiten) |
| **Pasos (acelerómetro)** | continuo | No, y no usa la red |
| RSSI de la red conectada | ~1 por segundo | Sí: solo se usa si el teléfono ya estuviera conectado |

Un **filtro de partículas** (500 posiciones posibles sobre los pasillos del grafo) avanza según el ritmo de pasos, se **detiene cuando la persona se detiene**, y cada escaneo Wi-Fi corrige la posición. El cursor no atraviesa paredes porque solo puede estar sobre los pasillos. En los cruces, los pasillos de la ruta elegida tienen preferencia.

### Todos los niveles y pisos (1, 3, 4, 5 y 6)

- **Pasillos de cada nivel:** nivel 1, 19 pasillos; nivel 3, 14; nivel 4, 11; nivel 5, 1; piso 6, 5. El cursor Wi-Fi se dibuja en el plano interactivo de cada uno.
- **Largos reales:** cada plano interactivo entrega a la app las coordenadas de sus puntos y el largo en metros de cada recorrido dibujado, según la escala del plano. Se usa para los tramos sin medida de terreno. Las medidas de terreno siempre tienen prioridad. Ejemplo: Ascensor central → Hall Central mide 9,91 m en el plano y 10,336 m en terreno (4 % de diferencia). Estos largos solo los usa el cursor Wi-Fi: **no** se muestran como medidas validadas en las indicaciones.
- **Cambio de piso automático:** cada escaneo se compara con el mapa de radio de todos los niveles. Si dos escaneos seguidos se explican claramente mejor con otro nivel, la app muestra ese plano y avisa «Wi-Fi: parece que estás en el nivel N». Necesita que ambos niveles tengan levantamiento.
- `acceso-costamar-nivel-4` aún no está ubicado en el plano del nivel 4: en ese tramo el cursor no se dibuja (igual que la ruta).

### Precisión

- **Brújula:** los planos no están orientados al norte. Mientras la persona camina en una posición confiable, la app aprende el giro de cada plano. Una vez calibrada (8 muestras coherentes), la brújula ayuda a elegir el pasillo correcto en los cruces y el sentido de avance. La calibración se guarda en el teléfono por nivel, solo si se hizo con brújula absoluta (norte magnético).
- **Largo de paso aprendido:** cada posición posible lleva su propio largo de paso (entre 0,85 y 1,15 veces el inicial), y el Wi-Fi conserva las que coinciden. Así el cursor se ajusta al paso de cada persona.
- **Levantamiento por pasos:** al recorrer un pasillo, cada lectura se ubica según los pasos dados, no por tiempo. Si quien hace el levantamiento se detiene o acelera, las muestras igual quedan en su lugar. Sin acelerómetro, se reparte por tiempo.
- 800 posiciones posibles en el filtro (antes 500).

Otras mejoras:

- **Antenas virtuales agrupadas:** `dc:9f:db:1c:ed:e3`, `ee:9f:…` y `fe:9f:…` cuentan como una sola radio.
- **Ajuste por teléfono:** se aprende automáticamente la diferencia en dB entre el teléfono del levantamiento y el del huésped.
- **Penalización de señales faltantes:** una señal fuerte en el mapa que no aparece resta puntos, y una que aparece sin estar en el mapa, también.
- **Bandas de 2,4, 5 y 6 GHz.**
- **Las huellas de WiFi Analyzer** se siguen usando como puntos de referencia.
- **Corrección del seguimiento por pasos:** si está activo, el Wi-Fi lo corrige cuando la diferencia supera 3 m (como máximo cada 8 s). Si hay pasos detectados, también se usan como pista de velocidad.
- **Confirmación de posición:** al confirmar la ubicación con QR o «Aquí estoy», el filtro se reinicia en ese punto.

## Resultados de la simulación (pruebas automáticas)

Pasillo en T de 70 m, 5 antenas, persona caminando a 1,2 m/s, teléfono distinto al del levantamiento (−6 dB), podómetro con un 12 % de error en el largo del paso, **sin conexión**, 20 repeticiones:

| Situación | Error mediano | Error p90 |
|---|---|---|
| Escaneo cada 30 s + pasos (largo de paso aprendido) | 1,5 m | 4,5 m |
| **Escaneo cada 30 s + pasos + brújula** | **1,1 m** | **3,1 m** |
| Igual, con una pausa de 10 s a mitad del pasillo | 2,0 m | 3,9 m |
| Igual, sin saber dónde empieza | 1,3 m | 6,9 m |
| Escaneo cada 3 s (limitación desactivada) + pasos + brújula | 0,8 m | 1,6 m |
| Solo escaneo cada 30 s, sin pasos (acelerómetro no disponible) | 7,2 m | 14 m |

**Conclusión:** sin conexión, con escaneos, pasos y brújula, el cursor sigue a la persona con alrededor de 1 m de error típico. El peor caso es empezar sin saber dónde está la persona: **confirmar el punto de partida con QR o «Aquí estoy»** mejora mucho los primeros metros. Estas cifras salen de una simulación; hay que confirmarlas caminando en el resort.

## Cómo usarlo

1. Genera la APK con `CREAR-APK-ANDROID.bat` (instala las dependencias, compila y sincroniza Android).
2. En el teléfono, deja el **Wi-Fi encendido** (sin conectarse a ninguna red) y activa la **ubicación**, que Android exige para leer las redes cercanas.
3. Debajo del plano, en **Navegación Wi-Fi en movimiento**, pulsa **Seguirme con Wi-Fi**.
4. Camina con el teléfono en la mano. El punto verde muestra la posición. Si está naranjo, la posición aún no está confirmada (poca confianza). El halo indica la incertidumbre en metros.
5. **Diagnóstico** muestra los pasos detectados, la frecuencia de escaneo, si hay RTT, las lecturas por minuto y el estado del mapa de radio.
6. Para empezar con más precisión, confirma tu ubicación con QR o «Aquí estoy»: el filtro se reinicia en ese punto.

## Levantamiento del mapa de radio (obligatorio para buena precisión)

Sin levantamiento, el filtro solo cuenta con las huellas de WiFi Analyzer en unos pocos puntos. Hay que recorrer los pasillos una vez:

1. Usa un teléfono del personal. Conviene desactivar *Opciones de desarrollador → Limitación de búsqueda de Wi-Fi*: así el levantamiento escanea cada 3 s en lugar de cada 30 s.
2. No hace falta conectarse a ninguna red.
3. Abre **Levantamiento del mapa de radio (personal)**, elige un **pasillo** y párate en uno de sus extremos.
4. Pulsa **«Estoy en X: empezar»**, camina a ritmo constante por el centro del pasillo y pulsa **«Llegué»** en el otro extremo.
5. Repite el pasillo en sentido contrario. Haz lo mismo con todos los pasillos de cada nivel. La lista muestra cuántas muestras tiene cada uno.
6. En los puntos importantes (Hall, ascensores, recepciones), usa **Capturar 20 s** mientras giras lentamente.
7. Pulsa **Exportar mapa de radio**: el contenido se copia al portapapeles (y en un navegador se descarga `mapa-radio.json`).
8. Reemplaza `src/assets/mapa-radio/mapa-radio.json` con ese contenido y genera la APK. Así **todos los huéspedes** reciben el mapa.

**Importar** sirve para juntar levantamientos de varios teléfonos.

Si cambian las antenas del resort (se mueven, se reemplazan o se agregan), hay que repetir el levantamiento de esa zona: **Borrar este pasillo** y volver a recorrerlo.

## Limitaciones honestas

- **Solo funciona en Android.** iOS no permite a las apps leer redes Wi-Fi.
- **El detector de pasos espera el teléfono en la mano o en un bolsillo al caminar.** Si se agita sin caminar, puede contar pasos de más; el siguiente escaneo lo corrige. El largo del paso es fijo (0,7 m) y el Wi-Fi compensa la diferencia.
- **Con la pantalla apagada, Android pausa la app**, así que la navegación se detiene.
- **El nivel (piso) no se detecta con Wi-Fi.** Se usa el nivel que se está viendo en el plano o el de la ruta.
- **Wi-Fi RTT** solo funciona si el teléfono **y** las antenas lo admiten. El diagnóstico muestra cuántas antenas compatibles hay a la vista; si son 0, se usa RSSI.
- **Tramos sin medir:** su largo se estima con la escala del dibujo, o con 8 m si el nivel no tiene ningún tramo medido.
- **El plugin nativo no se compiló en este equipo** porque no hay Java instalado. Las pruebas cubren el código web y el filtro. Hay que compilar la APK y probar caminando.

## Archivos

- `android/.../NavInsideWifiPlugin.java`: conexión, caché, escucha pasiva, RTT y capacidades. `scan` acepta `minIntervalMs` y `allowCached`.
- `AndroidManifest.xml`: permiso `NEARBY_WIFI_DEVICES` (necesario para RTT en Android 13+) y `wifi.rtt` opcional.
- `src/app/services/wifi-nativo.ts`: interfaz del plugin.
- `src/app/services/localizacion-wifi.ts`: grafo métrico, mapa de radio, verosimilitud, detector de pasos y filtro de partículas.
- `src/app/services/mapa-radio.service.ts`: muestras incluidas, locales y de huellas; exportar e importar.
- `src/app/services/navegacion-wifi.service.ts`: lecturas, filtro, levantamiento y corrección del seguimiento.
- `src/app/components/navegacion-wifi/`: panel en pantalla.
- `src/assets/mapas/navinside-map-bridge.js`: cursor Wi-Fi en los planos (mensaje `navinside-wifi-position`).
- `src/assets/mapa-radio/mapa-radio.json`: mapa de radio incluido en la app (vacío hasta el primer levantamiento).
