"""
Gera o pacote diario do CONTESTE.INFO a partir de data/oportunidades.json:
1) relatorios/AAAA-MM-DD.md      -> rascunho pronto para colar no Buttondown
2) publicacoes/AAAA-MM-DD/       -> 1 imagem + 1 legenda .txt por oportunidade (Instagram/redes)

Uso: python scripts/gerar-conteudo-diario.py
Reexecute sempre que data/oportunidades.json for atualizado com uma nova pesquisa.
"""
import json
import os
import re
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, "data", "oportunidades.json")
TODAY = date.today().isoformat()

CATEGORY_LABEL = {"cultura": "Cultura", "educacao": "Educação", "esportes": "Esportes", "trabalho": "Trabalho"}
CATEGORY_TAG = {"cultura": "#Cultura", "educacao": "#Educação", "esportes": "#Esportes", "trabalho": "#Trabalho"}
HASHTAGS_BASE = "#ContesteInfo #InscriçõesAbertas #Oportunidades"


def load_opportunities():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)["opportunities"]


def download_image(url, dest_path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        ext = os.path.splitext(url.split("?")[0])[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"):
            ext = ".jpg"
        path = dest_path + ext
        with open(path, "wb") as out:
            out.write(resp.read())
        return os.path.basename(path)


def build_caption(item):
    lines = [
        f"{CATEGORY_TAG[item['category']]} | INSCRIÇÕES ABERTAS",
        "",
        item["title"],
        "",
        item["short_description"],
        "",
        f"📍 {item['location']}",
        f"🗓️ Prazo: {item['deadline']}",
        f"🔗 Inscrição: {item['official_link']}",
        f"Fonte: {item['source_name']}",
        "",
        f"{HASHTAGS_BASE} {CATEGORY_TAG[item['category']]}",
        "(link também disponível na bio)",
    ]
    return "\n".join(lines)


def build_newsletter_md(items):
    lines = [f"# CONTESTE.INFO — Oportunidades de hoje ({TODAY})", ""]
    for cat in ["cultura", "educacao", "esportes", "trabalho"]:
        cat_items = [i for i in items if i["category"] == cat]
        if not cat_items:
            continue
        lines.append(f"## {CATEGORY_LABEL[cat]}")
        lines.append("")
        for i in cat_items:
            lines.append(f"### {i['title']}")
            lines.append(f"![{i['title']}]({i['image_url']})")
            lines.append("")
            lines.append(i["short_description"])
            lines.append("")
            lines.append(f"**Prazo:** {i['deadline']} · **Local:** {i['location']} · **Fonte:** {i['source_name']}")
            lines.append("")
            lines.append(f"[Inscreva-se →]({i['official_link']})")
            lines.append("")
    return "\n".join(lines)


def main():
    items = load_opportunities()

    report_dir = os.path.join(ROOT, "relatorios")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, f"{TODAY}.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(build_newsletter_md(items))
    print(f"Relatorio da newsletter: {report_path}")

    pub_dir = os.path.join(ROOT, "publicacoes", TODAY)
    os.makedirs(pub_dir, exist_ok=True)
    ok, fail = 0, 0
    for item in items:
        base = os.path.join(pub_dir, item["id"])
        try:
            img_name = download_image(item["image_url"], base)
            ok += 1
        except Exception as e:
            img_name = None
            fail += 1
            print(f"  [aviso] imagem falhou para {item['id']}: {e}")
        with open(base + ".txt", "w", encoding="utf-8") as f:
            f.write(build_caption(item))
    print(f"Pacote de publicacoes: {pub_dir}  ({ok} imagens ok, {fail} falharam)")


if __name__ == "__main__":
    main()
