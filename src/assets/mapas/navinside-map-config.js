window.NAVINSIDE_MAPS = {
  1: {
    facing: {originId:"ascensor-central-nivel-1",towards:"hall"},
    nodes: {
      'ascensor-central-nivel-1':'asc','zona-kid-nivel-1':'mini','zona-play-nivel-1':'play',
      'mini-market-proa-nivel-1':'proa','zona-juego-adulto-nivel-1':'jue','hall-nivel-1':'hall',
      'salon-eventos-terramar-nivel-1':'terra','toallas-nivel-1':'toa','acceso-gimnasio-nivel-1':'toa',
      'gimnasio-nivel-1':'gym','alma-spa-nivel-1':'spa','salon-eventos-montemar-nivel-1':'mon',
      'ascensor-habitaciones-nivel-1':'ah','salon-eventos-altamar-nivel-1':'alta',
      'pasillo-los-faros-nivel-1':'ps0','banos-damas-nivel-1':'toa','banos-varones-nivel-1':'toa',
      'banos-juegos-adultos-nivel-1':'jue'
    },
    destinations: {
      asc:'ascensor-central-nivel-1',a1:'ascensor-central-nivel-1',a2:'ascensor-central-nivel-1',
      mini:'zona-kid-nivel-1',play:'zona-play-nivel-1',proa:'mini-market-proa-nivel-1',
      jue:'zona-juego-adulto-nivel-1',hall:'hall-nivel-1',terra:'salon-eventos-terramar-nivel-1',
      toa:'toallas-nivel-1',gym:'gimnasio-nivel-1',spa:'alma-spa-nivel-1',mon:'salon-eventos-montemar-nivel-1',
      ah:'ascensor-habitaciones-nivel-1',alta:'salon-eventos-altamar-nivel-1',ps0:'pasillo-los-faros-nivel-1'
    },
    references:['banos-damas-nivel-1','banos-varones-nivel-1','banos-juegos-adultos-nivel-1'],
    keepNames:['a1','a2']
  },
  3: {
    facing: {originId:"ascensor-central-nivel-3",towards:"pri"},
    nodes: {
      'ascensor-central-nivel-3':'asc','piscina-acceso-escalones-nivel-3':'pri',
      'piscina-acceso-accesible-nivel-3':'eap','piscina-temperada-nivel-3':'tem',
      'restaurant-faro-nivel-3':'far','acceso-faro-nivel-3':'fa','terraza-faro-nivel-3':'far',
      'tramo-accesible-nivel-3-asc1':'asc1','tramo-accesible-nivel-3-j1':'j1','tramo-accesible-nivel-3-ban':'ban','tramo-accesible-nivel-3-j2':'j2','tramo-accesible-nivel-3-vf':'vf','tramo-accesible-nivel-3-fa':'fa','tramo-accesible-nivel-3-pp':'pp','tramo-accesible-nivel-3-eat':'eat','tramo-accesible-nivel-3-pri':'pri','tramo-accesible-nivel-3-pc':'pc','tramo-accesible-nivel-3-ec':'ec','tramo-accesible-nivel-3-hall':'hall','tramo-accesible-nivel-3-k0':'k0','tramo-accesible-nivel-3-k1':'k1','tramo-accesible-nivel-3-k2':'k2',
      'canchas-tenis-nivel-3':'ten1','piscina-tobogan-nivel-3':'ext','jacuzzi-nivel-3':'jac',
      'mirador-nivel-3':'mir','banos-camarines-nivel-3':'ban','ascensor-habitaciones-nivel-3':'mir',
      'acceso-escalera-izquierda-nivel-3':'asc','acceso-escalera-derecha-nivel-3':'asc'
    },
    destinations: {
      asc:'ascensor-central-nivel-3',asc1:'ascensor-central-nivel-3',asc2:'ascensor-central-nivel-3',
      pri:'piscina-acceso-escalones-nivel-3',tem:'piscina-temperada-nivel-3',far:'restaurant-faro-nivel-3',
      fa:'acceso-faro-nivel-3',ten1:'canchas-tenis-nivel-3',ext:'piscina-tobogan-nivel-3',
      jac:'jacuzzi-nivel-3',mir:'mirador-nivel-3',ban:'banos-camarines-nivel-3'
    },
    references:['terraza-faro-nivel-3','ascensor-habitaciones-nivel-3','canchas-tenis-nivel-3',
      'acceso-escalera-izquierda-nivel-3','acceso-escalera-derecha-nivel-3'],
    keepNames:['asc1','asc2','pri','ten1','ten2']
  },
  4: {
    facing: {originId:'ascensor-central-nivel-4',towards:'h2'},
    nodes: {
      'entrada-nivel-4':'pentrada','lobby-nivel-4':'h2',
      'recepcion-resort-nivel-4':'precH','recepcion-turismo-vina-nivel-4':'precT',
      'ascensor-central-nivel-4':'h3','pasillo-habitaciones-nivel-4':'s0',
      'puerta-exterior-izquierda-nivel-4':'h3c','puerta-exterior-derecha-nivel-4':'h3d'
    },
    destinations: {
      pentrada:'entrada-nivel-4',h2:'lobby-nivel-4',precH:'recepcion-resort-nivel-4',
      precT:'recepcion-turismo-vina-nivel-4',h3:'ascensor-central-nivel-4',
      pascA:'ascensor-central-nivel-4',pascB:'ascensor-central-nivel-4',
      s0:'pasillo-habitaciones-nivel-4',pescI:'puerta-exterior-izquierda-nivel-4',pescD:'puerta-exterior-derecha-nivel-4'
    },
    references:['ascensor-central-nivel-4','puerta-exterior-izquierda-nivel-4','puerta-exterior-derecha-nivel-4'],
    keepNames:['pascA','pascB','pescI','pescD']
  },
  5: {
    facing:{originId:'ascensor-central-nivel-5',towards:'e1d'},
    nodes:{'ascensor-central-nivel-5':'e1','salon-costamar-nivel-5':'sal'},
    destinations:{e1:'ascensor-central-nivel-5',e2:'ascensor-central-nivel-5',sal:'salon-costamar-nivel-5'},
    references:['ascensor-central-nivel-5'],keepNames:['e1','e2']
  },
  6: {
    facing:{originId:'ascensor-habitaciones-piso-6',towards:'c3'},
    nodes:{'ascensor-habitaciones-piso-6':'ah','puerta-acceso-tinajas-piso-6':'pta',
      'tinajas-piso-6':'spa','alma-spa-tinaja-piso-6':'spa','sauna-piso-6':'spa'},
    destinations:{ah:'ascensor-habitaciones-piso-6',pta:'puerta-acceso-tinajas-piso-6',spa:'tinajas-piso-6'},
    references:['tinajas-piso-6','alma-spa-tinaja-piso-6','sauna-piso-6'],keepNames:['spa']
  }
};
