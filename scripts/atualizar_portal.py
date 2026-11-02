"""
CONTESTE.INFO - Atualizador do portal (Python puro, sem dependencias externas).

Responsavel pela integridade da base acumulativa data/oportunidades.json:
  - migra o schema (adiciona published_date / first_seen_date / last_seen_date
    e remove image_url);
  - mescla um lote de novas oportunidades (--batch arquivo.json), deduplicando
    por id e por official_link;
  - expira oportunidades cujo prazo ja passou (status open -> closed);
  - regenera o sitemap.xml.

Uso:
  python scripts/atualizar_portal.py                    # manutencao (migra + expira + sitemap)
  python scripts/atualizar_portal.py --batch lote.json  # mescla lote e depois faz a manutencao

Fluxo sob demanda: sempre que novas oportunidades forem curadas, grave um lote
JSON em data/lotes/AAAA-MM-DD.json e rode este script. Depois rode
scripts/gerar-conteudo-diario.py para gerar relatorio e legendas.
"""
import argparse
import json
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path

# Console do Windows usa cp1252 e quebra em print() com acento; forcar UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "oportunidades.json"
SITEMAP_FILE = ROOT / "sitemap.xml"
BASE_URL = "https://conteste.info"
TODAY = date.today().isoformat()
NOW = datetime.now().strftime("%Y-%m-%dT%H:%M:%S-03:00")

CATEGORIES = ["cultura", "educacao", "esportes", "trabalho"]
VALID_STATUS = ["open", "closed", "continuous", "coming_soon", "extended"]
REQUIRED_FIELDS = [
    "id", "category", "title", "short_description",
    "official_link", "source_name", "status",
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "oportunidade"


def load_master() -> dict:
    if DATA_FILE.exists():
        with open(DATA_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"generated_at": NOW, "opportunities": []}


def save_master(data: dict) -> None:
    data["generated_at"] = NOW
    data["opportunities"].sort(
        key=lambda i: (i.get("published_date") or "", i.get("title") or ""), reverse=True
    )
    counts = {c: 0 for c in CATEGORIES}
    for item in data["opportunities"]:
        if item.get("category") in counts:
            counts[item["category"]] += 1
    data["total"] = len(data["opportunities"])
    data["counts"] = counts
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def normalize_item(item: dict) -> dict:
    """Garante o schema novo e remove a dependencia de imagem."""
    item = dict(item)
    item.pop("image_url", None)
    item["id"] = item.get("id") or slugify(item.get("title", ""))
    pub = (item.get("published_date") or item.get("created_at") or NOW)[:10]
    item["published_date"] = pub
    item["first_seen_date"] = item.get("first_seen_date") or pub
    item["last_seen_date"] = TODAY
    item["created_at"] = item.get("created_at") or NOW
    item["updated_at"] = NOW
    item["verified_at"] = item.get("verified_at") or NOW
    item["status"] = item.get("status") or "open"
    item["reliability_level"] = item.get("reliability_level") or "B"
    item["tags"] = item.get("tags") or [item["category"]]
    return item


def migrate(data: dict) -> int:
    changed = 0
    for i, item in enumerate(data["opportunities"]):
        new = normalize_item(item)
        if new != item:
            changed += 1
        data["opportunities"][i] = new
    return changed


def expire(data: dict) -> int:
    expired = 0
    for item in data["opportunities"]:
        dd = item.get("deadline_date")
        if dd and dd < TODAY and item.get("status") in ("open", "extended"):
            item["status"] = "closed"
            item["updated_at"] = NOW
            expired += 1
    return expired



def merge_batch(data: dict, batch_path: Path) -> tuple:
    with open(batch_path, encoding="utf-8") as f:
        batch = json.load(f)
    items = batch.get("opportunities", batch) if isinstance(batch, dict) else batch

    by_id = {i["id"]: i for i in data["opportunities"]}
    by_link = {i.get("official_link"): i for i in data["opportunities"] if i.get("official_link")}
    added = updated = 0

    for raw in items:
        item = normalize_item(raw)
        existing = by_id.get(item["id"]) or by_link.get(item.get("official_link"))
        if existing:
            keep_pub = existing.get("published_date")
            keep_first = existing.get("first_seen_date")
            existing.update(item)
            existing["published_date"] = keep_pub or item["published_date"]
            existing["first_seen_date"] = keep_first or item["first_seen_date"]
            updated += 1
        else:
            data["opportunities"].append(item)
            by_id[item["id"]] = item
            if item.get("official_link"):
                by_link[item["official_link"]] = item
            added += 1
    return added, updated


def rebuild_sitemap() -> None:
    pages = [("", "1.0"), ("cultura.html", "0.8"), ("educacao.html", "0.8"),
             ("esportes.html", "0.8"), ("trabalho.html", "0.8")]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, prio in pages:
        lines += ["    <url>", f"        <loc>{BASE_URL}/{path}</loc>",
                  "        <changefreq>daily</changefreq>",
                  f"        <priority>{prio}</priority>", "    </url>"]
    lines.append("</urlset>")
    SITEMAP_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="Atualiza a base do CONTESTE.INFO")
    ap.add_argument("--batch", help="Arquivo JSON com o lote de novas oportunidades")
    args = ap.parse_args()

    print(f"CONTESTE.INFO - Atualizador do portal ({TODAY})")
    print("=" * 60)

    data = load_master()

    if args.batch:
        added, updated = merge_batch(data, Path(args.batch))
        print(f"Mesclagem: {added} nova(s), {updated} atualizada(s)")

    migrated = migrate(data)
    print(f"Migracao de schema: {migrated} item(ns) ajustado(s)")

    expired = expire(data)
    print(f"Expiracao: {expired} oportunidade(s) encerrada(s)")

    save_master(data)
    rebuild_sitemap()
    print(f"Total na base: {data['total']} oportunidades")
    for c in CATEGORIES:
        print(f"   {c}: {data['counts'][c]}")
    print("OK - base e sitemap atualizados.")


if __name__ == "__main__":
    main()
