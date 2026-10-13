import { Injectable } from '@angular/core';



export type Idioma =

  | 'es'

  | 'en'

  | 'pt';



const IDIOMA_PREDETERMINADO: Idioma = 'es';



const CLAVE_ALMACENAMIENTO =

  'navinside-idioma';



const TRADUCCIONES: Record<

  Idioma,

  Record<string, string>

> = {

  es: {

    idioma: 'Idioma',

    espanol: 'Español',

    ingles: 'Inglés',

    portugues: 'Portugués',

    menu: 'Menú',

    puntosInteres: 'Puntos de interés',

    puntoInteres: 'Punto de interés',

    explorarResort: 'Explora el resort',

    planificarRuta: 'Planifica tu recorrido',

    navegacionInterior: 'Navegación interior',

    mapaDelResort: 'Mapa del resort',



    tituloAplicacion: 'NavInside',

    tituloPagina: 'Navegación interior',

    instrucciones:

      'Selecciona tu punto de origen y destino.',



    origen: 'Origen',

    seleccionarOrigen:

      'Seleccionar origen',

    destino: 'Destino',

    seleccionarDestino:

      'Seleccionar destino',

    seleccionarOrigenPorVoz: 'Seleccionar origen por voz',

    seleccionarDestinoPorVoz: 'Seleccionar destino por voz',

    hablarOrigen: 'Decir origen',

    hablarDestino: 'Decir destino',

    preguntaOrigenVoz: '¿Dónde te encuentras?',

    preguntaDestinoVoz: '¿A dónde quieres ir?',

    escuchandoOrigenVoz: 'Te escucho. Di dónde te encuentras.',

    escuchandoDestinoVoz: 'Te escucho. Di a dónde quieres ir.',

    lugarVozNoReconocido: 'No reconocí ese lugar. Inténtalo nuevamente.',

    origenVozSeleccionado: 'Origen seleccionado: {nombre}.',

    destinoVozSeleccionado: 'Destino seleccionado: {nombre}.',



    rutaAccesible: 'Ruta accesible',

    descripcionRutaAccesible:

      'Evita escaleras y utiliza conexiones aptas.',



    leerQr: 'Leer QR con cámara',

    simularQr: 'Simular lectura QR',

    calcularRuta: 'Calcular ruta',

    pedirRutaPorVoz: 'Pedir ruta por voz',

    detenerComandoVoz: 'Dejar de escuchar',

    ejemploComandoVoz: 'Pulsa el micrófono y di: «desde ascensor principal hasta gimnasio».',

    escuchandoComandoRuta: 'Te escucho. Indica origen y destino.',

    reconocimientoVozNoDisponible: 'Abre NavInside en Chrome o Edge desde localhost o HTTPS y permite el micrófono para pedir la ruta por voz.',

    errorIniciarMicrofono: 'No se pudo iniciar el micrófono. Revisa el permiso del sitio, que el micrófono esté conectado y vuelve a intentarlo.',

    formatoComandoVoz: 'No identifiqué ambos lugares. Di «desde [origen] hasta [destino]».',

    comandoVozDetectado: 'Ruta solicitada: {origen} hasta {destino}.',

    comandoVozSinResultado: 'No se detectó voz. Pulsa el micrófono e inténtalo otra vez.',

    comandoVozCancelado: 'Escucha cancelada.',

    permisoMicrofonoDenegado: 'No hay permiso de micrófono. Habilítalo en los ajustes del navegador.',

    errorReconocimientoVoz: 'No se pudo reconocer el comando. Comprueba la conexión y vuelve a intentarlo.',

    fotoDestinoSeleccionado: 'Destino seleccionado',

    fotoDestinoLlegada: 'Has llegado al destino',



    estadoUbicacion:

      'Estado de ubicación',

    resultadoRuta:

      'Resultado de la ruta',

    tipoRuta: 'Tipo de ruta',

    rutaNormal: 'Normal',

    rutaAccesibleSinEscaleras:

      'Accesible, sin escaleras',

    distanciaSimulada:

      'Distancia medida',

    distanciaTotal: 'Distancia total',

    distanciaRestante: 'Restante',

    proximoTramo: 'Próximo tramo',

    unidades: 'm',



    mapaPreliminar:

      'Mapa navegable preliminar',

    nivel: 'Nivel',

    seleccionarNivelMapa: 'Seleccionar nivel del mapa',

    datosSimulados:

      'Mediciones de referencia',

    mapaAria:

      'Grafo navegable del nivel {nivel}',

    mapaSinDatos:

      'No existen nodos disponibles para el nivel {nivel}.',

    nodo: 'Nodo',

    rutaCalculada:

      'Ruta calculada',

    ubicacionActual:

      'Ubicación actual',



    guiaFisicaNivelUno:

      'Orientación física · Nivel 1',

    desdeAscensoresPrincipales:

      'Desde los dos ascensores principales',

    desdeHall: 'Desde el hall',

    izquierda: 'Izquierda',

    derecha: 'Derecha',

    rutaAscensoresIzquierda:

      'Mini Club Kids → Zona Play → Minimarket Proa → Hall',

    rutaAscensoresDerecha:

      'Zona de juegos de adultos + baños; acceso por escaleras',

    rutaHallDerecha:

      'Salón TerraMar → Entrega de toallas + baños de damas y varones → escaleras de acceso al Gimnasio → Gimnasio → Alma Spa → Salón MonteMar → Ascensores de habitaciones',

    rutaHallIzquierda:

      'Salón Altamar → Escaleras de emergencia',

    notaAccesoEscaleras:

      'Ubicaciones corroboradas en terreno. Las escaleras forman parte del acceso al Gimnasio y a Juegos Adultos.',



    guiaRuta: 'Guía paso a paso',

    paso: 'Paso',

    sigueHacia: 'Sigue hacia',

    llegada: 'Llegaste a',

    ahora: 'Ahora',

    continuaAproximadamente: 'Continúa aproximadamente {metros} metros hacia {nombre}.',

    luegoContinuaAproximadamente: 'Luego, continúa aproximadamente {metros} metros hacia {nombre}.',

    avanzaAproximadamente: 'Continúa aproximadamente {metros} metros.',

    giraDerechaHacia:

      'Desde el ascensor principal, gira a la derecha hacia {nombre}.',

    giraIzquierdaHacia:

      'Desde el ascensor principal, gira a la izquierda hacia {nombre}.',

    desdeHallDerechaHacia:

      'Desde el Hall, gira a la derecha hacia {nombre}.',

    continuaRectoHacia:

      'Continúa recto por la misma línea hacia {nombre}.',

    accesoGimnasioEscaleras:

      'Para entrar al Gimnasio, pasa por entrega de toallas y baños; accede por las escaleras.',

    accesoJuegosAdultosEscaleras:

      'La Zona de Juegos de Adultos queda a la derecha del ascensor principal; accede por las escaleras. Hay baños junto a la zona.',

    activarAsistenteVoz: 'Activar asistente de voz',

    silenciarAsistenteVoz: 'Silenciar asistente de voz',

    repetirIndicacionVoz: 'Repetir indicación',

    asistenteVozActivo: 'Asistente de voz activo',

    asistenteVozListo: 'Asistente de voz listo',

    asistenteVozNoDisponible:

      'Este dispositivo no tiene lectura por voz disponible.',

    iniciarCursor: 'Iniciar cursor',

    pausarCursor: 'Pausar cursor',

    cursorDemostracion:

      'El avance automático del cursor es demostrativo; la ubicación en vivo requiere posicionamiento QR/sensores.',

    cursorRecorrido: 'Cursor Hippocampus',

    pasoDe:

      'Paso {actual} de {total}',

    progresoRuta:

      'Progreso del recorrido',

    pasoAnterior: 'Anterior',

    pasoSiguiente: 'Siguiente',

    reiniciarRuta: 'Reiniciar',



    inicioRuta:

      'Comienza en {nombre}.',

    continuarHacia:

      'Continúa hacia {nombre}.',

    subirAscensor:

      'Utiliza el ascensor para subir al nivel {nivel}.',

    bajarAscensor:

      'Utiliza el ascensor para bajar al nivel {nivel}.',

    subirEscalera:

      'Utiliza la escalera para subir al nivel {nivel}.',

    bajarEscalera:

      'Utiliza la escalera para bajar al nivel {nivel}.',

    subirRampa:

      'Utiliza la rampa para subir al nivel {nivel}.',

    bajarRampa:

      'Utiliza la rampa para bajar al nivel {nivel}.',

    cambiarNivelSubir:

      'Sube al nivel {nivel} y continúa hacia {nombre}.',

    cambiarNivelBajar:

      'Baja al nivel {nivel} y continúa hacia {nombre}.',

    llegadaRuta:

      'Has llegado a {nombre}.',



    apuntarCamara:

      'Apunta la cámara al código QR',

    escanear: 'Escanear',



    lecturaCancelada:

      'La lectura fue cancelada o no se detectó un código QR.',

    errorCamara:

      'No fue posible abrir o utilizar la cámara.',

    qrInvalido:

      'El código QR no pertenece a NavInside o la ubicación no existe.',

    ubicacionDetectada:

      'Ubicación detectada: {nombre}',

    rutaRecalculada:

      'Ubicación detectada: {nombre}. La ruta fue recalculada.',

    destinoAlcanzadoQr:

      'Ubicación detectada: {nombre}. Has llegado a tu destino.',



    seleccionarOrigenDestino:

      'Debes seleccionar un origen y un destino.',

    origenDestinoIguales:

      'El origen y el destino deben ser diferentes.',

    lugaresNoEncontrados:

      'No se encontraron los lugares seleccionados.',

    rutaNoDisponible:

      'No existe una ruta disponible.',

    rutaAccesibleNoDisponible:

      'No existe una ruta accesible disponible.'

  },



  en: {

    idioma: 'Language',

    espanol: 'Spanish',

    ingles: 'English',

    portugues: 'Portuguese',

    menu: 'Menu',

    puntosInteres: 'Points of interest',

    puntoInteres: 'Point of interest',

    explorarResort: 'Explore the resort',

    planificarRuta: 'Plan your route',

    navegacionInterior: 'Indoor navigation',

    mapaDelResort: 'Resort map',



    tituloAplicacion: 'NavInside',

    tituloPagina: 'Indoor navigation',

    instrucciones:

      'Select your starting point and destination.',



    origen: 'Starting point',

    seleccionarOrigen:

      'Select starting point',

    destino: 'Destination',

    seleccionarDestino:

      'Select destination',

    seleccionarOrigenPorVoz: 'Select starting point by voice',

    seleccionarDestinoPorVoz: 'Select destination by voice',

    hablarOrigen: 'Say starting point',

    hablarDestino: 'Say destination',

    preguntaOrigenVoz: 'Where are you?',

    preguntaDestinoVoz: 'Where do you want to go?',

    escuchandoOrigenVoz: 'Listening. Say where you are.',

    escuchandoDestinoVoz: 'Listening. Say where you want to go.',

    lugarVozNoReconocido: 'I did not recognize that place. Please try again.',

    origenVozSeleccionado: 'Starting point selected: {nombre}.',

    destinoVozSeleccionado: 'Destination selected: {nombre}.',



    rutaAccesible: 'Accessible route',

    descripcionRutaAccesible:

      'Avoids stairs and uses accessible connections.',



    leerQr: 'Scan QR with camera',

    simularQr: 'Simulate QR scan',

    calcularRuta: 'Calculate route',

    pedirRutaPorVoz: 'Request route by voice',

    detenerComandoVoz: 'Stop listening',

    ejemploComandoVoz: 'Tap the microphone and say: “from main elevator to gym”.',

    escuchandoComandoRuta: 'Listening. Say the starting point and destination.',

    reconocimientoVozNoDisponible: 'Open NavInside in Chrome or Edge on localhost or HTTPS and allow microphone access to request a route by voice.',

    errorIniciarMicrofono: 'Could not start the microphone. Check site permission, confirm the microphone is connected, and try again.',

    formatoComandoVoz: 'I could not identify both places. Say “from [start] to [destination]”.',

    comandoVozDetectado: 'Route requested: {origen} to {destino}.',

    comandoVozSinResultado: 'No speech was detected. Tap the microphone and try again.',

    comandoVozCancelado: 'Listening cancelled.',

    permisoMicrofonoDenegado: 'Microphone permission is off. Enable it in your browser settings.',

    errorReconocimientoVoz: 'The command was not recognized. Check your connection and try again.',

    fotoDestinoSeleccionado: 'Selected destination',

    fotoDestinoLlegada: 'You have arrived',



    estadoUbicacion:

      'Location status',

    resultadoRuta:

      'Route result',

    tipoRuta: 'Route type',

    rutaNormal: 'Normal',

    rutaAccesibleSinEscaleras:

      'Accessible, without stairs',

    distanciaSimulada:

      'Measured distance',

    distanciaTotal: 'Total distance',

    distanciaRestante: 'Remaining',

    proximoTramo: 'Next segment',

    unidades: 'm',



    mapaPreliminar:

      'Preliminary navigation map',

    nivel: 'Level',

    seleccionarNivelMapa: 'Select map level',

    datosSimulados:

      'Reference measurements',

    mapaAria:

      'Navigable graph for level {nivel}',

    mapaSinDatos:

      'No nodes are available for level {nivel}.',

    nodo: 'Node',

    rutaCalculada:

      'Calculated route',

    ubicacionActual:

      'Current location',



    guiaFisicaNivelUno:

      'Physical directions · Level 1',

    desdeAscensoresPrincipales:

      'From the two main elevators',

    desdeHall: 'From the hall',

    izquierda: 'Left',

    derecha: 'Right',

    rutaAscensoresIzquierda:

      'Mini Club Kids → Play Area → Minimarket Proa → Hall',

    rutaAscensoresDerecha:

      'Adult Games Area + restrooms; stair access',

    rutaHallDerecha:

      'TerraMar Lounge → Towel desk + women’s and men’s restrooms → stairs to the Gym → Gym → Alma Spa → MonteMar Lounge → Guest elevators',

    rutaHallIzquierda:

      'Altamar Lounge → Emergency stairs',

    notaAccesoEscaleras:

      'Locations confirmed on site. Stairs are part of the access to the Gym and Adult Games Area.',



    guiaRuta: 'Step-by-step guidance',

    paso: 'Step',

    sigueHacia: 'Continue to',

    llegada: 'You have arrived at',

    ahora: 'Now',

    continuaAproximadamente: 'Continue approximately {metros} meters towards {nombre}.',

    luegoContinuaAproximadamente: 'Then, continue approximately {metros} meters towards {nombre}.',

    avanzaAproximadamente: 'Continue for approximately {metros} meters.',

    giraDerechaHacia:

      'From the main elevator, turn right towards {nombre}.',

    giraIzquierdaHacia:

      'From the main elevator, turn left towards {nombre}.',

    desdeHallDerechaHacia:

      'From the Hall, turn right towards {nombre}.',

    continuaRectoHacia:

      'Continue straight along the same corridor towards {nombre}.',

    accesoGimnasioEscaleras:

      'To enter the Gym, go by the towel desk and restrooms; use the stairs.',

    accesoJuegosAdultosEscaleras:

      'The Adult Games Area is to the right of the main elevator; use the stairs to access it. Restrooms are nearby.',

    activarAsistenteVoz: 'Enable voice assistant',

    silenciarAsistenteVoz: 'Mute voice assistant',

    repetirIndicacionVoz: 'Repeat instruction',

    asistenteVozActivo: 'Voice assistant on',

    asistenteVozListo: 'Voice assistant ready',

    asistenteVozNoDisponible:

      'Voice guidance is not available on this device.',

    iniciarCursor: 'Start cursor',

    pausarCursor: 'Pause cursor',

    cursorDemostracion:

      'Automatic cursor movement is a demo; live location requires QR/sensor positioning.',

    cursorRecorrido: 'Hippocampus cursor',

    pasoDe:

      'Step {actual} of {total}',

    progresoRuta:

      'Route progress',

    pasoAnterior: 'Previous',

    pasoSiguiente: 'Next',

    reiniciarRuta: 'Restart',



    inicioRuta:

      'Start at {nombre}.',

    continuarHacia:

      'Continue towards {nombre}.',

    subirAscensor:

      'Use the elevator to go up to level {nivel}.',

    bajarAscensor:

      'Use the elevator to go down to level {nivel}.',

    subirEscalera:

      'Use the stairs to go up to level {nivel}.',

    bajarEscalera:

      'Use the stairs to go down to level {nivel}.',

    subirRampa:

      'Use the ramp to go up to level {nivel}.',

    bajarRampa:

      'Use the ramp to go down to level {nivel}.',

    cambiarNivelSubir:

      'Go up to level {nivel} and continue towards {nombre}.',

    cambiarNivelBajar:

      'Go down to level {nivel} and continue towards {nombre}.',

    llegadaRuta:

      'You have arrived at {nombre}.',



    apuntarCamara:

      'Point the camera at the QR code',

    escanear: 'Scan',



    lecturaCancelada:

      'The scan was cancelled or no QR code was detected.',

    errorCamara:

      'The camera could not be opened or used.',

    qrInvalido:

      'The QR code does not belong to NavInside or the location does not exist.',

    ubicacionDetectada:

      'Location detected: {nombre}',

    rutaRecalculada:

      'Location detected: {nombre}. The route was recalculated.',

    destinoAlcanzadoQr:

      'Location detected: {nombre}. You have reached your destination.',



    seleccionarOrigenDestino:

      'You must select a starting point and a destination.',

    origenDestinoIguales:

      'The starting point and destination must be different.',

    lugaresNoEncontrados:

      'The selected locations could not be found.',

    rutaNoDisponible:

      'No route is available.',

    rutaAccesibleNoDisponible:

      'No accessible route is available.'

  },



  pt: {

    idioma: 'Idioma',

    espanol: 'Espanhol',

    ingles: 'Inglês',

    portugues: 'Português',

    menu: 'Menu',

    puntosInteres: 'Pontos de interesse',

    puntoInteres: 'Ponto de interesse',

    explorarResort: 'Explore o resort',

    planificarRuta: 'Planeje seu trajeto',

    navegacionInterior: 'Navegação interna',

    mapaDelResort: 'Mapa do resort',



    tituloAplicacion: 'NavInside',

    tituloPagina: 'Navegação interna',

    instrucciones:

      'Selecione o ponto de origem e o destino.',



    origen: 'Origem',

    seleccionarOrigen:

      'Selecionar origem',

    destino: 'Destino',

    seleccionarDestino:

      'Selecionar destino',

    seleccionarOrigenPorVoz: 'Selecionar origem por voz',

    seleccionarDestinoPorVoz: 'Selecionar destino por voz',

    hablarOrigen: 'Dizer origem',

    hablarDestino: 'Dizer destino',

    preguntaOrigenVoz: 'Onde você está?',

    preguntaDestinoVoz: 'Aonde você quer ir?',

    escuchandoOrigenVoz: 'Estou ouvindo. Diga onde você está.',

    escuchandoDestinoVoz: 'Estou ouvindo. Diga aonde você quer ir.',

    lugarVozNoReconocido: 'Não reconheci esse local. Tente novamente.',

    origenVozSeleccionado: 'Origem selecionada: {nombre}.',

    destinoVozSeleccionado: 'Destino selecionado: {nombre}.',



    rutaAccesible: 'Rota acessível',

    descripcionRutaAccesible:

      'Evita escadas e utiliza conexões acessíveis.',



    leerQr: 'Ler QR com a câmera',

    simularQr: 'Simular leitura de QR',

    calcularRuta: 'Calcular rota',

    pedirRutaPorVoz: 'Solicitar rota por voz',

    detenerComandoVoz: 'Parar de ouvir',

    ejemploComandoVoz: 'Toque no microfone e diga: “de elevador principal até academia”.',

    escuchandoComandoRuta: 'Estou ouvindo. Diga a origem e o destino.',

    reconocimientoVozNoDisponible: 'Abra o NavInside no Chrome ou Edge em localhost ou HTTPS e permita o microfone para solicitar a rota por voz.',

    errorIniciarMicrofono: 'Não foi possível iniciar o microfone. Verifique a permissão do site, confirme se o microfone está conectado e tente novamente.',

    formatoComandoVoz: 'Não identifiquei os dois locais. Diga “de [origem] até [destino]”.',

    comandoVozDetectado: 'Rota solicitada: {origen} até {destino}.',

    comandoVozSinResultado: 'Nenhuma voz foi detectada. Toque no microfone e tente novamente.',

    comandoVozCancelado: 'Escuta cancelada.',

    permisoMicrofonoDenegado: 'Sem permissão para usar o microfone. Ative-a nas configurações do navegador.',

    errorReconocimientoVoz: 'Não foi possível reconhecer o comando. Verifique a conexão e tente novamente.',

    fotoDestinoSeleccionado: 'Destino selecionado',

    fotoDestinoLlegada: 'Você chegou ao destino',



    estadoUbicacion:

      'Estado da localização',

    resultadoRuta:

      'Resultado da rota',

    tipoRuta: 'Tipo de rota',

    rutaNormal: 'Normal',

    rutaAccesibleSinEscaleras:

      'Acessível, sem escadas',

    distanciaSimulada:

      'Distância medida',

    distanciaTotal: 'Distância total',

    distanciaRestante: 'Restante',

    proximoTramo: 'Próximo trecho',

    unidades: 'm',



    mapaPreliminar:

      'Mapa de navegação preliminar',

    nivel: 'Nível',

    seleccionarNivelMapa: 'Selecionar nível do mapa',

    datosSimulados:

      'Medições de referência',

    mapaAria:

      'Grafo navegável do nível {nivel}',

    mapaSinDatos:

      'Não há nós disponíveis para o nível {nivel}.',

    nodo: 'Nó',

    rutaCalculada:

      'Rota calculada',

    ubicacionActual:

      'Localização atual',



    guiaFisicaNivelUno:

      'Orientação física · Nível 1',

    desdeAscensoresPrincipales:

      'Dos dois elevadores principais',

    desdeHall: 'Do hall',

    izquierda: 'Esquerda',

    derecha: 'Direita',

    rutaAscensoresIzquierda:

      'Mini Club Kids → Zona Play → Minimarket Proa → Hall',

    rutaAscensoresDerecha:

      'Área de jogos para adultos + banheiros; acesso por escadas',

    rutaHallDerecha:

      'Salão TerraMar → Entrega de toalhas + banheiros feminino e masculino → escadas de acesso à Academia → Academia → Alma Spa → Salão MonteMar → Elevadores dos quartos',

    rutaHallIzquierda:

      'Salão Altamar → Escadas de emergência',

    notaAccesoEscaleras:

      'Localizações corroboradas no local. As escadas fazem parte do acesso à Academia e à Área de Jogos para Adultos.',



    guiaRuta: 'Guia passo a passo',

    paso: 'Passo',

    sigueHacia: 'Siga para',

    llegada: 'Você chegou a',

    ahora: 'Agora',

    continuaAproximadamente: 'Continue por aproximadamente {metros} metros até {nombre}.',

    luegoContinuaAproximadamente: 'Depois, continue por aproximadamente {metros} metros até {nombre}.',

    avanzaAproximadamente: 'Continue por aproximadamente {metros} metros.',

    giraDerechaHacia:

      'No elevador principal, vire à direita para {nombre}.',

    giraIzquierdaHacia:

      'No elevador principal, vire à esquerda para {nombre}.',

    desdeHallDerechaHacia:

      'No Hall, vire à direita para {nombre}.',

    continuaRectoHacia:

      'Siga em frente pelo mesmo corredor até {nombre}.',

    accesoGimnasioEscaleras:

      'Para entrar na Academia, passe pela entrega de toalhas e banheiros; use as escadas.',

    accesoJuegosAdultosEscaleras:

      'A Área de Jogos para Adultos fica à direita do elevador principal; acesse pelas escadas. Há banheiros ao lado.',

    activarAsistenteVoz: 'Ativar assistente de voz',

    silenciarAsistenteVoz: 'Silenciar assistente de voz',

    repetirIndicacionVoz: 'Repetir indicação',

    asistenteVozActivo: 'Assistente de voz ativo',

    asistenteVozListo: 'Assistente de voz pronto',

    asistenteVozNoDisponible:

      'Este dispositivo não oferece leitura por voz.',

    iniciarCursor: 'Iniciar cursor',

    pausarCursor: 'Pausar cursor',

    cursorDemostracion:

      'O movimento automático do cursor é demonstrativo; a localização ao vivo requer posicionamento por QR/sensores.',

    cursorRecorrido: 'Cursor Hippocampus',

    pasoDe:

      'Passo {actual} de {total}',

    progresoRuta:

      'Progresso da rota',

    pasoAnterior: 'Anterior',

    pasoSiguiente: 'Próximo',

    reiniciarRuta: 'Reiniciar',



    inicioRuta:

      'Comece em {nombre}.',

    continuarHacia:

      'Continue até {nombre}.',

    subirAscensor:

      'Use o elevador para subir ao nível {nivel}.',

    bajarAscensor:

      'Use o elevador para descer ao nível {nivel}.',

    subirEscalera:

      'Use a escada para subir ao nível {nivel}.',

    bajarEscalera:

      'Use a escada para descer ao nível {nivel}.',

    subirRampa:

      'Use a rampa para subir ao nível {nivel}.',

    bajarRampa:

      'Use a rampa para descer ao nível {nivel}.',

    cambiarNivelSubir:

      'Suba ao nível {nivel} e continue até {nombre}.',

    cambiarNivelBajar:

      'Desça ao nível {nivel} e continue até {nombre}.',

    llegadaRuta:

      'Você chegou a {nombre}.',



    apuntarCamara:

      'Aponte a câmera para o código QR',

    escanear: 'Escanear',



    lecturaCancelada:

      'A leitura foi cancelada ou nenhum código QR foi detectado.',

    errorCamara:

      'Não foi possível abrir ou utilizar a câmera.',

    qrInvalido:

      'O código QR não pertence ao NavInside ou a localização não existe.',

    ubicacionDetectada:

      'Localização detectada: {nombre}',

    rutaRecalculada:

      'Localização detectada: {nombre}. A rota foi recalculada.',

    destinoAlcanzadoQr:

      'Localização detectada: {nombre}. Você chegou ao seu destino.',



    seleccionarOrigenDestino:

      'Selecione uma origem e um destino.',

    origenDestinoIguales:

      'A origem e o destino devem ser diferentes.',

    lugaresNoEncontrados:

      'Os locais selecionados não foram encontrados.',

    rutaNoDisponible:

      'Não existe uma rota disponível.',

    rutaAccesibleNoDisponible:

      'Não existe uma rota acessível disponível.'

  }

};



@Injectable({

  providedIn: 'root'

})

export class IdiomaService {

  idiomaActual: Idioma;



  constructor() {

    this.idiomaActual =

      this.obtenerIdiomaInicial();

  }



  establecerIdioma(

    idioma: Idioma

  ): void {

    this.idiomaActual = idioma;



    if (

      typeof localStorage !==

      'undefined'

    ) {

      localStorage.setItem(

        CLAVE_ALMACENAMIENTO,

        idioma

      );

    }

  }



  traducir(

    clave: string,

    parametros: Record<

      string,

      string | number

    > = {}

  ): string {

    let texto =

      TRADUCCIONES[this.idiomaActual][

        clave

      ] ??

      TRADUCCIONES[

        IDIOMA_PREDETERMINADO

      ][clave] ??

      clave;



    for (

      const [nombre, valor] of

        Object.entries(parametros)

    ) {

      texto = texto.replaceAll(

        `{${nombre}}`,

        String(valor)

      );

    }



    return texto;

  }



  private obtenerIdiomaInicial(): Idioma {

    const idiomaGuardado =

      this.obtenerIdiomaGuardado();



    if (idiomaGuardado) {

      return idiomaGuardado;

    }



    if (typeof navigator === 'undefined') {

      return IDIOMA_PREDETERMINADO;

    }



    const codigoIdioma =

      navigator.language

        .toLowerCase()

        .split('-')[0];



    if (

      codigoIdioma === 'en' ||

      codigoIdioma === 'pt'

    ) {

      return codigoIdioma;

    }



    return IDIOMA_PREDETERMINADO;

  }



  private obtenerIdiomaGuardado():

    Idioma | null {

    if (

      typeof localStorage ===

      'undefined'

    ) {

      return null;

    }



    const idioma =

      localStorage.getItem(

        CLAVE_ALMACENAMIENTO

      );



    if (

      idioma === 'es' ||

      idioma === 'en' ||

      idioma === 'pt'

    ) {

      return idioma;

    }



    return null;

  }

}
