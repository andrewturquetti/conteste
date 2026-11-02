"""
CONTESTE.INFO - Validador do data/oportunidades.json (Python puro).

Verifica campos obrigatorios, categorias validas, status validos, formato de
datas e presenca de link oficial. Retorna codigo de saida 1 se houver erros
(util para uso manual antes de commitar).

Uso: python scripts/validar_oportunidades.py
"""
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "oportunidades.json"

CATEGORIES = {"cultura", "educacao", "esportes", "trabalho"}
STATUS = {"open", "closed", "continuous", "coming_soon", "extended"}
REQUIRED = ["id", "category", "title", "short_description", "official_link",
            "source_name", "status", "published_date"]
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def main() -> int:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    items = data.get("opportunities", [])
    errors = []
    seen_ids = set()

    for idx, item in enumerate(items, start=1):
        ref = item.get("id") or f"#{idx}"
        for field in REQUIRED:
            if not item.get(field):
                errors.append(f"[{ref}] campo obrigatorio ausente: {field}")
        if item.get("category") not in CATEGORIES:
            errors.append(f"[{ref}] categoria invalida: {item.get('category')}")
        if item.get("status") not in STATUS:
            errors.append(f"[{ref}] status invalido: {item.get('status')}")
        link = item.get("official_link", "")
        if link and not link.startswith(("http://", "https://")):
            errors.append(f"[{ref}] official_link invalido: {link}")
        for dfield in ("published_date", "deadline_date"):
            val = item.get(dfield)
            if val and not DATE_RE.match(val):
                errors.append(f"[{ref}] {dfield} fora do formato AAAA-MM-DD: {val}")
        if "image_url" in item:
            errors.append(f"[{ref}] campo image_url nao deve existir (site sem imagens)")
        if item.get("id") in seen_ids:
            errors.append(f"[{ref}] id duplicado")
        seen_ids.add(item.get("id"))

    print(f"Itens: {len(items)}")
    if errors:
        print(f"ERROS: {len(errors)}")
        for e in errors:
            print("  -", e)
        return 1
    print("OK - nenhum problema encontrado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
