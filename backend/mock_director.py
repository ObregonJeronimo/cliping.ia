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
_HERO_LAYOUT = {
    "emblem":       dict(sx=202, sy=286, sr=108, nx=202, ny=486, nsz=52, al="center", bx=202, by=522, sop=1.0, orb=True,  ns=2.0, maxW=348),
    "sideLeft":     dict(sx=112, sy=322, sr=82,  nx=212, ny=300, nsz=46, al="left",   bx=212, by=350, sop=1.0, orb=False, ns=2.0, maxW=178),
    "typeHero":     dict(sx=150, sy=232, sr=54,  nx=202, ny=330, nsz=80, al="center", bx=202, by=408, sop=1.0, orb=True,  ns=1.3, maxW=372),
    "shapeBehind":  dict(sx=250, sy=288, sr=150, nx=176, ny=372, nsz=56, al="left",   bx=176, by=452, sop=0.5, orb=False, ns=2.0, maxW=210),
    "topAnchor":    dict(sx=202, sy=224, sr=92,  nx=202, ny=486, nsz=52, al="center", bx=202, by=522, sop=1.0, orb=True,  ns=2.2, maxW=348),
    "cornerAnchor": dict(sx=318, sy=150, sr=60,  nx=44,  ny=470, nsz=58, al="left",   bx=44,  by=512, sop=1.0, orb=True,  ns=1.8, maxW=320),
    "diagonal":     dict(sx=104, sy=540, sr=104, nx=360, ny=250, nsz=52, al="right",  bx=360, by=300, sop=1.0, orb=True,  ns=1.8, maxW=300),
    # typeSlam: NOMBRE gigante protagonista, la forma reducida a un acento minimo arriba (no figurita
    # flotante de stock) -> tipografia como heroe, look editorial premium.
    "typeSlam":     dict(sx=330, sy=140, sr=22,  nx=202, ny=372, nsz=104, al="center", bx=202, by=470, sop=1.0, orb=False, ns=0.85, maxW=384),
}
# El frame de cierre (outro) hereda la personalidad del hero: cada composicion su CTA.
_OUTRO_BY_COMP = {"emblem": "center", "sideLeft": "left", "typeHero": "bigtype", "shapeBehind": "center",
                  "topAnchor": "bar", "cornerAnchor": "left", "diagonal": "bar", "typeSlam": "bigtype"}


def _hero_scene(brand, rubro, accent_light, rnd, comp, blur, f1, f2):
    """HERO con COMPOSICION variable (no siempre forma-centrada): la forma FIRMA del rubro (f1, elegida en
    generate y guardada en la marca) aparece YA en el arranque (t=0.42) y el morph la usa para un flourish
    corto + pulso/rotacion. f2 = excursion breve. blur/saturacion vienen de la energia del rubro."""
    fx = RUBRO_FX.get(rubro, RUBRO_FX["default"])
    ease_in = rnd.choice(["outBack", "outElastic"])
    sub = "  ".join(rnd.choice(SUBTITLES.get(rubro, SUBTITLES["default"])))
    L = _HERO_LAYOUT[comp]
    # jitter determinista de la posicion de la forma (+-16px) -> dos marcas con el mismo comp no calcan el frame
    jx, jy = rnd.randint(-16, 16), rnd.randint(-16, 16)
    sx, sy, sr, sop, ns = L["sx"] + jx, L["sy"] + jy, L["sr"], L["sop"], L["ns"]
    els = [
        {"kind": "morph", "fill": accent_light, "blur": blur, "keys": [
            {"t": 0.0, "form": "circle", "r": round(sr * 0.1, 1), "opacity": 0, "x": sx, "y": sy},
            {"t": 0.42, "form": f1, "r": round(sr * 0.52, 1), "opacity": sop, "x": sx, "y": sy, "ease": ease_in},
            {"t": 1.1, "form": f2, "r": round(sr * 0.84, 1), "opacity": sop, "x": sx, "y": sy, "rot": 7, "ease": "inOutCubic"},
            {"t": 2.0, "form": f1, "r": round(sr * 0.96, 1), "opacity": sop, "x": sx, "y": sy, "rot": -6, "ease": "inOutCubic"},
            {"t": 3.2, "form": f1, "r": sr, "opacity": sop, "x": sx, "y": sy, "rot": -11, "ease": "inOutCubic"},
            {"t": 4.6, "form": f1, "r": round(sr * 1.07, 1), "opacity": sop, "x": sx, "y": sy, "rot": 2, "ease": "inOutCubic"},
            {"t": 7.0, "form": f1, "r": sr, "opacity": sop, "x": sx, "y": sy, "rot": 13, "ease": "inOutCubic"},
        ]},
        {"kind": "particles", "count": fx["pc"], "spread": round(sr * fx["ps"], 1), "phase": round(rnd.uniform(0, 6.28), 2), "dotR": fx["dr"], "keys": [
            {"t": 1.2, "x": sx, "y": sy, "burst": 0}, {"t": 2.1, "x": sx, "y": sy, "burst": 1}]},
        {"kind": "text", "text": brand, "fill": "ink", "size": L["nsz"], "weight": 800, "align": L["al"], "maxW": L.get("maxW", 348), "kinetic": True, "keys": [
            {"t": ns, "opacity": 1, "x": L["nx"], "y": L["ny"]}]},
        {"kind": "text", "text": sub, "fill": "dim", "size": max(20, min(30, round(L["nsz"] * 0.42))), "weight": 600, "align": L["al"], "maxW": min(300, L.get("maxW", 300)), "keys": [
            {"t": ns + 0.9, "opacity": 0, "x": L["bx"], "y": L["by"] + 14},
            {"t": ns + 1.4, "opacity": 1, "x": L["bx"], "y": L["by"], "ease": "outCubic"}]},
    ]
    if L["orb"]:
        els.insert(1, {"kind": "orbit", "count": fx["od"], "r": round(sr * 1.42, 1), "speed": fx["osp"], "fill": "accent2", "dotR": max(5, fx["dr"] + 2), "keys": [
            {"t": 1.6, "x": sx, "y": sy, "opacity": 0}, {"t": 2.3, "x": sx, "y": sy, "opacity": 0.9, "ease": "outCubic"}]})
    return {"type": "scene", "durationInFrames": 210, "elements": els, "comp": comp}


def _statement(rubro, rnd, stmt_style="centered"):
    return {"type": "statement", "text": rnd.choice(STATEMENTS.get(rubro, STATEMENTS["default"])),
            "stmtStyle": stmt_style, "durationInFrames": 150}


def _checklist(brand, rubro, rnd, list_style, list_anchor="center", list_layout="rows"):
    pool = BENEFITS.get(rubro, BENEFITS["default"])[:]
    rnd.shuffle(pool)
    n = 4 if list_layout == "grid" else rnd.choice([3, 3, 4])
    return {"type": "checklist", "title": f"Por que {brand}", "items": pool[:n], "listStyle": list_style,
            "listAnchor": list_anchor, "listLayout": list_layout, "durationInFrames": 174 + (n - 3) * 12}


def _outro(brand, rubro, rnd, outro_comp):
    return {"type": "outro", "brand": brand, "cta": rnd.choice(CTAS.get(rubro, CTAS["default"])),
            "outroComp": outro_comp, "durationInFrames": 150}


def _bigstat(facts, rnd):
    if not facts:
        return None
    for f in facts:
        if isinstance(f, dict) and f.get("value") is not None:
            return {"type": "bigStat", "value": f["value"], "prefix": f.get("prefix", ""), "suffix": f.get("suffix", ""),
                    "label": f.get("label", ""), "durationInFrames": 150}
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


def generate(brand: str, industria: str, facts=None, seed: int = None) -> dict:
    """Marca + rubro -> timeline COMPLETO (imita al LLM, determinista). Para test y fallback offline."""
    if seed is None:
        seed = se.stable_seed(brand, industria)
    pre = se.preset(industria, "", "medio", seed)
    rubro = pre["rubro"]
    rnd = random.Random((int(seed) ^ 0x9E3779B9) & 0xFFFFFFFF)

    st = RUBRO_STYLE.get(rubro, RUBRO_STYLE["default"])
    tone = pre.get("tone", "dark")
    # color + dureza de la forma firma derivan de la energia del rubro Y del tono del fondo
    accent_light, shape_blur = _shape_paint(pre["accent"], rubro, tone)
    # La COMPOSICION del hero define la "personalidad" del video y se PROPAGA al resto (alineacion + CTA)
    # -> dos marcas con hero distinto divergen en TODOS los frames, no solo el del hero.
    comp = rnd.choice(HERO_COMP.get(rubro, HERO_COMP["default"]))
    # forma FIRMA de la marca (de la familia del rubro): se elige aca para poder GUARDARLA en la marca y
    # persistirla como marca de agua durante el bloque de contenido (asi la identidad no muere a mitad de reel).
    forms = st["forms"][:]
    rnd.shuffle(forms)
    f1, f2 = forms[0], (forms[1] if len(forms) > 1 else forms[0])
    # statement/lista heredan la columna izquierda de los heros anclados a la izquierda; el resto VARIA por
    # semilla (centrado/comilla/panel) para no leer plantilla.
    left_anchored = comp in ("sideLeft", "cornerAnchor")
    stmt_style = rnd.choice(["left", "editorial"]) if left_anchored else rnd.choice(["centered", "quote", "panel", "editorial"])
    list_anchor = "left" if left_anchored else "center"
    list_layout = rnd.choice(["rows", "rows", "grid"])   # favorecer filas editoriales sobre la grilla tipo "checklist SaaS"
    outro_comp = _OUTRO_BY_COMP.get(comp, "center")
    skel = rnd.choice(RUBRO_STRUCT.get(rubro, RUBRO_STRUCT["default"]))
    scenes = []
    for slot in skel:
        if slot == "hero":
            scenes.append(_hero_scene(brand, rubro, accent_light, rnd, comp, shape_blur, f1, f2))
        elif slot == "statement":
            scenes.append(_statement(rubro, rnd, stmt_style))
        elif slot == "checklist":
            scenes.append(_checklist(brand, rubro, rnd, st["listStyle"], list_anchor, list_layout))
        elif slot == "bigStat":
            bs = _bigstat(facts, rnd)
            scenes.append(bs if bs else _statement(rubro, rnd, stmt_style))
        elif slot == "outro":
            scenes.append(_outro(brand, rubro, rnd, outro_comp))

    # RITMO por rubro: energia alta (tech/fitness) -> escenas mas cortas (cortes rapidos); baja
    # (salud/inmobiliaria) -> mas largas (respiracion). Asi el video no corre el mismo tempo en todos.
    energy = pre.get("bg_energy", 1.0)
    factor = max(0.78, min(1.22, 1.0 - (energy - 1.0) * 0.45))
    # RITMO con contraste: statements/dato punchy, hero respira -> el video no corre a tempo plano. Ademas
    # el PRIMER beat arranca mas rapido (hook -> frena el scroll del publico objetivo del link).
    _rhythm = {"statement": 0.9, "bigStat": 0.94, "scene": 1.06, "checklist": 1.0, "outro": 0.95}
    for idx, s in enumerate(scenes):
        m = factor * _rhythm.get(s.get("type"), 1.0) * (0.88 if idx == 0 else 1.0)
        s["durationInFrames"] = max(60, min(360, int(s.get("durationInFrames", 150) * m)))

    return {
        "brand": brand, "accent": pre["accent"], "theme": pre["theme"], "seed": pre["seed"],
        "texture": st["texture"], "bgEnergy": pre.get("bg_energy", 1.0), "rubro": rubro, "scenes": scenes,
        # estilo de FONDO + TONO de la marca -> cada video en un mundo distinto (oscuro o editorial claro)
        "bgStyle": pre.get("bg_style", "mesh"),
        "tone": tone,
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

    def _parts(tl):
        comp = next((s.get("comp") for s in tl["scenes"] if s.get("type") == "scene"), "")
        st = next((s.get("stmtStyle") for s in tl["scenes"] if s.get("type") == "statement"), "")
        ll = next((s.get("listLayout") for s in tl["scenes"] if s.get("type") == "checklist"), "")
        return comp, st, ll

    def _sig(tl):
        # "carta" exacta del video: hero + forma firma + layout de statement + layout de checklist + tema +
        # FRASE del statement. Incluir la FORMA evita que dos marcas del mismo rubro (ej Nimbus/DataFlow,
        # ambas tech, mismo rango de azul) colisionen en color Y silueta; incluir la frase evita texto calcado.
        comp, st, ll = _parts(tl)
        stmt = next((s.get("text") for s in tl["scenes"] if s.get("type") == "statement"), "")
        return (comp, tl.get("signatureForm"), st, ll, tl.get("theme"), stmt)

    def _pair(tl):
        # arquitectura de layout (sin color/tema): hero + layout de checklist. Dos marcas con la
        # misma arquitectura se leen parecidas aunque cambie el tema (la queja Vibra/DataFlow).
        comp, _st, ll = _parts(tl)
        return (comp, ll)

    def _rf(tl):
        # (rubro, forma firma): dos marcas del MISMO rubro nunca comparten silueta (la queja Vibra/Raiz,
        # ambas default+cuadrado), aunque difieran en estructura.
        return (tl.get("rubro"), tl.get("signatureForm"))

    written, seen, seen_pair, seen_rf = [], set(), set(), set()
    for i, (name, ind) in enumerate(TEST_BRANDS):
        # ANTI-COLISION (solo en el banco de prueba): re-roll la semilla para que las 12 marcas nunca
        # repitan carta. Intento evitar TAMBIEN la arquitectura de layout y que dos del mismo rubro
        # compartan forma; si en N tiros no se puede, me conformo con que la carta exacta sea unica
        # (garantia dura). En produccion cada marca se genera sola; esto es solo para la galeria de prueba.
        seed = se.stable_seed(name, ind)
        tl = generate(name, ind, seed=seed)
        tries, best = 0, None
        while tries < 20:
            sig_ok = _sig(tl) not in seen
            pair_ok = _pair(tl) not in seen_pair
            rf_ok = _rf(tl) not in seen_rf
            if sig_ok and pair_ok and rf_ok:
                best = None
                break
            if sig_ok and best is None:
                best = (seed, tl)  # cumple la garantia dura; lo guardo por si no logro evitar par/forma
            seed = (seed + 0x9E3779B9) & 0xFFFFFFFF
            tl = generate(name, ind, seed=seed)
            tries += 1
        if best is not None and _sig(tl) in seen:
            seed, tl = best  # no se pudo evitar par/forma en N tiros -> uso la mejor carta-unica hallada
        seen.add(_sig(tl))
        seen_pair.add(_pair(tl))
        seen_rf.add(_rf(tl))
        slug = "".join(c for c in name.lower().replace(" ", "-") if c.isalnum() or c == "-")
        path = os.path.join(out_dir, f"{i:02d}-{slug}.json")
        json.dump(tl, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        written.append(path)
        print(f"{name:16} {tl['rubro']:13} {tl['theme']:16} {tl['accent']}  estructura={'-'.join(tl['structure'])}")
    print(f"\n{len(written)} timelines en {out_dir}/")
