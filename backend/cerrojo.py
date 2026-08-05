# -*- coding: utf-8 -*-
"""EL CERROJO DE TRABAJO PESADO, del lado de Python. Es el MISMO archivo que usa `tools/lib/cerrojo.mjs`.

Existe por el cuelgue del 4 de agosto de 2026: habia un `gates:guard` corriendo en segundo plano y
encima se lanzaron renders de `motor.py`. Los dos levantan Chromium con SwiftShader, los dos son
legitimos, y ninguno sabia del otro. La regla estaba escrita en el CLAUDE.md —*"Nunca correr dos guards
a la vez"*— y se rompio igual, porque una regla escrita en un documento la cumple quien la leyo.

Tiene que ser el mismo archivo que el lado JS: un cerrojo por lenguaje no es un cerrojo, son dos
puertas a la misma habitacion. Por eso el formato es JSON con `pid`, y por eso el pid se comprueba: un
cerrojo huerfano —se colgo la maquina, se cerro la terminal— que hay que borrar a mano es una molestia
que se termina desactivando.
"""
import atexit
import json
import os
import signal
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVO = os.path.join(RAIZ, "tools", "out", ".pesado.lock")


def _vive(pid):
    if not pid:
        return False
    if os.name == "nt":
        # En Windows no hay signal 0: se pregunta por la tabla de procesos.
        import subprocess
        try:
            r = subprocess.run(["tasklist", "/FI", "PID eq %d" % pid, "/NH"],
                               capture_output=True, text=True, timeout=10)
            return str(pid) in (r.stdout or "")
        except Exception:
            return True                      # ante la duda, NO pisar un cerrojo ajeno
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def tomar(quien):
    """Devuelve None si se tomo, o el dict del dueño si esta ocupado."""
    os.makedirs(os.path.dirname(ARCHIVO), exist_ok=True)
    if os.path.exists(ARCHIVO):
        try:
            with open(ARCHIVO, "r", encoding="utf8") as f:
                d = json.load(f)
            if _vive(d.get("pid")):
                return d
        except Exception:
            pass                              # ilegible = huerfano
    import datetime
    with open(ARCHIVO, "w", encoding="utf8") as f:
        json.dump({"pid": os.getpid(), "quien": quien,
                   "desde": datetime.datetime.now().isoformat(timespec="seconds")}, f)

    def soltar(*_):
        try:
            with open(ARCHIVO, "r", encoding="utf8") as f:
                if json.load(f).get("pid") == os.getpid():
                    os.remove(ARCHIVO)
        except Exception:
            pass

    atexit.register(soltar)
    for s in (signal.SIGINT, signal.SIGTERM):
        try:
            previo = signal.getsignal(s)

            def _mano(sig, frame, _p=previo):
                soltar()
                if callable(_p):
                    _p(sig, frame)
                sys.exit(130)
            signal.signal(s, _mano)
        except Exception:
            pass
    return None


def exigir(quien):
    """Toma el cerrojo o corta el programa explicando quien lo tiene.

    Si ya venimos corriendo dentro de `npm run pesado`, la red esta puesta y el cerrojo TOMADO por el
    envoltorio: volver a pedirlo es chocar contra uno mismo. Paso de verdad — un render lanzado con
    `pesado` se negaba a arrancar citando su propio cerrojo.
    """
    if os.environ.get("PESADO_ACTIVO"):
        return
    dueno = tomar(quien)
    if dueno:
        print('NO ARRANCA: "%s" (pid %s) tiene el cerrojo desde %s.'
              % (dueno.get("quien"), dueno.get("pid"), dueno.get("desde")), file=sys.stderr)
        print("Dos corridas pesadas a la vez es lo que cuelga la maquina. Espera a que termine.",
              file=sys.stderr)
        sys.exit(2)
