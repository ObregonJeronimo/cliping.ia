"""
mock_director.py — DIRECTOR FALSO determinista que IMITA al LLM (sin tocar la API de Claude).

Para que? Para testear TODO el pipeline (director -> motor -> render) y verificar que los videos salen
UNICOS, sin gastar tokens. Toma una marca (nombre + rubro + datos opcionales) y compone un timeline
COMPLETO y variado: estructura distinta por marca, hero con animacion compleja (morph + particulas),
copy templado por rubro (no generico-vacio), y todo anclado al preset de style_engine (paleta/formas/
ritmo/semilla). Mismo contrato de salida que el director real -> el motor lo renderiza igual.

NO pretende escribir copy tan bueno como el LLM; pretende producir timelines REALISTAS y DIVERSOS para
poder renderizar, mirar y autocorregir el motor. Tambien sirve de fallback offline del backend.
"""
from __future__ import annotations
import json
import random
import style_engine as se

def _lighten(hex_str, amt):
    h = (hex_str or "").lstrip("#")
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        return hex_str
    r = int(r + (255 - r) * amt); g = int(g + (255 - g) * amt); b = int(b + (255 - b) * amt)
    return f"#{r:02x}{g:02x}{b:02x}"


# Energia del rubro -> "dureza" de la forma firma. Energicos: forma nitida, casi sin aclarar (borde duro =
# caracter), sin motion-blur. Serenos: mas aclarada y difusa (niebla suave). Asi la SATURACION/DUREZA del
# trazo tambien lleva el alma del rubro, no solo el hue (Forja agresivo != Aura suave aunque compartan layout).
_ENERGETIC = {"fitness", "moda", "tech", "gastronomia"}
_SERENE = {"salud", "belleza", "inmobiliaria", "finanzas"}

def _darken(hex_str, amt):
    h = (hex_str or "").lstrip("#")
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        return hex_str
    r = int(r * (1 - amt)); g = int(g * (1 - amt)); b = int(b * (1 - amt))
    return f"#{r:02x}{g:02x}{b:02x}"


def _shape_paint(accent, rubro, tone="dark"):
    """(color_de_la_forma, blur) segun energia del rubro y TONO del fondo."""
    if tone == "light":
        # fondo claro: la forma debe ser saturada/oscura para contrastar (nada de aclararla)
        return _darken(accent, 0.14), (rubro in _SERENE)
    if rubro in _ENERGETIC:
        return _lighten(accent, 0.24), False   # nitida y mas clara -> separa de un fondo del mismo hue (Forja rojo/rojo)
    if rubro in _SERENE:
        return _lighten(accent, 0.42), True    # tenue y difusa
    return _lighten(accent, 0.30), True

# FX del hero por rubro: cantidad/tamano/velocidad de particulas y orbitas -> el MOVIMIENTO tambien distingue
# marcas (fitness = enjambre rapido y denso; belleza = pocas y lentas; tech = regulares y veloces).
RUBRO_FX = {
    "fitness":      dict(pc=24, ps=1.7,  osp=1.25, od=4, dr=4),
    "tech":         dict(pc=18, ps=1.45, osp=1.15, od=4, dr=3),
    "moda":         dict(pc=14, ps=1.6,  osp=1.0,  od=3, dr=5),
    "gastronomia":  dict(pc=15, ps=1.5,  osp=0.85, od=3, dr=5),
    "salud":        dict(pc=10, ps=1.35, osp=0.7,  od=3, dr=6),
    "belleza":      dict(pc=8,  ps=1.5,  osp=0.6,  od=3, dr=6),
    "inmobiliaria": dict(pc=10, ps=1.3,  osp=0.8,  od=3, dr=5),
    "educacion":    dict(pc=14, ps=1.5,  osp=0.95, od=3, dr=5),
    "finanzas":     dict(pc=12, ps=1.3,  osp=0.9,  od=4, dr=4),
    "default":      dict(pc=12, ps=1.5,  osp=0.85, od=3, dr=5),
}


# ESTILO por rubro: forma FIRMA distinta (1er morph, no se repite entre rubros -> identidad), + estilo de
# marcador del checklist (check/number/bar/dash) y de CTA (pill/chip) -> rompe el molde compartido.
# Las formas estan en el vocabulario REAL del motor (engineCore _SCENE_FORMS) para que siempre renderice.
RUBRO_STYLE = {
    "gastronomia": {"forms": ["leaf", "drop", "blob"], "listStyle": "check", "ctaStyle": "pill", "texture": "grain"},
    "tech":        {"forms": ["hexagon", "triangle", "diamond"], "listStyle": "dash", "ctaStyle": "chip", "texture": "grid"},
    "salud":       {"forms": ["plus", "heart", "circle"], "listStyle": "check", "ctaStyle": "pill", "texture": "grain"},
    "moda":        {"forms": ["diamond", "star", "blob"], "listStyle": "number", "ctaStyle": "chip", "texture": "lines"},
    "inmobiliaria": {"forms": ["shield", "square", "pentagon"], "listStyle": "number", "ctaStyle": "pill", "texture": "lines"},
    "fitness":     {"forms": ["triangle", "star", "blob"], "listStyle": "bar", "ctaStyle": "chip", "texture": "grain2"},
    "educacion":   {"forms": ["star", "circle", "plus"], "listStyle": "number", "ctaStyle": "pill", "texture": "grid"},
    "finanzas":    {"forms": ["pentagon", "hexagon", "square"], "listStyle": "bar", "ctaStyle": "chip", "texture": "grid"},
    "belleza":     {"forms": ["flower", "drop", "heart"], "listStyle": "check", "ctaStyle": "pill", "texture": "grain"},
    "default":     {"forms": ["square", "circle", "blob"], "listStyle": "dash", "ctaStyle": "pill", "texture": "none"},
}

# Pools de copy por rubro (voseo, rioplatense). Templado pero especifico del rubro -> evita lo generico.
SUBTITLES = {
    "gastronomia": [["Sabor real,", "todos los dias"], ["Del productor", "a tu mesa"], ["Hecho", "con ganas"]],
    "tech": [["Automatiza", "lo aburrido"], ["Mas foco,", "menos tareas"], ["Tu equipo,", "sin fricciones"]],
    "salud": [["Cuidarte", "es simple"], ["Tu salud,", "en buenas manos"], ["Atencion", "de verdad"]],
    "moda": [["Tu estilo,", "tu regla"], ["Disenado", "para vos"], ["Lo que viene,", "primero"]],
    "inmobiliaria": [["Tu lugar", "te espera"], ["Encontra", "tu proximo hogar"], ["Invertir,", "sin vueltas"]],
    "fitness": [["Tu mejor", "version"], ["Entrena", "con proposito"], ["Sin excusas,", "con resultados"]],
    "educacion": [["Aprende", "haciendo"], ["Tu proximo", "nivel"], ["Conocimiento", "que se usa"]],
    "finanzas": [["Tu plata,", "clara"], ["Decisiones", "con datos"], ["Crecer,", "sin riesgos raros"]],
    "belleza": [["Realza", "lo tuyo"], ["Tu ritual,", "tu momento"], ["Cuidado", "que se nota"]],
    "default": [["Hecho", "para vos"], ["Simple,", "y bien"], ["Lo que", "necesitas"]],
}
STATEMENTS = {
    "gastronomia": ["Frescura que se siente en cada bocado", "Ingredientes reales, sin atajos", "El sabor de lo bien hecho"],
    "tech": ["Menos tareas repetitivas, mas resultados", "Lo que hacias en horas, en minutos", "Tu operacion, en piloto automatico"],
    "salud": ["Tu bienestar empieza por una decision", "Cuidado profesional, trato humano", "Prevenir es mas facil de lo que crees"],
    "moda": ["Lo que te poner dice quien sos", "Piezas que duran mas que la tendencia", "Tu armario, con identidad"],
    "inmobiliaria": ["El lugar indicado existe, te lo mostramos", "Comprar bien es comprar tranquilo", "Tu proxima decision, sin sorpresas"],
    "fitness": ["El cambio empieza con la primera serie", "Resultados que se ven y se sienten", "Tu cuerpo responde, vos decidis"],
    "educacion": ["Aprende algo que vas a usar manana", "Del concepto a la practica, rapido", "Tu tiempo invertido, no perdido"],
    "finanzas": ["Tu plata trabajando, no durmiendo", "Numeros claros, decisiones tranquilas", "Crecer ordenado es crecer seguro"],
    "belleza": ["Tu mejor cara, todos los dias", "El ritual que te devuelve el brillo", "Cuidado que se nota desde el primer dia"],
    "default": ["Lo simple, bien hecho, cambia todo", "Pensado para que te resulte facil", "Resultados, sin complicarte"],
}
BENEFITS = {
    "gastronomia": ["Ingredientes frescos", "Hecho del dia", "Sin conservantes", "Envio rapido", "Recetas propias"],
    "tech": ["Sin codigo", "Listo en minutos", "Se integra con todo", "Soporte real", "Escala con vos"],
    "salud": ["Turnos rapidos", "Profesionales reales", "Seguimiento cercano", "Sin esperas", "Trato humano"],
    "moda": ["Edicion limitada", "Calidad premium", "Envio a todo el pais", "Cambios faciles", "Diseno propio"],
    "inmobiliaria": ["Visitas guiadas", "Asesoria honesta", "Opciones reales", "Sin letra chica", "Financiacion clara"],
    "fitness": ["Planes a medida", "Coaches certificados", "Comunidad activa", "Horarios flexibles", "Resultados medidos"],
    "educacion": ["Practico desde el dia 1", "Mentores reales", "A tu ritmo", "Certificado", "Comunidad"],
    "finanzas": ["Comisiones claras", "Datos en vivo", "Soporte humano", "Sin sorpresas", "Empeza con poco"],
    "belleza": ["Productos premium", "Atencion personalizada", "Resultados visibles", "Sin turnos eternos", "Rituales a medida"],
    "default": ["Facil de usar", "Soporte cercano", "Sin vueltas", "Pensado en vos", "Empeza ya"],
}
CTAS = {
    "gastronomia": ["Pedi ahora", "Conoce el menu", "Probalo hoy"],
    "tech": ["Probalo gratis", "Agenda una demo", "Empeza ya"],
    "salud": ["Saca tu turno", "Reserva ahora", "Consultanos"],
    "moda": ["Ver coleccion", "Compra ahora", "Descubri mas"],
    "inmobiliaria": ["Agenda una visita", "Ver propiedades", "Consultanos"],
    "fitness": ["Sumate hoy", "Probá una clase", "Empeza ahora"],
    "educacion": ["Inscribite", "Ver el programa", "Empeza gratis"],
    "finanzas": ["Abri tu cuenta", "Simula gratis", "Empeza hoy"],
    "belleza": ["Reserva tu turno", "Ver servicios", "Consultanos"],
    "default": ["Conoce mas", "Empeza ya", "Probalo"],
}
# Ganchos cortos (reveal): 1-4 palabras que frenan el scroll. Kicker opcional.
HOOKS = {
    "gastronomia": ["Probalo una vez", "Vas a volver", "Sabor de verdad"],
    "tech": ["Adios al caos", "Mas rapido", "Sin vueltas"],
    "salud": ["Cuidarte es facil", "Empeza hoy", "Tu salud primero"],
    "moda": ["Tu estilo manda", "Lo que viene", "Animate"],
    "inmobiliaria": ["Tu lugar existe", "Mudate ya", "Es el momento"],
    "fitness": ["Sin excusas", "Empeza hoy", "Tu mejor version"],
    "educacion": ["Aprende ya", "Tu proximo nivel", "Empeza gratis"],
    "finanzas": ["Tu plata crece", "Decidi mejor", "Empeza simple"],
    "belleza": ["Brilla mas", "Tu momento", "Realza lo tuyo"],
    "default": ["Probalo ya", "Es momento", "Animate hoy"],
}
TESTIMONIALS = {
    "gastronomia": [("El mejor del barrio, sin dudas", "Caro G."), ("Pedi y volvi al toque", "Marce")],
    "salud": [("Me atendieron al instante", "Lucia P."), ("Profesionales de verdad", "Diego")],
    "inmobiliaria": [("Encontre mi casa en una semana", "Flor"), ("Todo claro y rapido", "Juan M.")],
    "fitness": [("Bajé 6 kilos en dos meses", "Pablo"), ("Las clases vuelan", "Sofi")],
    "belleza": [("Salí renovada", "Vale"), ("Mi lugar fijo ya", "Romi")],
    "default": [("Lo recomiendo 100%", "Ana"), ("Superó lo que esperaba", "Leo")],
}
# Sets de 2-3 numeros (numberStack). Datos plausibles SOLO para el banco de prueba (en prod los da el LLM con cifras reales).
STAT_SETS = {
    "gastronomia": [
        [{"value": 600, "prefix": "+", "label": "platos servidos"}, {"value": 4.8, "suffix": "★", "label": "valoracion"}, {"value": 30, "suffix": "min", "label": "envio"}],
        [{"value": 12, "label": "años cocinando"}, {"value": 4.9, "suffix": "★", "label": "resenas"}, {"value": 25, "prefix": "+", "label": "platos en carta"}],
    ],
    "inmobiliaria": [
        [{"value": 120, "prefix": "+", "label": "propiedades"}, {"value": 15, "suffix": " años", "label": "en el rubro"}, {"value": 4.9, "suffix": "★", "label": "clientes"}],
        [{"value": 98, "suffix": "%", "label": "operaciones cerradas"}, {"value": 30, "suffix": " dias", "label": "promedio de venta"}, {"value": 500, "prefix": "+", "label": "familias"}],
    ],
    "fitness": [
        [{"value": 500, "prefix": "+", "label": "socios"}, {"value": 40, "label": "clases x semana"}, {"value": 4.9, "suffix": "★", "label": "valoracion"}],
        [{"value": 8, "label": "kilos promedio"}, {"value": 60, "suffix": "min", "label": "por clase"}, {"value": 4.8, "suffix": "★", "label": "comunidad"}],
    ],
    "finanzas": [
        [{"value": 12, "suffix": "%", "label": "anual"}, {"value": 10000, "prefix": "+", "label": "usuarios"}, {"value": 0, "label": "comisiones"}],
        [{"value": 100000, "prefix": "+", "label": "inversiones"}, {"value": 4.9, "suffix": "★", "label": "en tiendas"}, {"value": 24, "suffix": "h", "label": "retiros"}],
    ],
    "tech": [
        [{"value": 99.9, "suffix": "%", "label": "uptime"}, {"value": 40, "prefix": "-", "suffix": "%", "label": "tareas manuales"}, {"value": 3, "suffix": "x", "label": "mas rapido"}],
        [{"value": 5000, "prefix": "+", "label": "equipos"}, {"value": 200, "prefix": "+", "label": "integraciones"}, {"value": 4.8, "suffix": "★", "label": "soporte"}],
    ],
    "salud": [
        [{"value": 8000, "prefix": "+", "label": "pacientes"}, {"value": 15, "suffix": "min", "label": "de espera"}, {"value": 98, "suffix": "%", "label": "satisfaccion"}],
        [{"value": 20, "prefix": "+", "label": "especialistas"}, {"value": 4.9, "suffix": "★", "label": "resenas"}, {"value": 24, "suffix": "h", "label": "turnos online"}],
    ],
    "educacion": [
        [{"value": 2500, "prefix": "+", "label": "egresados"}, {"value": 12, "label": "cursos"}, {"value": 4.9, "suffix": "★", "label": "valoracion"}],
        [{"value": 95, "suffix": "%", "label": "termina y trabaja"}, {"value": 40, "suffix": "h", "label": "de practica"}, {"value": 30, "prefix": "+", "label": "mentores"}],
    ],
    "moda": [
        [{"value": 200, "prefix": "+", "label": "disenos"}, {"value": 48, "suffix": "h", "label": "envio"}, {"value": 4.8, "suffix": "★", "label": "clientas"}],
        [{"value": 3, "label": "colecciones al año"}, {"value": 100, "suffix": "%", "label": "produccion local"}, {"value": 5000, "prefix": "+", "label": "pedidos"}],
    ],
    "belleza": [
        [{"value": 4.9, "suffix": "★", "label": "valoracion"}, {"value": 3000, "prefix": "+", "label": "clientas"}, {"value": 12, "label": "servicios"}],
        [{"value": 8, "label": "años de experiencia"}, {"value": 98, "suffix": "%", "label": "vuelven"}, {"value": 20, "prefix": "+", "label": "tratamientos"}],
    ],
    "default": [
        [{"value": 500, "prefix": "+", "label": "clientes"}, {"value": 4.8, "suffix": "★", "label": "valoracion"}, {"value": 24, "suffix": "h", "label": "respuesta"}],
        [{"value": 10, "prefix": "+", "label": "años"}, {"value": 4.9, "suffix": "★", "label": "resenas"}, {"value": 1000, "prefix": "+", "label": "proyectos"}],
    ],
}


# COMPOSICIONES de HERO: rompen el molde "forma centrada + nombre debajo" (lo que hacia que TODOS se
# parezcan). Cada rubro tiene un par (la semilla elige) -> el FRAME del hero se ve distinto por marca.
#   emblem       -> forma centrada + nombre debajo (clasico, simetrico)
#   sideLeft     -> forma a la izquierda + nombre grande a la derecha (asimetrico, editorial)
#   typeHero     -> NOMBRE GIGANTE protagonista + forma chica de acento pegada arriba (tipografico)
#   shapeBehind  -> forma grande y TENUE descentrada detras + nombre encima (capas/profundidad)
#   topAnchor    -> forma arriba + nombre abajo (vertical asimetrico)
#   cornerAnchor -> forma chica arriba-derecha + nombre abajo-izquierda (diagonal, aire)
#   diagonal     -> forma grande abajo-izquierda + nombre arriba-derecha alineado a la derecha (tension)
# Cada rubro tiene >=1 comp ASIMETRICO (rompe el "centrado por defecto" que hacia leer plantilla).
HERO_COMP = {
    "gastronomia": ["emblem", "cornerAnchor", "typeSlam"], "tech": ["typeHero", "typeSlam", "diagonal"],
    "salud": ["emblem", "sideLeft", "shapeBehind"], "moda": ["typeSlam", "typeHero", "diagonal"],
    "inmobiliaria": ["sideLeft", "cornerAnchor", "topAnchor"], "fitness": ["typeHero", "typeSlam", "topAnchor"],
    "educacion": ["typeSlam", "cornerAnchor", "typeHero"], "finanzas": ["sideLeft", "typeSlam", "topAnchor"],
    "belleza": ["shapeBehind", "cornerAnchor", "topAnchor"], "default": ["emblem", "typeSlam", "diagonal"],
}
# shape: lead = forma protagonista (solo rubros donde encaja) | accent = marca chica | none = SOLO tipografia
# (una regla de acento ancla el titular, sin figura geometrica). El default del sistema es type-led.
_HERO_LAYOUT = {
    "emblem":       dict(sx=202, sy=286, sr=108, nx=202, ny=486, nsz=52, al="center", bx=202, by=522, sop=1.0, orb=True,  ns=2.0, maxW=348, shape="lead"),
    "sideLeft":     dict(sx=112, sy=322, sr=82,  nx=212, ny=300, nsz=46, al="left",   bx=212, by=350, sop=1.0, orb=False, ns=2.0, maxW=178, shape="lead"),
    "typeHero":     dict(sx=150, sy=232, sr=54,  nx=202, ny=330, nsz=80, al="center", bx=202, by=408, sop=1.0, orb=True,  ns=1.3, maxW=372, shape="accent"),
    "shapeBehind":  dict(sx=250, sy=288, sr=150, nx=176, ny=372, nsz=56, al="left",   bx=176, by=452, sop=0.5, orb=False, ns=2.0, maxW=210, shape="lead"),
    "topAnchor":    dict(sx=202, sy=224, sr=92,  nx=202, ny=486, nsz=52, al="center", bx=202, by=522, sop=1.0, orb=True,  ns=2.2, maxW=348, shape="lead"),
    "cornerAnchor": dict(sx=318, sy=150, sr=58,  nx=44,  ny=470, nsz=58, al="left",   bx=44,  by=512, sop=1.0, orb=True,  ns=1.8, maxW=320, shape="accent"),
    "diagonal":     dict(sx=104, sy=540, sr=104, nx=360, ny=250, nsz=52, al="right",  bx=360, by=300, sop=1.0, orb=True,  ns=1.8, maxW=300, shape="lead"),
    "typeSlam":     dict(sx=330, sy=140, sr=22,  nx=202, ny=372, nsz=104, al="center", bx=202, by=470, sop=1.0, orb=False, ns=0.85, maxW=384, shape="accent"),
    # TYPE-LED puros: la marca/titular es el heroe, CERO figura; una regla de acento lo ancla. Distinto
    # ANCLAJE VERTICAL por comp -> la composicion (no solo el color) cambia entre estilos.
    "typeStack":    dict(sx=0, sy=0, sr=0, nx=40,  ny=318, nsz=86, al="left",   bx=40,  by=392, sop=0, orb=False, ns=0.7, maxW=336, shape="none"),
    "typeOnly":     dict(sx=0, sy=0, sr=0, nx=202, ny=336, nsz=94, al="center", bx=202, by=414, sop=0, orb=False, ns=0.7, maxW=384, shape="none"),
    "typeTop":      dict(sx=0, sy=0, sr=0, nx=40,  ny=186, nsz=88, al="left",   bx=40,  by=262, sop=0, orb=False, ns=0.7, maxW=340, shape="none"),
    "typeLower":    dict(sx=0, sy=0, sr=0, nx=40,  ny=566, nsz=80, al="left",   bx=40,  by=636, sop=0, orb=False, ns=0.7, maxW=340, shape="none"),
}
# El frame de cierre (outro) hereda la personalidad del hero: cada composicion su CTA.
_OUTRO_BY_COMP = {"emblem": "center", "sideLeft": "left", "typeHero": "bigtype", "shapeBehind": "center",
                  "topAnchor": "bar", "cornerAnchor": "left", "diagonal": "bar", "typeSlam": "bigtype"}


_VISUAL_RUBROS = {"gastronomia", "inmobiliaria", "belleza", "moda", "fitness", "salud", "educacion"}


def _hero_resource(rubro, has_photos, rnd):
    """RECURSO PROTAGONISTA del hero (mata 'la misma figura geometrica en TODOS los videos'): elige UNO -
    foto real / tipografia pura / morph. Determinista por rnd(seed). Morph cae a ~1 de cada 3-4."""
    if has_photos and rubro in _VISUAL_RUBROS:
        rnd.random()   # consume 1 (mantiene la secuencia estable vs el choice anterior)
        return "photo"   # rubro visual con fotos -> SIEMPRE foto: la foto del local/producto ES el anuncio (sin ella lee 'generico')
    if has_photos:
        return rnd.choice(["photo", "type", "type", "morph"])
    return rnd.choice(["type", "type", "morph"])                 # sin fotos: tipografia o morph (morph minoria)


def _hero_scene(brand, rubro, accent_light, rnd, comp, blur, f1, f2, resource="morph", photos=None):
    """HERO con COMPOSICION variable (no siempre forma-centrada): la forma FIRMA del rubro (f1, elegida en
    generate y guardada en la marca) aparece YA en el arranque (t=0.42) y el morph la usa para un flourish
    corto + pulso/rotacion. f2 = excursion breve. blur/saturacion vienen de la energia del rubro."""
    fx = RUBRO_FX.get(rubro, RUBRO_FX["default"])
    ease_in = rnd.choice(["outBack", "outElastic"])
    sub = " ".join(rnd.choice(SUBTITLES.get(rubro, SUBTITLES["default"])))
    L = _HERO_LAYOUT[comp]
    # RECURSO PROTAGONISTA: foto real a sangre (rubros visuales) -> NO morph. El texto va sobre el scrim.
    if resource == "photo" and photos:
        pidx = rnd.randrange(len(photos))
        return {"type": "scene", "durationInFrames": 126, "comp": comp, "elements": [
            {"kind": "photo", "photoIdx": pidx, "keys": [{"t": 0, "opacity": 0}, {"t": 0.35, "opacity": 1, "ease": "outCubic"}]},
            {"kind": "text", "text": brand, "fill": "photoink", "size": 58, "weight": 800, "align": "center", "maxW": 360, "kinetic": True,
             "keys": [{"t": 0.4, "opacity": 1, "x": 202, "y": 556}]},
            {"kind": "text", "text": sub, "fill": "photodim", "size": 23, "weight": 600, "align": "center", "maxW": 330,
             "keys": [{"t": 0.9, "opacity": 0, "x": 202, "y": 612}, {"t": 1.3, "opacity": 1, "x": 202, "y": 602, "ease": "outCubic"}]},
        ]}
    # TIPOGRAFIA pura -> sin figura (shape none); morph -> segun la comp. Asi NO todos llevan figura.
    shape_mode = "none" if resource == "type" else L.get("shape", "lead")
    jx, jy = rnd.randint(-14, 14), rnd.randint(-14, 14)
    sx, sy, sr, sop, ns = L["sx"] + jx, L["sy"] + jy, L["sr"], L["sop"], L["ns"]
    els = []
    if shape_mode != "none":
        # forma firma: protagonista (lead) o acento chico (accent). NUNCA en los heros type-led.
        rmul = 1.0 if shape_mode == "lead" else 0.82
        els.append({"kind": "morph", "fill": accent_light, "blur": blur, "keys": [
            {"t": 0.0, "form": "circle", "r": round(sr * 0.1 * rmul, 1), "opacity": 0, "x": sx, "y": sy},
            {"t": 0.42, "form": f1, "r": round(sr * 0.52 * rmul, 1), "opacity": sop, "x": sx, "y": sy, "ease": ease_in},
            {"t": 1.1, "form": f2, "r": round(sr * 0.84 * rmul, 1), "opacity": sop, "x": sx, "y": sy, "rot": 7, "ease": "inOutCubic"},
            {"t": 2.0, "form": f1, "r": round(sr * 0.96 * rmul, 1), "opacity": sop, "x": sx, "y": sy, "rot": -6, "ease": "inOutCubic"},
            {"t": 3.2, "form": f1, "r": round(sr * rmul, 1), "opacity": sop, "x": sx, "y": sy, "rot": -11, "ease": "inOutCubic"},
            {"t": 4.6, "form": f1, "r": round(sr * 1.07 * rmul, 1), "opacity": sop, "x": sx, "y": sy, "rot": 2, "ease": "inOutCubic"},
            {"t": 7.0, "form": f1, "r": round(sr * rmul, 1), "opacity": sop, "x": sx, "y": sy, "rot": 13, "ease": "inOutCubic"},
        ]})
        if shape_mode == "lead":
            els.append({"kind": "particles", "count": fx["pc"], "spread": round(sr * fx["ps"], 1), "phase": round(rnd.uniform(0, 6.28), 2), "dotR": fx["dr"], "keys": [
                {"t": 1.2, "x": sx, "y": sy, "burst": 0}, {"t": 2.1, "x": sx, "y": sy, "burst": 1}]})
            if L["orb"]:
                els.append({"kind": "orbit", "count": fx["od"], "r": round(sr * 1.42, 1), "speed": fx["osp"], "fill": "accent2", "dotR": max(5, fx["dr"] + 2), "keys": [
                    {"t": 1.6, "x": sx, "y": sy, "opacity": 0}, {"t": 2.3, "x": sx, "y": sy, "opacity": 0.9, "ease": "outCubic"}]})
    else:
        # TYPE-LED: una REGLA de acento que crece ancla el titular (reemplaza a la figura geometrica)
        ruy = L["ny"] - round(L["nsz"] * 0.72)
        rcx = L["nx"] + (37 if L["al"] == "center" else 37)
        els.append({"kind": "shape", "fill": "accent", "glow": False, "keys": [
            {"t": ns - 0.05, "w": 0, "h": 6, "r": 3, "x": rcx, "y": ruy, "opacity": 0},
            {"t": ns + 0.4, "w": 74, "h": 6, "r": 3, "x": rcx, "y": ruy, "opacity": 1, "ease": "outCubic"}]})
    els.append({"kind": "text", "text": brand, "fill": "ink", "size": L["nsz"], "weight": 800, "align": L["al"], "maxW": L.get("maxW", 348), "kinetic": True, "keys": [
        {"t": ns, "opacity": 1, "x": L["nx"], "y": L["ny"]}]})
    els.append({"kind": "text", "text": sub, "fill": "dim", "size": max(20, min(30, round(L["nsz"] * 0.42))), "weight": 600, "align": L["al"], "maxW": min(300, L.get("maxW", 300)), "keys": [
        {"t": ns + 0.9, "opacity": 0, "x": L["bx"], "y": L["by"] + 14},
        {"t": ns + 1.4, "opacity": 1, "x": L["bx"], "y": L["by"], "ease": "outCubic"}]})
    return {"type": "scene", "durationInFrames": 126, "elements": els, "comp": comp}


def _statement(rubro, rnd, stmt_style="centered"):
    return {"type": "statement", "text": rnd.choice(STATEMENTS.get(rubro, STATEMENTS["default"])),
            "stmtStyle": stmt_style, "durationInFrames": 98}


def _checklist(brand, rubro, rnd, list_style, list_anchor="center", list_layout="rows"):
    pool = BENEFITS.get(rubro, BENEFITS["default"])[:]
    rnd.shuffle(pool)
    n = 4 if list_layout == "grid" else rnd.choice([3, 3, 4])
    return {"type": "checklist", "title": f"Por que {brand}", "items": pool[:n], "listStyle": list_style,
            "listAnchor": list_anchor, "listLayout": list_layout, "durationInFrames": 132 + (n - 3) * 10}


def _reveal(rubro, rnd, align="center"):
    return {"type": "reveal", "text": rnd.choice(HOOKS.get(rubro, HOOKS["default"])), "align": align,
            "kicker": rnd.choice(["", "", "ESTO ES", "MIRA ESTO"]), "durationInFrames": rnd.choice([84, 90, 96])}


def _quote(rubro, rnd, align="center"):
    q, author = rnd.choice(TESTIMONIALS.get(rubro, TESTIMONIALS["default"]))
    return {"type": "quote", "text": q, "author": author, "stars": rnd.choice([5, 5, 4]), "align": align, "durationInFrames": rnd.choice([120, 132])}


def _numberstack(rubro, rnd, align="center"):
    return {"type": "numberStack", "items": rnd.choice(STAT_SETS.get(rubro, STAT_SETS["default"])), "align": align, "durationInFrames": rnd.choice([120, 132, 138])}


def _split(brand, rubro, rnd, images):
    if not images:
        return None
    return {"type": "split", "title": brand, "sub": " ".join(rnd.choice(SUBTITLES.get(rubro, SUBTITLES["default"]))),
            "cta": rnd.choice(CTAS.get(rubro, CTAS["default"])), "photoIdx": rnd.randrange(len(images)),
            "side": rnd.choice(["left", "right"]), "durationInFrames": rnd.choice([108, 120])}


def _gen_structure(rubro, has_photos, rnd, force_hero=False):
    """GRAMATICA GENERATIVA: en vez de elegir 1 de ~4 esqueletos fijos (el 'mismo molde'), construye una estructura
    variada por marca: apertura diversa (no siempre hero), 1-4 beats de cuerpo sin repetir el anterior, tipos nuevos
    (reveal/quote/numberStack/split), el hero puede ir al medio, cierre en outro. Determinista por rnd(seed).
    force_hero: rubro visual con foto -> garantiza que exista un slot 'hero' (donde vive la FOTO) aunque la apertura
    sea un hook tipografico; asi NUNCA un rubro visual con fotos sale 100% texto (era la causa #1 de 'generico')."""
    open_pool = ["reveal", "statement", "hero", "reveal", "hero"]
    if rnd.random() < 0.22:
        open_pool.append("bigStat")
    opening = rnd.choice(open_pool)
    body_pool = ["statement", "checklist", "numberStack", "quote"]
    if has_photos:
        body_pool += ["split", "split", "fullPhoto"] if False else ["split", "split"]
    if rubro in ("finanzas", "tech", "fitness", "inmobiliaria", "gastronomia"):
        body_pool.append("bigStat")
    if opening != "hero":
        body_pool.append("hero")
    nbody = rnd.choice([1, 2, 2, 3, 3, 4])
    skel, prev = [opening], opening
    for _ in range(nbody):
        choices = [c for c in body_pool if c != prev] or body_pool
        b = rnd.choice(choices)
        skel.append(b)
        prev = b
    skel.append("outro")
    out = []
    for s in skel:
        if out and out[-1] == s:
            continue
        out.append(s)
    if force_hero and "hero" not in out:
        out.insert(1, "hero")   # inserta el hero (foto) tras la apertura -> hook + foto, sin perder variedad de apertura
    return out


def _outro(brand, rubro, rnd, outro_comp):
    return {"type": "outro", "brand": brand, "cta": rnd.choice(CTAS.get(rubro, CTAS["default"])),
            "outroComp": outro_comp, "durationInFrames": 104}


def _bigstat(facts, rnd, align="center"):
    if not facts:
        return None
    for f in facts:
        if isinstance(f, dict) and f.get("value") is not None:
            return {"type": "bigStat", "value": f["value"], "prefix": f.get("prefix", ""), "suffix": f.get("suffix", ""),
                    "label": f.get("label", ""), "align": align, "durationInFrames": 96}
    return None


# Estructura POR RUBRO: distinto ORDEN y composicion de bloques, no solo distinto color/duracion.
# fitness/gastronomia abren con el claim (punchy/sensorial); salud respira y va lista-primero; moda/
# belleza son minimalistas/editoriales; tech/finanzas llevan dato. Asi el ESQUELETO temporal cambia
# por rubro (el ojo deja de leer "plantilla"). Se elige uno del pool del rubro por semilla.
RUBRO_STRUCT = {
    "gastronomia": [["statement", "hero", "checklist", "outro"], ["hero", "checklist", "statement", "outro"], ["statement", "hero", "outro"]],
    "tech":        [["hero", "statement", "checklist", "outro"], ["hero", "bigStat", "checklist", "outro"], ["hero", "checklist", "outro"]],
    "salud":       [["statement", "checklist", "hero", "outro"], ["hero", "checklist", "statement", "outro"], ["hero", "statement", "outro"]],
    "moda":        [["hero", "statement", "outro"], ["statement", "hero", "outro"], ["hero", "outro"]],
    "inmobiliaria": [["hero", "checklist", "statement", "outro"], ["statement", "hero", "checklist", "outro"], ["hero", "statement", "outro"]],
    "fitness":     [["statement", "hero", "checklist", "outro"], ["hero", "bigStat", "outro"], ["hero", "checklist", "outro"]],
    "educacion":   [["hero", "checklist", "statement", "outro"], ["hero", "statement", "checklist", "outro"], ["statement", "hero", "checklist", "outro"]],
    "finanzas":    [["hero", "bigStat", "checklist", "outro"], ["statement", "hero", "checklist", "outro"], ["hero", "checklist", "outro"]],
    "belleza":     [["hero", "statement", "outro"], ["statement", "hero", "outro"], ["hero", "outro"]],
    "default":     [["hero", "statement", "checklist", "outro"], ["hero", "checklist", "outro"]],
}


# ARQUETIPOS = direccion de arte COHERENTE para TODO el video (no solo otro orden de escenas). Cada uno fija
# composicion del hero + estilo de statement + estilo/grilla de lista + tono + fondo + textura + RITMO. Asi
# dos videos de arquetipos distintos se sienten de marcas distintas; y como la semilla elige el arquetipo
# (con sesgo por rubro), la MISMA marca puede caer en arquetipos distintos -> se rompe "rubro = un solo look".
#   editorial  -> revista premium: tipografia protagonista, claro, sobrio, holds largos
#   bold       -> punchy/deportivo: nombre gigante, oscuro dramatico, cortes rapidos
#   clean      -> minimal tipo Linear/Vercel: balanceado, medido, cualquier tono
#   expressive -> organico/belleza: capas suaves, claro, fluido
ARCHETYPES = {
    "editorial":  {"comps": ["typeStack", "typeSlam", "typeOnly"], "stmt": ["editorial"],
                   "list_style": "number", "grid_p": 0.0, "light_p": 0.55, "bg_dark": ["spotlight", "field", "mesh"], "bg_light": ["field", "aurora", "mesh"],
                   "tex": "lines", "rhythm": {"scene": 1.12, "statement": 0.96, "checklist": 1.0, "bigStat": 0.96, "outro": 1.0},
                   "structs": [["hero", "statement", "outro"], ["statement", "hero", "outro"],
                               ["hero", "statement", "checklist", "outro"], ["statement", "statement", "hero", "outro"]]},
    "bold":       {"comps": ["typeSlam", "typeOnly", "typeStack"], "stmt": ["editorial", "centered"],
                   "list_style": "bar", "grid_p": 0.0, "light_p": 0.12, "bg_dark": ["spotlight", "bands"], "bg_light": ["bands", "field"],
                   "tex": "grain2", "rhythm": {"scene": 0.96, "statement": 0.82, "checklist": 0.86, "bigStat": 0.85, "outro": 0.9},
                   "structs": [["statement", "hero", "outro"], ["hero", "statement", "outro"],
                               ["statement", "statement", "outro"], ["hero", "checklist", "outro"]]},
    "clean":      {"comps": ["typeStack", "typeOnly", "sideLeft"], "stmt": ["centered", "panel"],
                   "list_style": "dash", "grid_p": 0.4, "light_p": 0.45, "bg_dark": ["mesh", "field"], "bg_light": ["mesh", "field"],
                   "tex": "grid", "rhythm": {"scene": 1.0, "statement": 1.0, "checklist": 1.0, "bigStat": 1.0, "outro": 1.0},
                   "structs": [["hero", "statement", "checklist", "outro"], ["hero", "checklist", "outro"],
                               ["statement", "hero", "checklist", "outro"], ["hero", "statement", "outro"]]},
    "expressive": {"comps": ["shapeBehind", "cornerAnchor", "typeStack"], "stmt": ["quote", "panel"],
                   "list_style": "check", "grid_p": 0.3, "light_p": 0.78, "bg_dark": ["aurora", "field"], "bg_light": ["aurora", "field"],
                   "tex": "grain", "rhythm": {"scene": 1.1, "statement": 1.06, "checklist": 1.04, "bigStat": 1.0, "outro": 1.05},
                   "structs": [["hero", "statement", "outro"], ["statement", "hero", "outro"],
                               ["hero", "outro"], ["hero", "statement", "checklist", "outro"]]},
}
# sesgo de arquetipo por rubro (la semilla elige uno del pool -> variedad real dentro del rubro)
RUBRO_ARCHE = {
    "moda":         ["editorial", "bold", "expressive"], "belleza": ["expressive", "editorial", "clean"],
    "tech":         ["bold", "clean", "editorial"],      "finanzas": ["clean", "bold", "editorial"],
    "fitness":      ["bold", "bold", "editorial"],       "salud": ["expressive", "clean", "editorial"],
    "inmobiliaria": ["editorial", "clean", "expressive"], "educacion": ["clean", "editorial", "bold"],
    "gastronomia":  ["expressive", "editorial", "bold"], "default": ["clean", "bold", "editorial"],
}
# END-CARDS (cierre) por arquetipo: el final tambien VARIA por video, no siempre marca centrada + CTA.
#   center=marca+CTA centrado | left=lockup lateral | bar=barra full-width | bigtype=CTA grande+marca chica
#   diagonal=marca arriba-izq + CTA abajo-der | ctaOnly=CTA protagonista, marca firma chica al pie
ARCHE_OUTRO = {
    "editorial":  ["bigtype", "diagonal", "left"],
    "bold":       ["ctaOnly", "bigtype", "diagonal"],
    "clean":      ["center", "diagonal", "left"],
    "expressive": ["center", "bar", "ctaOnly"],
}

# ====================================================================================================
# CATALOGO DE ESTILOS (lo que el USUARIO elige). Cada estilo es una direccion de arte completa: tratamiento
# de fondo + tono + modo de sombra + textura + composiciones + statement + lista + end-card + ritmo +
# estructura narrativa. El RUBRO sigue aportando color + MOTIVO del fondo (ortogonal al estilo). 12 estilos
# ordenados de seguro -> audaz. Basado en investigacion de video marketing 2026 (workflow wyvnqmn17).
# ====================================================================================================
_RH_SLOW = {"scene": 1.12, "statement": 1.0, "checklist": 1.02, "bigStat": 0.98, "outro": 1.06}
_RH_MED = {"scene": 1.0, "statement": 0.95, "checklist": 1.0, "bigStat": 0.96, "outro": 1.0}
_RH_FAST = {"scene": 0.95, "statement": 0.8, "checklist": 0.86, "bigStat": 0.84, "outro": 0.9}
_ST_PREMIUM = [["hero", "statement", "outro"], ["statement", "hero", "outro"], ["hero", "statement", "checklist", "outro"]]
_ST_PUNCHY = [["statement", "hero", "outro"], ["statement", "statement", "outro"], ["hero", "outro"], ["hero", "statement", "outro"]]
_ST_FULL = [["hero", "statement", "checklist", "outro"], ["hero", "checklist", "outro"], ["statement", "hero", "checklist", "outro"], ["hero", "statement", "outro"]]

STYLE_PRESETS = {
    "blueprint":   {"nombre": "Blueprint", "bg": "blueprint", "light_p": 0.12, "shadow": "soft", "tex": "grid",
                    "comps": ["typeStack", "typeLower", "sideLeft"], "stmt": ["editorial", "left"], "list": "number", "grid_p": 0.0,
                    "outro": ["bigtype", "diagonal", "left"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "swiss":       {"nombre": "Swiss / Grid", "bg": "blueprint", "light_p": 0.92, "shadow": "soft", "tex": "grid",
                    "comps": ["typeStack", "typeLower", "sideLeft"], "stmt": ["centered", "panel"], "list": "dash", "grid_p": 0.5,
                    "outro": ["left", "diagonal", "center"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "platinum":    {"nombre": "Platinum Linear", "bg": "spotlight", "light_p": 0.08, "shadow": "soft", "tex": "grid",
                    "comps": ["typeSlam", "typeOnly", "sideLeft"], "stmt": ["editorial", "centered"], "list": "dash", "grid_p": 0.3,
                    "outro": ["bigtype", "ctaOnly", "diagonal"], "rhythm": _RH_MED, "structs": _ST_PREMIUM},
    "obsidian":    {"nombre": "Obsidian Luxe", "bg": "field", "light_p": 0.0, "shadow": "soft", "tex": "grain",
                    "comps": ["typeOnly", "typeStack", "emblem"], "stmt": ["quote", "editorial"], "list": "number", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype", "center"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    "meshflow":    {"nombre": "Mesh Flow", "bg": "mesh", "light_p": 0.5, "shadow": "soft", "tex": "none",
                    "comps": ["typeSlam", "typeStack", "shapeBehind"], "stmt": ["centered", "editorial"], "list": "check", "grid_p": 0.0,
                    "outro": ["bigtype", "center", "diagonal"], "rhythm": _RH_MED, "structs": _ST_PREMIUM},
    "aurora":      {"nombre": "Aurora Flux", "bg": "aurora", "light_p": 0.72, "shadow": "soft", "tex": "grain",
                    "comps": ["shapeBehind", "cornerAnchor", "typeStack"], "stmt": ["quote", "panel"], "list": "check", "grid_p": 0.3,
                    "outro": ["center", "bar", "ctaOnly"], "rhythm": _RH_SLOW, "structs": _ST_PREMIUM},
    "handmade":    {"nombre": "Hecho a Mano", "bg": "field", "light_p": 0.9, "shadow": "soft", "tex": "grain",
                    "comps": ["typeStack", "cornerAnchor", "emblem"], "stmt": ["panel", "quote"], "list": "check", "grid_p": 0.0,
                    "outro": ["left", "center", "diagonal"], "rhythm": _RH_SLOW, "structs": _ST_FULL},
    "brutalist":   {"nombre": "Neo-Brutalist", "bg": "brutalist", "light_p": 0.25, "shadow": "hard", "tex": "none",
                    "comps": ["typeTop", "typeOnly", "typeStack"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
    "typographic": {"nombre": "Typographic", "bg": "field", "light_p": 0.4, "shadow": "soft", "tex": "none",
                    "comps": ["typeTop", "typeOnly", "typeSlam"], "stmt": ["editorial"], "list": "number", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_MED, "structs": _ST_PUNCHY},
    "riso":        {"nombre": "Risograph", "bg": "halftone", "light_p": 0.5, "shadow": "hard", "tex": "none",
                    "comps": ["typeStack", "cornerAnchor", "typeOnly"], "stmt": ["editorial", "quote"], "list": "number", "grid_p": 0.0,
                    "outro": ["diagonal", "left", "ctaOnly"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "retro70s":    {"nombre": "Retro 70s", "bg": "sunburst", "light_p": 0.35, "shadow": "soft", "tex": "grain",
                    "comps": ["typeSlam", "emblem", "typeStack"], "stmt": ["centered", "panel"], "list": "check", "grid_p": 0.0,
                    "outro": ["center", "bigtype"], "rhythm": _RH_MED, "structs": _ST_FULL},
    "sport":       {"nombre": "Sport Velocity", "bg": "speedlines", "light_p": 0.05, "shadow": "hard", "tex": "none",
                    "comps": ["typeOnly", "typeSlam", "diagonal"], "stmt": ["editorial", "centered"], "list": "bar", "grid_p": 0.0,
                    "outro": ["ctaOnly", "bigtype"], "rhythm": _RH_FAST, "structs": _ST_PUNCHY},
}
# orden seguro -> audaz (para la UI del selector) + sesgo de estilo recomendado por rubro (auto cuando el
# usuario no elige). El usuario SIEMPRE puede pisar esto con su eleccion.
STYLE_ORDER = ["blueprint", "swiss", "platinum", "obsidian", "meshflow", "aurora", "handmade", "typographic", "riso", "retro70s", "brutalist", "sport"]
RUBRO_STYLE_BIAS = {
    "inmobiliaria": ["blueprint", "swiss", "obsidian", "platinum"],
    "finanzas":     ["platinum", "swiss", "blueprint", "brutalist"],
    "tech":         ["platinum", "meshflow", "typographic", "brutalist"],
    "salud":        ["aurora", "swiss", "meshflow", "handmade"],
    "belleza":      ["aurora", "obsidian", "handmade", "riso"],
    "gastronomia":  ["handmade", "retro70s", "riso", "meshflow"],
    "fitness":      ["sport", "brutalist", "typographic", "platinum"],
    "educacion":    ["swiss", "retro70s", "typographic", "meshflow"],
    "moda":         ["obsidian", "typographic", "riso", "brutalist"],
    "default":      ["meshflow", "swiss", "platinum", "typographic"],
}

# FUENTE DE VERDAD COMPARTIDA con produccion: el catalogo canonico vive en style_catalog (lo usa
# timeline_director). Re-vinculamos aca -> el banco de prueba (mock) y produccion NUNCA se desincronizan.
# (Las defs de arriba quedan como referencia; este import las pisa con las del modulo compartido.)
from style_catalog import STYLE_PRESETS, STYLE_ORDER, RUBRO_STYLE_BIAS, STYLE_FONTS, _DEFAULT_FONTS  # noqa: E402
from style_catalog import _BG_LOCKED_STYLES, _RENDERABLE_BG  # noqa: E402


def generate(brand: str, industria: str, facts=None, seed: int = None, style: str = None, images=None) -> dict:
    """Marca + rubro -> timeline COMPLETO (imita al LLM, determinista). Para test y fallback offline."""
    if seed is None:
        seed = se.stable_seed(brand, industria)
    pre = se.preset(industria, "", "medio", seed)
    rubro = pre["rubro"]
    rnd = random.Random((int(seed) ^ 0x9E3779B9) & 0xFFFFFFFF)

    st = RUBRO_STYLE.get(rubro, RUBRO_STYLE["default"])
    # ESTILO: lo ELIGE el usuario; si no, auto por sesgo de rubro + semilla. Es la direccion de arte completa
    # (fondo + tono + sombra + textura + comps + statement + lista + end-card + ritmo + estructura). El rubro
    # aporta color + MOTIVO del fondo (ortogonal al estilo).
    if style and style in STYLE_PRESETS:
        style_id = style
    else:
        style_id = rnd.choice(RUBRO_STYLE_BIAS.get(rubro, RUBRO_STYLE_BIAS["default"]))
    S = STYLE_PRESETS[style_id]
    tone = "light" if rnd.random() < S["light_p"] else "dark"
    texture = S["tex"]
    # SISTEMA DE FONDO: el del estilo es el DEFAULT, pero el eje ORTOGONAL bg_system (style_engine, sub-seed propio
    # y coherente con el tono) lo PISA cuando el estilo no bloquea su fondo -> la familia de fondo queda DESACOPLADA
    # del theme/tono/estilo (dos marcas del mismo estilo/rubro pueden caer en familias distintas). Determinista.
    bg_style = S["bg"]
    _bgsys = se.bg_system_for(seed, tone)
    if _bgsys and style_id not in _BG_LOCKED_STYLES and _bgsys in _RENDERABLE_BG:
        bg_style = _bgsys
    shadow_mode = S["shadow"]
    # color + dureza de la forma firma derivan de la energia del rubro Y del tono del fondo
    accent_light, shape_blur = _shape_paint(pre["accent"], rubro, tone)
    comp = rnd.choice(S["comps"])
    # forma FIRMA de la marca (de la familia del rubro): se guarda para persistirla como marca de agua.
    forms = st["forms"][:]
    rnd.shuffle(forms)
    f1, f2 = forms[0], (forms[1] if len(forms) > 1 else forms[0])
    left_anchored = comp in ("sideLeft", "cornerAnchor", "typeStack", "typeTop", "typeLower")
    # statement: lo manda el estilo; si el hero es de columna izquierda y el estilo no trae editorial/left, usar left
    if left_anchored and "editorial" not in S["stmt"] and "left" not in S["stmt"]:
        stmt_style = "left"
    else:
        stmt_style = rnd.choice(S["stmt"])
    list_anchor = "left" if left_anchored else "center"
    list_style = S["list"]
    # LAYOUT del checklist rotado por marca -> NO siempre la columna vertical (queja: "la misma lista en casi todos").
    # chips (pildoras) ~1/3 en cualquier tono; grilla de cards solo en OSCURO (en claro lee como placeholders grises);
    # resto, filas. El motor igual rota por semilla si el director no lo fija (cubre el camino de la IA real).
    _lr = rnd.random()
    list_layout = "chips" if _lr < 0.34 else ("grid" if (tone == "dark" and S["grid_p"] > 0 and _lr < 0.62) else "rows")
    # el END-CARD lo elige el estilo; pero si el hero ancla a la IZQUIERDA, el cierre tambien (left/diagonal)
    # -> cada estilo es un SISTEMA espacial coherente de punta a punta, no hero-izq + cierre-centrado.
    outro_pool = S["outro"]
    if left_anchored:
        _lo = [o for o in outro_pool if o in ("left", "diagonal")]
        if _lo:
            outro_pool = _lo
    outro_comp = rnd.choice(outro_pool)
    # ESTRUCTURA NARRATIVA del estilo (no una sola coreografia para todos): conteo/orden/beats varian.
    _hero_res = _hero_resource(rubro, bool(images), rnd)   # recurso protagonista (foto/tipo/morph) -> no todos llevan figura
    # estructura GENERATIVA por marca (no esqueleto fijo -> rompe el molde); si el hero es FOTO, garantiza el slot.
    skel = _gen_structure(rubro, bool(images), rnd, force_hero=(_hero_res == "photo"))
    scenes = []
    _used_stmt = set()

    def _fresh_statement():
        sc = _statement(rubro, rnd, stmt_style)
        n = 0
        while sc["text"] in _used_stmt and n < 6:
            sc = _statement(rubro, rnd, stmt_style)
            n += 1
        _used_stmt.add(sc["text"])
        return sc

    _va = rnd.choice(["center", "center", "left"])   # PERSONALIDAD DE LAYOUT del video (40% left) -> mismo tipo de escena se ve distinto entre videos
    for slot in skel:
        if slot == "hero":
            scenes.append(_hero_scene(brand, rubro, accent_light, rnd, comp, shape_blur, f1, f2, _hero_res, images))
        elif slot == "statement":
            scenes.append(_fresh_statement())
        elif slot == "checklist":
            scenes.append(_checklist(brand, rubro, rnd, list_style, list_anchor, list_layout))
        elif slot == "bigStat":
            bs = _bigstat(facts, rnd, _va)
            scenes.append(bs if bs else _numberstack(rubro, rnd, _va))   # sin cifra real -> numberStack (datos del banco) en vez de statement
        elif slot == "reveal":
            scenes.append(_reveal(rubro, rnd, _va))
        elif slot == "numberStack":
            scenes.append(_numberstack(rubro, rnd, _va))
        elif slot == "quote":
            scenes.append(_quote(rubro, rnd, _va))
        elif slot == "split":
            sp = _split(brand, rubro, rnd, images)
            scenes.append(sp if sp else _fresh_statement())
        elif slot == "outro":
            scenes.append(_outro(brand, rubro, rnd, outro_comp))

    # RITMO por rubro: energia alta (tech/fitness) -> escenas mas cortas (cortes rapidos); baja
    # (salud/inmobiliaria) -> mas largas (respiracion). Asi el video no corre el mismo tempo en todos.
    energy = pre.get("bg_energy", 1.0)
    factor = max(0.78, min(1.22, 1.0 - (energy - 1.0) * 0.45))
    # RITMO del ESTILO (sport/brutalist = punchy, obsidian/aurora = respira) + 1er beat mas rapido (hook).
    _rhythm = S["rhythm"]
    for idx, s in enumerate(scenes):
        # jitter de duracion por escena -> el tempo NO es parejo ni entre videos del mismo arquetipo/estructura
        m = factor * _rhythm.get(s.get("type"), 1.0) * (0.88 if idx == 0 else 1.0) * rnd.uniform(0.9, 1.12)
        s["durationInFrames"] = max(60, min(360, int(s.get("durationInFrames", 150) * m)))

    return {
        "brand": brand, "accent": pre["accent"], "theme": pre["theme"], "seed": pre["seed"],
        "texture": texture, "bgEnergy": pre.get("bg_energy", 1.0), "rubro": rubro, "scenes": scenes,
        # ESTILO (elegible por el usuario) + FONDO + TONO + SOMBRA -> direccion de arte completa
        "style": style_id,
        "bgStyle": bg_style,
        "tone": tone,
        "shadowMode": shadow_mode,
        # SISTEMA DE FUENTES por estilo (display/text/accent) -> rompe el "Inter para todo"
        "fontDisplay": STYLE_FONTS.get(style_id, _DEFAULT_FONTS)["display"],
        "fontText": STYLE_FONTS.get(style_id, _DEFAULT_FONTS)["text"],
        "fontAccent": STYLE_FONTS.get(style_id, _DEFAULT_FONTS)["accent"],
        "images": images or [],
        "heroResource": _hero_res,
        # MOTIVO contextual del fondo segun el rubro (skyline / sparkline / vapor / pulso / botanico...)
        "motif": rubro,
        # SUSTRATO (trama de materia tenue sobre el lienzo) por rubro -> mas alma + unicidad (la frecuencia/fase es por semilla)
        "substrate": {"tech": "scanlines", "finanzas": "crosshatch", "inmobiliaria": "contour", "salud": "contour",
                      "belleza": "contour", "gastronomia": "contour", "fitness": "contour", "educacion": "dotgrid",
                      "moda": "editorialgrid"}.get(rubro, "dotgrid"),
        # forma FIRMA de la marca -> el motor la persiste como marca de agua viva en las escenas de contenido
        "signatureForm": f1,
        # metadatos de receta (como el director real)
        "hookName": pre["hook_bias"], "structure": skel,
    }


# Set de marcas de prueba DIVERSAS (rubros y nombres distintos) para el banco de tests.
TEST_BRANDS = [
    ("Verdo", "almacen de comida natural y dietetica"),
    ("Nimbus", "plataforma SaaS de automatizacion para pymes"),
    ("Sonrisa", "clinica odontologica familiar"),
    ("Trama", "marca de ropa urbana de diseno"),
    ("Altos del Sur", "inmobiliaria de propiedades premium"),
    ("Forja", "gimnasio funcional y crossfit"),
    ("Aula Viva", "academia de cursos online de programacion"),
    ("Capitalia", "fintech de inversiones para principiantes"),
    ("Aura", "spa y centro de estetica"),
    ("Vibra", "app de meditacion y bienestar mental"),
    ("DataFlow", "software de analitica de datos"),
    ("Raiz", "tienda de plantas y jardineria"),
]


if __name__ == "__main__":
    import sys, os
    out_dir = "tools/brands"
    if "--out" in sys.argv:
        out_dir = sys.argv[sys.argv.index("--out") + 1]
    os.makedirs(out_dir, exist_ok=True)
    # FOTOS de prueba (solo el banco): si existen, se pasan a todas las marcas y el decisor de recurso
    # protagonista decide por rubro si las usa (visual -> foto; abstracto -> tipo/morph). Generalas con:
    #   node tools/make-stock-photos.mjs   (deja PNGs en tools/_stock/). Sin ellas, el hero cae a tipo/morph.
    # Stock disponible por rubro (el decisor _hero_resource decide si lo usa: solo _VISUAL_RUBROS van a foto;
    # tech/finanzas/default siguen pudiendo ser tipograficos -> tener stock NO los vuelve visuales). DEDUP por
    # rubros vecinos: cada rubro tiene un archivo PRIMARIO propio (no compartido con su vecino) cuando se puede,
    # para que dos videos de rubros adyacentes no calquen la misma foto.
    _STOCK_BY_RUBRO = {
        "gastronomia": ["food.png", "interior.png"], "inmobiliaria": ["interior.png", "storefront.png"],
        "belleza": ["spa.png", "product.png"], "salud": ["spa.png", "interior.png"],
        "moda": ["product.png", "people.png"], "fitness": ["people.png", "interior.png"],
        "educacion": ["people.png", "interior.png"],
        # nuevos placeholders geometricos: primario distinto por rubro (office / screenshot / team)
        "tech": ["office.png", "screenshot.png"], "finanzas": ["screenshot.png", "team.png"],
        "default": ["team.png", "office.png"],
    }

    def _stock_for(rubro):
        return [p for p in (os.path.join("tools", "_stock", f) for f in _STOCK_BY_RUBRO.get(rubro, [])) if os.path.exists(p)]

    def _parts(tl):
        comp = next((s.get("comp") for s in tl["scenes"] if s.get("type") == "scene"), "")
        st = next((s.get("stmtStyle") for s in tl["scenes"] if s.get("type") == "statement"), "")
        ll = next((s.get("listLayout") for s in tl["scenes"] if s.get("type") == "checklist"), "")
        return comp, st, ll

    def _content_sig(tl):
        # CONTENIDO textual (numbers + CTA + reveal): dos marcas no comparten texto calcado -> mata la "colision
        # de CONTENIDO" que la similarity-probe ahora detecta (invisible al hash gris). Era el agujero del _sig.
        ns = next((tuple((i.get("prefix", ""), i.get("value"), i.get("suffix", ""), i.get("label", "")) for i in s.get("items", []))
                   for s in tl["scenes"] if s.get("type") == "numberStack"), ())
        cta = next((s.get("cta") for s in tl["scenes"] if s.get("type") == "outro"), "")
        rev = next((s.get("text") for s in tl["scenes"] if s.get("type") == "reveal"), "")
        return (ns, cta, rev)

    def _sig(tl):
        # "carta" exacta del video: hero + forma firma + layout de statement + layout de checklist + tema +
        # FRASE del statement + CONTENIDO (numbers/CTA/reveal). Incluir la FORMA evita que dos marcas del mismo
        # rubro colisionen en silueta; incluir frase+contenido evita texto calcado (Vibra/Raiz, ambas 'default').
        comp, st, ll = _parts(tl)
        stmt = next((s.get("text") for s in tl["scenes"] if s.get("type") == "statement"), "")
        return (comp, tl.get("signatureForm"), st, ll, tl.get("theme"), stmt, tuple(tl.get("structure", [])), _content_sig(tl))

    def _pair(tl):
        # arquitectura de layout (sin color/tema): hero + layout de checklist. Dos marcas con la
        # misma arquitectura se leen parecidas aunque cambie el tema (la queja Vibra/DataFlow).
        comp, _st, ll = _parts(tl)
        return (comp, ll)

    def _rf(tl):
        # (rubro, forma firma): dos marcas del MISMO rubro nunca comparten silueta (la queja Vibra/Raiz,
        # ambas default+cuadrado), aunque difieran en estructura.
        return (tl.get("rubro"), tl.get("signatureForm"))

    written, seen, seen_pair, seen_rf, seen_bg = [], set(), set(), set(), set()
    for i, (name, ind) in enumerate(TEST_BRANDS):
        # ANTI-COLISION (solo en el banco de prueba): re-roll la semilla para que las 12 marcas nunca
        # repitan carta. Intento evitar TAMBIEN la arquitectura de layout, que dos del mismo rubro
        # compartan forma, y que se REPITA la FAMILIA DE FONDO (el eje bg_system ahora la desacopla del
        # estilo -> la galeria debe lucir sistemas VARIADOS). Si en N tiros no se puede, me conformo con que
        # la carta exacta sea unica (garantia dura). En produccion cada marca se genera sola; esto es solo banco.
        # el banco muestra los 12 ESTILOS (uno por marca) -> la galeria es un showcase del catalogo elegible
        sty = STYLE_ORDER[i % len(STYLE_ORDER)]
        seed = se.stable_seed(name, ind)
        _brand_imgs = _stock_for(se.preset(ind, "", "medio", seed)["rubro"])   # fotos por rubro (visual si; abstracto no)
        tl = generate(name, ind, seed=seed, style=sty, images=_brand_imgs)
        tries, best = 0, None
        while tries < 28:
            sig_ok = _sig(tl) not in seen
            pair_ok = _pair(tl) not in seen_pair
            rf_ok = _rf(tl) not in seen_rf
            bg_ok = tl.get("bgStyle") not in seen_bg   # familia de fondo no repetida (showcase de sistemas variados)
            if sig_ok and pair_ok and rf_ok and bg_ok:
                best = None
                break
            if sig_ok and best is None:
                best = (seed, tl)  # cumple la garantia dura; lo guardo por si no logro evitar par/forma/fondo
            seed = (seed + 0x9E3779B9) & 0xFFFFFFFF
            tl = generate(name, ind, seed=seed, style=sty, images=_brand_imgs)
            tries += 1
        if best is not None and _sig(tl) in seen:
            seed, tl = best  # no se pudo evitar par/forma/fondo en N tiros -> uso la mejor carta-unica hallada
        seen.add(_sig(tl))
        seen_pair.add(_pair(tl))
        seen_rf.add(_rf(tl))
        seen_bg.add(tl.get("bgStyle"))
        slug = "".join(c for c in name.lower().replace(" ", "-") if c.isalnum() or c == "-")
        path = os.path.join(out_dir, f"{i:02d}-{slug}.json")
        json.dump(tl, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        written.append(path)
        print(f"{name:16} {tl['rubro']:13} {tl['theme']:16} {tl['accent']}  estructura={'-'.join(tl['structure'])}")
    print(f"\n{len(written)} timelines en {out_dir}/")
