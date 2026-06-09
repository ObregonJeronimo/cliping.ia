"""
timeline_director.py — arma los archivos de render para el MOTOR NUEVO (animaciones por timeline).

Espejo de template_director.build_video_files, pero apunta a la composicion Canvas (TimelineVideo),
que reusa el MISMO nucleo de animacion (engineCore) que el preview en vivo del sidebar.

Por ahora el timeline esta horneado en el nucleo (la demo); cuando la IA lo escriba desde la URL,
se pasa por defaultProps={{ timeline }} y el nucleo lo consume. El render es determinista (sin IA
generativa): el costo es $0; solo paga la futura llamada al LLM que escriba el timeline.
"""
import json
from pathlib import Path

# Root que registra la composicion Canvas. TimelineVideo vive en remotion/src/compositions/.
TIMELINE_ROOT_TEMPLATE = """import { Composition } from 'remotion'
import TimelineVideo from './compositions/TimelineVideo'

const TIMELINE = __TIMELINE_JSON__

export const RemotionRoot = () => (
  <Composition
    id="__COMPID__"
    component={TimelineVideo}
    durationInFrames={__TOTAL__}
    fps={30}
    width={__WIDTH__}
    height={__HEIGHT__}
    defaultProps={{ timeline: TIMELINE }}
  />
)
"""

TIMELINE_ENTRY_TEMPLATE = """import { registerRoot } from 'remotion'
import { RemotionRoot } from './src/__ROOT_FILE__'
registerRoot(RemotionRoot)
"""

FORMATS = {"vertical": (1080, 1920), "square": (1080, 1080), "wide": (1920, 1080)}

# Duracion de la demo horneada (engineCore: ~21.4s a 30fps). Cuando el timeline venga en datos,
# se usa timeline["durationInFrames"].
DEMO_FRAMES = 642


def build_timeline_files(job_id: str, timeline: dict, remotion_dir, fmt: str = "vertical"):
    """Escribe el Root + entry que renderizan el timeline con TimelineVideo.
    Devuelve (entry_file, comp_id, total_frames, temp_files)."""
    remotion_dir = Path(remotion_dir)
    short = job_id[:8]
    comp_id = f"TimelineVideo-{short}"
    scenes = (timeline or {}).get("scenes") or []
    if scenes:
        total = int(sum(max(30, int(s.get("durationInFrames") or 120)) for s in scenes))
    else:
        total = int((timeline or {}).get("durationInFrames") or DEMO_FRAMES)
    w, h = FORMATS.get(fmt, FORMATS["vertical"])
    temp_files = []

    root_src = (TIMELINE_ROOT_TEMPLATE
                .replace("__TIMELINE_JSON__", json.dumps(timeline or {}, ensure_ascii=False))
                .replace("__TOTAL__", str(total))
                .replace("__COMPID__", comp_id)
                .replace("__WIDTH__", str(w))
                .replace("__HEIGHT__", str(h)))
    root_file = f"Root_tl_{short}.jsx"
    (remotion_dir / "src" / root_file).write_text(root_src, encoding="utf-8")
    temp_files.append(remotion_dir / "src" / root_file)

    entry_src = TIMELINE_ENTRY_TEMPLATE.replace("__ROOT_FILE__", root_file)
    entry_file = f"index_tl_{short}.jsx"
    (remotion_dir / entry_file).write_text(entry_src, encoding="utf-8")
    temp_files.append(remotion_dir / entry_file)

    return entry_file, comp_id, total, temp_files
