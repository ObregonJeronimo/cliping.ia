"""
Sistema de debug centralizado para cliping.ia
Genera un reporte completo de cada video generado.
"""
import json
import time
from pathlib import Path
from datetime import datetime

OUTPUTS_DIR = Path("outputs")
DEBUG_DIR = Path("debug_reports")
DEBUG_DIR.mkdir(exist_ok=True)

class VideoDebugger:
    def __init__(self, job_id: str, url: str, action: str):
        self.job_id = job_id
        self.url = url
        self.action = action
        self.start_time = time.time()
        self.steps = []
        self.data = {}
        self.errors = []
        self.report_path = DEBUG_DIR / f"{job_id}_debug.json"

    def log(self, step: str, detail: str, data: dict = None, level: str = "info"):
        elapsed = round(time.time() - self.start_time, 2)
        entry = {
            "t": elapsed,
            "step": step,
            "detail": detail,
            "level": level,
        }
        if data:
            entry["data"] = data
        self.steps.append(entry)
        icon = {"info": "→", "ok": "✓", "warn": "⚠", "error": "✗"}.get(level, "→")
        print(f"[debug {elapsed:6.1f}s] {icon} {step}: {detail}")
        self._save()

    def set_page_data(self, page_data: dict):
        self.data["page_data"] = page_data
        self.log("page_analysis", f"Extraído: {page_data.get('siteName')} | {page_data.get('pageType')} | {page_data.get('primaryColor')}", {
            "headline": page_data.get("headline"),
            "problem": page_data.get("problem"),
            "audience": page_data.get("audience"),
            "benefits_count": len(page_data.get("benefits", [])),
            "has_numbers": bool(page_data.get("numbers")),
            "has_guarantee": bool(page_data.get("guarantee")),
            "emotion": page_data.get("emotion"),
        }, "ok")

    def set_variation(self, video_context: dict):
        self.data["variation"] = {
            "visual_style": video_context.get("visual_style"),
            "narrative": video_context.get("narrative"),
            "hook": video_context.get("hook"),
            "tone": video_context.get("tone"),
            "anim_techniques": video_context.get("anim_techniques"),
        }
        self.log("variation", f"style={video_context.get('visual_style')} narrative={video_context.get('narrative')} hook={video_context.get('hook')} tone={video_context.get('tone')}", level="ok")

    def set_animation_selection(self, selection: dict):
        self.data["animation_selection"] = selection
        scenes = {k: v.get("animation") for k, v in selection.items() if k != "reasoning"}
        self.log("animations", f"Claude eligió: {scenes}", {
            "reasoning": selection.get("reasoning", ""),
            "scenes": scenes,
        }, "ok")

    def set_render_result(self, success: bool, output_path: Path = None, error: str = None, duration_s: float = 0):
        self.data["render"] = {
            "success": success,
            "output": str(output_path) if output_path else None,
            "error": error,
            "render_duration_s": round(time.time() - self.start_time, 1),
        }
        if success and output_path:
            size_kb = output_path.stat().st_size // 1024 if output_path.exists() else 0
            self.log("render", f"OK — {output_path.name} ({size_kb}KB, {duration_s:.1f}s video)", level="ok")
        else:
            self.log("render", f"FALLÓ: {error}", level="error")
            self.errors.append(error)

    def set_voice(self, script: str, voice: str, duration: float):
        self.data["voice"] = {"script": script, "voice": voice, "video_duration": duration}
        words = len(script.split())
        self.log("voice", f"{voice} | {words} palabras para {duration:.1f}s de video", level="ok")

    def set_final(self, output_path: Path):
        total = round(time.time() - self.start_time, 1)
        self.data["final"] = {
            "output": str(output_path),
            "total_time_s": total,
            "errors": self.errors,
        }
        size_kb = output_path.stat().st_size // 1024 if output_path.exists() else 0
        self.log("final", f"Video listo en {total}s — {output_path.name} ({size_kb}KB)", level="ok")
        self._save()
        self._print_summary()

    def _save(self):
        report = {
            "job_id": self.job_id,
            "url": self.url,
            "action": self.action,
            "timestamp": datetime.now().isoformat(),
            "steps": self.steps,
            "data": self.data,
            "errors": self.errors,
        }
        self.report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    def _print_summary(self):
        total = round(time.time() - self.start_time, 1)
        print(f"\n{'='*60}")
        print(f"RESUMEN DEL VIDEO — {self.job_id[:8]}")
        print(f"{'='*60}")
        pd = self.data.get("page_data", {})
        print(f"  Sitio:     {pd.get('siteName')} ({pd.get('pageType')})")
        print(f"  Color:     {pd.get('primaryColor')}")
        print(f"  Headline:  {pd.get('headline','')[:50]}")
        print(f"  Problema:  {pd.get('problem','')[:50]}")
        anim = self.data.get("animation_selection", {})
        print(f"  Animaciones:")
        for scene in ["hook_a","hook_b","product_a","product_b","benefits_a","benefits_b","benefits_c","cta_a","cta_b","outro"]:
            a = anim.get(scene, {}).get("animation","?")
            if a != "?":
                print(f"    {scene:12}: {a}")
        render = self.data.get("render", {})
        print(f"  Render:    {'OK' if render.get('success') else 'FALLÓ'} en {render.get('render_duration_s')}s")
        print(f"  Total:     {total}s")
        if self.errors:
            print(f"  Errores:   {self.errors}")
        print(f"  Report:    {self.report_path}")
        print(f"{'='*60}\n")
