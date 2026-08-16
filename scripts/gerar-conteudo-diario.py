"""
Gera o pacote diario do CONTESTE.INFO a partir de data/oportunidades.json:
1) relatorios/AAAA-MM-DD.md      -> rascunho pronto para colar no Buttondown
2) publicacoes/AAAA-MM-DD/       -> 1 imagem + 1 legenda .txt por oportunidade (Instagram/redes)
3) social-media/queue/           -> Fila de publicações estruturada em JSON

Uso: python scripts/gerar-conteudo-diario.py
Reexecute sempre que data/oportunidades.json for atualizado com uma nova pesquisa.

Versão 2.0 - Com melhorias no pipeline de redes sociais
"""
import json
import os
import re
import sys
import time
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

# Console do Windows usa cp1252 por padrão e quebra em print() com emoji; forcar UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(ROOT, "data", "oportunidades.json")
TODAY = date.today().isoformat()
TIMESTAMP = datetime.now().strftime("%Y-%m-%dT%H:%M:%S-03:00")

CATEGORY_LABEL = {
    "cultura": "Cultura", 
    "educacao": "Educação", 
    "esportes": "Esportes", 
    "trabalho": "Trabalho"
}

CATEGORY_EMOJI = {
    "cultura": "🎨",
    "educacao": "📚",
    "esportes": "⚽",
    "trabalho": "💼"
}

CATEGORY_TAG = {
    "cultura": "#Cultura", 
    "educacao": "#Educação", 
    "esportes": "#Esportes", 
    "trabalho": "#Trabalho"
}

HASHTAGS_BASE = "#ContesteInfo #InscriçõesAbertas #Oportunidades"

# Mapeamento de status
STATUS_LABEL = {
    "open": "Inscrições abertas",
    "closed": "Encerrada",
    "continuous": "Vagas contínuas",
    "coming_soon": "Em breve",
    "extended": "Prazo prorrogado"
}

# Níveis de confiabilidade
RELIABILITY_LABEL = {
    "A": "✅ Fonte oficial primária",
    "B": "🔗 Instituição diretamente relacionada",
    "C": "📋 Fonte secundária com confirmação",
    "D": "⚠️ Não verificada"
}


def load_opportunities():
    """Carrega as oportunidades do JSON"""
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)
        return data.get("opportunities", [])


def download_image(url, dest_path, retries=3, backoff_seconds=4):
    """Baixa a imagem da oportunidade, com retry (Wikimedia costuma limitar taxa de requisições)"""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    last_error = None
    for attempt in range(retries):
        if attempt > 0:
            time.sleep(backoff_seconds)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                ext = os.path.splitext(url.split("?")[0])[1].lower()
                if ext not in (".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"):
                    ext = ".jpg"
                path = dest_path + ext
                with open(path, "wb") as out:
                    out.write(resp.read())
                return os.path.basename(path)
        except Exception as e:
            last_error = e
    print(f"  [aviso] imagem falhou: {last_error}")
    return None


def parse_deadline(deadline_str):
    """Tenta parsear a data do prazo"""
    if not deadline_str or deadline_str.lower() in ["vagas contínuas", "vagas continuas"]:
        return None
    
    # Tentar formatos comuns
    formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"]
    for fmt in formats:
        try:
            return datetime.strptime(deadline_str, fmt).date()
        except ValueError:
            continue
    return None


def get_deadline_label(item):
    """Gera label do prazo"""
    deadline = item.get("deadline", "")
    if not deadline or deadline.lower() in ["vagas contínuas", "vagas continuas"]:
        return "Vagas contínuas", None
    
    deadline_date = parse_deadline(deadline)
    if deadline_date:
        days_left = (deadline_date - date.today()).days
        if days_left < 0:
            return f"Encerrada em {deadline}", deadline_date
        elif days_left <= 3:
            return f"⚠️ {days_left} dia(s) - {deadline}", deadline_date
        else:
            return f"Até {deadline}", deadline_date
    
    return f"Até {deadline}", None


def build_instagram_caption(item):
    """Gera legenda para Instagram"""
    category_emoji = CATEGORY_EMOJI.get(item["category"], "📢")
    category_tag = CATEGORY_TAG.get(item["category"], "")
    deadline_label, _ = get_deadline_label(item)
    
    lines = [
        f"{category_emoji} {category_tag} | INSCRIÇÕES ABERTAS",
        "",
        f"📌 {item['title']}",
        "",
        f"💡 {item['short_description']}",
        "",
        f"📍 {item.get('location', 'Não informado')}",
        f"🗓️ {deadline_label}",
    ]
    
    # Adicionar informações extras se disponíveis
    if item.get("is_free") is True:
        lines.append("💰 Gratuito")
    elif item.get("remuneration"):
        lines.append(f"💰 {item['remuneration']}")
    elif item.get("scholarship"):
        lines.append(f"💰 Bolsa: {item['scholarship']}")
    
    if item.get("vacancies_count"):
        lines.append(f"🎯 {item['vacancies_count']} vagas")
    
    lines.extend([
        "",
        f"🔗 Link na bio ou: {item['official_link'][:50]}...",
        f"📎 Fonte: {item.get('source_name', 'Não informada')}",
        "",
        f"{HASHTAGS_BASE} {category_tag}",
        "",
        "⚠️ Sempre confirme as informações diretamente na fonte oficial antes de se inscrever.",
        "(link completo disponível na bio do @conteste.info)",
    ])
    
    return "\n".join(lines)


def build_twitter_caption(item):
    """Gera legenda para Twitter/X (limite 280 caracteres)"""
    category_emoji = CATEGORY_EMOJI.get(item["category"], "📢")
    deadline_label, _ = get_deadline_label(item)
    
    # Versão curta
    text = f"{category_emoji} {item['title']}\n\n"
    text += f"📍 {item.get('location', '')}\n"
    text += f"🗓️ {deadline_label}\n\n"
    
    # Encurtar URL se necessário
    url = item['official_link']
    if len(text) + len(url) > 270:
        url = url[:50] + "..."
    
    text += f"🔗 {url}\n\n"
    text += f"{HASHTAGS_BASE} {CATEGORY_TAG.get(item['category'], '')}"
    
    return text[:280]


def build_linkedin_caption(item):
    """Gera legenda para LinkedIn"""
    category_label = CATEGORY_LABEL.get(item["category"], "Oportunidade")
    deadline_label, _ = get_deadline_label(item)
    
    lines = [
        f"🎯 {category_label} | OPORTUNIDADE",
        "",
        f"{item['title']}",
        "",
        f"📋 {item['short_description']}",
        "",
        f"📍 Local: {item.get('location', 'Não informado')}",
        f"📅 Prazo: {deadline_label}",
    ]
    
    if item.get("is_free") is True:
        lines.append("💰 Gratuito")
    
    if item.get("vacancies_count"):
        lines.append(f"🎯 Vagas: {item['vacancies_count']}")
    
    lines.extend([
        "",
        f"🔗 Saiba mais: {item['official_link']}",
        "",
        f"Fonte: {item.get('source_name', 'Não informada')}",
        "",
        f"{HASHTAGS_BASE} {CATEGORY_TAG.get(item['category'], '')}",
        "",
        "ℹ️ As informações são apresentadas para facilitar o acesso à oportunidade. "
        "Sempre confirme requisitos, prazos e condições diretamente na fonte oficial.",
    ])
    
    return "\n".join(lines)


def build_newsletter_md(items):
    """Gera relatório em markdown para newsletter"""
    lines = [
        f"# CONTESTE.INFO — Oportunidades de hoje ({TODAY})",
        "",
        f"*Atualizado em {TIMESTAMP}*",
        "",
        "---",
        "",
    ]
    
    for cat in ["cultura", "educacao", "esportes", "trabalho"]:
        cat_items = [i for i in items if i["category"] == cat]
        if not cat_items:
            continue
        
        cat_emoji = CATEGORY_EMOJI.get(cat, "")
        cat_label = CATEGORY_LABEL.get(cat, cat)
        
        lines.append(f"## {cat_emoji} {cat_label} ({len(cat_items)} oportunidades)")
        lines.append("")
        
        for i, item in enumerate(cat_items, 1):
            deadline_label, deadline_date = get_deadline_label(item)
            
            # Indicador visual de urgência
            urgency = ""
            if deadline_date:
                days_left = (deadline_date - date.today()).days
                if 0 <= days_left <= 3:
                    urgency = " ⚠️ **ENCERRA EM BREVE**"
                elif days_left < 0:
                    urgency = " ❌ **ENCERRADA**"
            
            lines.append(f"### {i}. {item['title']}{urgency}")
            lines.append(f"![{item['title']}]({item['image_url']})")
            lines.append("")
            lines.append(item["short_description"])
            lines.append("")
            
            # Informações adicionais
            info_parts = []
            info_parts.append(f"**Prazo:** {deadline_label}")
            info_parts.append(f"**Local:** {item.get('location', 'Não informado')}**")
            info_parts.append(f"**Fonte:** {item.get('source_name', 'Não informada')}")
            
            if item.get("is_free") is True:
                info_parts.append("**💰 Gratuito**")
            elif item.get("remuneration"):
                info_parts.append(f"**Remuneração:** {item['remuneration']}")
            
            if item.get("vacancies_count"):
                info_parts.append(f"**Vagas:** {item['vacancies_count']}")
            
            lines.append(" · ".join(info_parts))
            lines.append("")
            lines.append(f"[👉 Inscreva-se →]({item['official_link']})")
            lines.append("")
    
    lines.append("---")
    lines.append("")
    lines.append("### ℹ️ Sobre o CONTESTE.INFO")
    lines.append("")
    lines.append("O CONTESTE.INFO é um portal que democratiza o acesso a oportunidades de cultura, educação, esportes e trabalho. "
                 "Todas as oportunidades são verificadas manualmente e vinculadas a fontes oficiais.")
    lines.append("")
    lines.append("📧 Receba estas oportunidades no seu e-mail: [Inscreva-se na newsletter](https://conteste.info)")
    lines.append("")
    lines.append(f"*Gerado em {TIMESTAMP}*",)
    
    return "\n".join(lines)


def generate_social_media_queue(items):
    """Gera fila de publicações para redes sociais em JSON"""
    queue_dir = os.path.join(ROOT, "social-media", "queue")
    os.makedirs(queue_dir, exist_ok=True)
    
    queue_data = {
        "generated_at": TIMESTAMP,
        "total_items": len(items),
        "posts": []
    }
    
    for item in items:
        post_id = f"{item['id']}-{TODAY}"
        
        post_data = {
            "id": post_id,
            "opportunity_id": item["id"],
            "opportunity_title": item["title"],
            "category": item["category"],
            "created_at": TIMESTAMP,
            "scheduled_at": None,
            "published_at": None,
            "status": "draft",  # draft, approved, scheduled, published, failed
            "platforms": {
                "instagram": {
                    "caption": build_instagram_caption(item),
                    "image_path": None,
                    "hashtags": [HASHTAGS_BASE.replace("#", ""), CATEGORY_TAG.get(item["category"], "").replace("#", "")],
                    "status": "pending"
                },
                "twitter": {
                    "text": build_twitter_caption(item),
                    "status": "pending"
                },
                "linkedin": {
                    "text": build_linkedin_caption(item),
                    "status": "pending"
                }
            },
            "external_post_ids": {}
        }
        
        queue_data["posts"].append(post_data)
    
    # Salvar fila
    queue_file = os.path.join(queue_dir, f"{TODAY}.json")
    with open(queue_file, "w", encoding="utf-8") as f:
        json.dump(queue_data, f, indent=2, ensure_ascii=False)
    
    return queue_file


def main():
    print(f"🚀 CONTESTE.INFO - Gerador de Conteúdo Diário ({TODAY})")
    print("=" * 60)
    
    items = load_opportunities()
    print(f"📊 Total de oportunidades: {len(items)}")
    
    # 1. Gerar relatório da newsletter
    report_dir = os.path.join(ROOT, "relatorios")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, f"{TODAY}.md")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(build_newsletter_md(items))
    print(f"📝 Relatório da newsletter: {report_path}")
    
    # 2. Gerar pacote de publicações (imagens + legendas)
    pub_dir = os.path.join(ROOT, "publicacoes", TODAY)
    os.makedirs(pub_dir, exist_ok=True)
    
    ok_count = 0
    fail_count = 0
    
    for item in items:
        base = os.path.join(pub_dir, item["id"])
        
        # Baixar imagem
        try:
            img_name = download_image(item["image_url"], base)
            if img_name:
                ok_count += 1
            else:
                fail_count += 1
        except Exception as e:
            img_name = None
            fail_count += 1
            print(f"  ⚠️ Imagem falhou para {item['id']}: {e}")
        
        # Gerar legendas para diferentes plataformas
        caption_files = {
            "instagram": build_instagram_caption(item),
            "twitter": build_twitter_caption(item),
            "linkedin": build_linkedin_caption(item)
        }
        
        # Salvar legenda principal (Instagram) como .txt para compatibilidade
        with open(base + ".txt", "w", encoding="utf-8") as f:
            f.write(caption_files["instagram"])
        
        # Salvar legendas específicas por plataforma
        for platform, caption in caption_files.items():
            with open(f"{base}_{platform}.txt", "w", encoding="utf-8") as f:
                f.write(caption)
    
    print(f"📦 Pacote de publicações: {pub_dir}")
    print(f"   ✅ {ok_count} imagens baixadas")
    print(f"   ❌ {fail_count} imagens falharam")
    
    # 3. Gerar fila de redes sociais
    queue_file = generate_social_media_queue(items)
    print(f"📱 Fila de redes sociais: {queue_file}")
    
    # 4. Estatísticas por categoria
    print("\n📈 Estatísticas por categoria:")
    for cat in ["cultura", "educacao", "esportes", "trabalho"]:
        cat_items = [i for i in items if i["category"] == cat]
        print(f"   {CATEGORY_EMOJI.get(cat, '')} {CATEGORY_LABEL.get(cat, cat)}: {len(cat_items)} oportunidades")
    
    print("\n✅ Processo concluído!")
    print(f"📁 Arquivos gerados em: {pub_dir}")
    print(f"📝 Newsletter em: {report_path}")
    print(f"📱 Fila social em: {queue_file}")


if __name__ == "__main__":
    main()