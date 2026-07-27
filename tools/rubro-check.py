"""GATE del RUBRO: de que negocio es la pagina, sin pagar un LLM.

POR QUE EXISTE
El rubro elige el AIRE, o sea la direccion de arte entera: paleta, tipografia, ritmo y familia de
gestos. `tipoNegocio` lo llenaba un LLM; sin brief queda en "otro", y "otro" no esta en el mapa de
rubros, asi que cae al default TECNICO.

Medido en vivo sobre tres paginas de registros completamente distintos —mercadolibre.com.ar
(ecommerce), pentagram.com (estudio de diseño) y theverge.com (medio)— las tres salieron con el mismo
aire tecnico. Once aires escritos y el camino gratuito podia alcanzar dos. Es exactamente el defecto
de "todos los videos se ven iguales", entrando por otra puerta.

QUE PRUEBA
Las señales de paginas REALES capturadas de verdad (nav, description, schema.org), guardadas aca
adentro para que la compuerta no dependa de una carpeta de cache. Mas casos sinteticos de los rubros
que no llegue a capturar —un restaurante, una escuela, un festival— para que el vocabulario no este
ajustado solo a lo que tenia a mano.

Y prueba lo contrario, que es igual de importante: una pagina AMBIGUA tiene que devolver "otro". Un
rubro equivocado es peor que ninguno — le mete al video la direccion de arte de otro negocio, que es
justo lo que se lee como plantilla.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
from semantica_gratis import rubro_de  # noqa: E402

# Señales de paginas reales, medidas. Se guardan aca y no se leen de tools/out/ porque esa carpeta es
# cache: una compuerta que depende de un cache pasa o falla segun quien haya renderizado ultimo.
REALES = [
    ("mercadolibre.com.ar", "ecommerce", {
        "structured": {"types": ["website", "onlinestore"]},
        "description": "Comprá productos con Envío Gratis en el día en Mercado Libre Argentina.",
        "nav": ["Saltar al contenido", "Buscar /", "Mis compras P", "Carrito C", "Categorías"],
        "ctas": ["Ofertas", "Enviar a Córdoba"],
    }),
    ("pentagram.com", "portfolio", {
        "structured": {"types": ["organization"]},
        "description": "Pentagram is the world's largest independent design consultancy.",
        "nav": ["Pentagram", "Work", "About", "News", "Contact", "Archive"],
        "ctas": ["Industrial product design", "Show more", "Brand identity", "Newsletter subscribe"],
    }),
    ("theverge.com", "media", {
        "structured": {"types": ["newsmediaorganization", "website"]},
        "description": "The Verge is about technology and how it makes us feel.",
        "nav": ["Tech", "Reviews", "Science", "Entertainment", "AI", "Policy"],
        "ctas": [],
    }),
    ("stripe.com", "saas", {
        "structured": {"types": ["website", "organization"]},
        "description": "Stripe is a financial services platform that helps businesses accept payments.",
        "nav": ["Pricing", "Sign in", "Start now", "Contact sales"],
        "ctas": ["Documentation", "Developers"],
    }),
    ("linear.app", "saas", {
        "structured": {"types": []},
        "description": "Purpose-built for planning and building products with AI agents.",
        "nav": ["Customers", "Pricing", "Now", "Contact", "Docs", "Open app", "Log in"],
        "ctas": ["Sign up"],
    }),
]

# Rubros que no llegue a capturar. Los menus son los que tiene cualquier pagina de ese rubro, escritos
# sin mirar el vocabulario del clasificador — si estuvieran copiados de ahi, la prueba no probaria nada.
SINTETICOS = [
    ("parrilla de barrio", "servicio-local", {
        "structured": {"types": ["restaurant"]},
        "description": "Parrilla y cocina de barrio en Palermo desde 1998.",
        "nav": ["Inicio", "La carta", "Reservas", "Cómo llegar", "Horarios"],
        "ctas": ["Reservar una mesa", "Pedidos por WhatsApp"],
    }),
    ("gimnasio sin schema", "servicio-local", {
        "structured": {"types": []},
        "description": "Gimnasio y entrenamiento funcional.",
        "nav": ["Clases", "Horarios", "Sucursales", "Turnos", "Ubicación"],
        "ctas": ["Reservar clase"],
    }),
    ("escuela de oficios", "educacion", {
        "structured": {"types": []},
        "description": "Escuela de oficios: aprendé un trabajo en seis meses.",
        "nav": ["Cursos", "Carreras", "Inscripción", "Campus", "Alumnos"],
        "ctas": ["Inscribite ahora"],
    }),
    ("festival de musica", "evento", {
        "structured": {"types": ["musicevent"]},
        "description": "Tercera edición del festival, en el Parque Sarmiento.",
        "nav": ["Lineup", "Entradas", "Agenda", "Sede"],
        "ctas": ["Comprar entradas"],
    }),
    ("tienda sin schema", "ecommerce", {
        "structured": {"types": []},
        "description": "Tienda de zapatillas y ropa deportiva.",
        "nav": ["Productos", "Categorías", "Carrito", "Envíos", "Mis compras"],
        "ctas": ["Comprar"],
    }),
]

# Paginas que NO se pueden clasificar con lo que hay. La respuesta correcta es "otro", que manda al
# aire por defecto. Si alguna de estas devolviera un rubro, el clasificador estaria adivinando.
AMBIGUAS = [
    ("pagina vacia", {}),
    ("solo un titulo", {"description": "", "title": "Bienvenidos", "nav": [], "structured": {}}),
    ("menu generico", {"description": "Somos una empresa.", "nav": ["Inicio", "Nosotros", "Contacto"],
                       "structured": {"types": []}, "ctas": []}),
    # Una senal de cada lado y ninguna que mande: tiene que ganar la duda, no el azar.
    ("empatada", {"description": "Plataforma para tiendas.", "nav": ["Pricing", "Carrito"],
                  "structured": {"types": []}, "ctas": []}),
]

fallos = []
for nombre, esperado, content in REALES + SINTETICOS:
    r = rubro_de(content)
    if r != esperado:
        fallos.append(f"E-RUBRO  {nombre}: dio \"{r}\" y es \"{esperado}\"")
for nombre, content in AMBIGUAS:
    r = rubro_de(content)
    if r != "otro":
        fallos.append(f"E-RUBRO-ADIVINA  {nombre}: no hay evidencia y devolvio \"{r}\" en vez de \"otro\"")

if fallos:
    print(f"RUBRO: {len(fallos)} FALLO(S)")
    for f in fallos:
        print("  " + f)
    sys.exit(1)
print(f"RUBRO OK — {len(REALES)} paginas reales medidas + {len(SINTETICOS)} rubros sinteticos "
      f"+ {len(AMBIGUAS)} ambiguas que tienen que caer en \"otro\".")
